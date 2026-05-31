/**
 * 일회성 마이그레이션: Google Sheet(fashion_data) → MongoDB Atlas.
 *
 * 입력: gdrive MCP(gsheets_read)가 저장한 verbose JSON 결과 파일
 *   (각 셀이 { value, location } 형태). 경로는 argv[2] 로 전달.
 * 출력: <DB>.<COLLECTION> 컬렉션에 FashionItem 문서로 적재(드롭 후 재삽입) + id 유니크 인덱스.
 *
 * 사용:
 *   node scripts/migrate-sheet-to-mongo.mjs "<gsheets_read 결과 .txt 경로>"
 * 필요한 env:
 *   MONGODB_URI 또는 MDB_MCP_CONNECTION_STRING (Atlas 연결 문자열)
 *   MONGODB_DB (선택, 기본 "fashion")
 */
import fs from "fs";
import { MongoClient } from "mongodb";

const filePath = process.argv[2];
const uri = process.env.MONGODB_URI || process.env.MDB_MCP_CONNECTION_STRING;
const dbName = process.env.MONGODB_DB || "fashion";
const collName = process.env.MONGODB_COLLECTION || "fashion_items";

if (!filePath) {
  console.error("사용법: node scripts/migrate-sheet-to-mongo.mjs <결과파일경로>");
  process.exit(1);
}
if (!uri) {
  console.error("MONGODB_URI / MDB_MCP_CONNECTION_STRING env 가 필요합니다.");
  process.exit(1);
}

// 컬럼 letter → FashionItem 필드
const COL = {
  A: "id",
  B: "weather",
  C: "temperature_min_c",
  D: "temperature_max_c",
  E: "temperature_avg_c",
  F: "temperature_feels_like_c",
  G: "gender",
  H: "fashion_category",
  I: "outer",
  J: "top",
  K: "bottom",
  L: "shoes",
  M: "accessory",
  N: "color_palette",
  O: "material",
  P: "description",
  Q: "image_prompt",
  R: "figma_layer_name",
  S: "active",
  T: "updated_at",
};
const NUMERIC = new Set([
  "temperature_min_c",
  "temperature_max_c",
  "temperature_avg_c",
  "temperature_feels_like_c",
]);

function colLetter(location) {
  // "fashion_data!C2" → "C"
  const m = /![A-Z]+\d+$/.exec(location);
  return m ? m[0].replace(/[!\d]/g, "") : null;
}

function buildDoc(row) {
  const doc = {};
  for (const cell of row) {
    if (!cell || cell.location == null) continue;
    const letter = colLetter(cell.location);
    const field = letter && COL[letter];
    if (!field) continue;
    let v = cell.value;
    if (v == null || v === "") continue;
    if (NUMERIC.has(field)) {
      const n = Number(v);
      if (!Number.isNaN(n)) doc[field] = n;
    } else if (field === "active") {
      doc[field] = String(v).trim().toUpperCase() === "TRUE";
    } else {
      doc[field] = typeof v === "string" ? v : String(v);
    }
  }
  return doc;
}

async function main() {
  console.log(`파일 읽는 중: ${filePath}`);
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  const sheet = Array.isArray(parsed) ? parsed[0] : parsed;
  const rows = sheet?.data ?? [];
  console.log(`시트: ${sheet?.sheetName}  원본 행 수: ${rows.length}`);

  const docs = [];
  for (const row of rows) {
    const doc = buildDoc(row);
    if (doc.id) docs.push(doc); // id 없는 행은 스킵
  }
  console.log(`변환된 문서 수: ${docs.length}`);
  console.log("샘플:", JSON.stringify(docs[0]));

  const client = new MongoClient(uri);
  await client.connect();
  try {
    const coll = client.db(dbName).collection(collName);
    await coll.drop().catch(() => {}); // 없으면 무시
    const res = await coll.insertMany(docs, { ordered: false });
    await coll.createIndex({ id: 1 }, { unique: true });
    await coll.createIndex({ weather: 1 });
    const count = await coll.countDocuments();
    console.log(`삽입 완료: ${res.insertedCount}  컬렉션 총계: ${count}`);
    console.log(`→ ${dbName}.${collName}`);
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error("마이그레이션 실패:", e);
  process.exit(1);
});

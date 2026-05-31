import "server-only";
import { MongoClient, type Db } from "mongodb";

/**
 * MongoDB Atlas 연결 (서버 전용).
 * Vercel/서버리스에서 람다 재사용 시 커넥션을 재활용하도록 전역에 Promise 를 캐싱한다.
 * "server-only" import 로 클라이언트 번들 유입을 차단.
 *
 * 필요한 env:
 *   MONGODB_URI  — Atlas 연결 문자열 (절대 NEXT_PUBLIC_ 금지)
 *   MONGODB_DB   — DB 이름 (선택, 기본 "fashion")
 */
const DB_NAME = process.env.MONGODB_DB ?? "fashion";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI env not set (see .env.example)");
  }
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect();
  }
  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(DB_NAME);
}

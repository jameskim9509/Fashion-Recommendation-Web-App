import "server-only";
import { randomUUID } from "crypto";
import type { Collection, Filter } from "mongodb";
import type { ApiResponse, FashionItem } from "@/app/services/fashionApi";
import { getDb } from "./mongodb";

/**
 * Fashion 데이터 레이어 (MongoDB Atlas).
 * Route Handler (app/api/fashion/route.ts) 와 Server Component (app/page.tsx) 가 공유한다.
 * 기존 Apps Script 어댑터(serverListFashion/serverUpsertFashion/serverDeleteFashion)와
 * 동일한 시그니처·반환(ApiResponse) 형태를 유지해 소비처 변경을 최소화한다.
 */
const COLLECTION = process.env.MONGODB_COLLECTION ?? "fashion_items";
const NO_ID = { _id: 0 } as const;

async function fashionCollection(): Promise<Collection<FashionItem>> {
  const db = await getDb();
  return db.collection<FashionItem>(COLLECTION);
}

// GET — weather 로만 서버 필터링 (gender/기온 밴드는 클라이언트가 처리).
export async function serverListFashion(
  opts: { weather?: string } = {},
): Promise<ApiResponse<FashionItem[]>> {
  try {
    const coll = await fashionCollection();
    const filter: Filter<FashionItem> = opts.weather
      ? { weather: opts.weather as FashionItem["weather"] }
      : {};
    const data = await coll.find(filter, { projection: NO_ID }).toArray();
    return { success: true, data: data as FashionItem[], count: data.length };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// POST — id 기준 upsert. id 가 없으면 새로 생성.
export async function serverUpsertFashion(
  item: Partial<FashionItem>,
): Promise<ApiResponse<FashionItem>> {
  try {
    const coll = await fashionCollection();
    const id =
      item.id?.trim() || `LOOK_${randomUUID().slice(0, 8).toUpperCase()}`;
    // _id 는 클라이언트 입력에서 들어와도 무시.
    const { _id, ...rest } = item as Partial<FashionItem> & {
      _id?: unknown;
    };
    const doc: Partial<FashionItem> = {
      ...rest,
      id,
      updated_at: new Date().toISOString(),
    };
    await coll.updateOne({ id }, { $set: doc }, { upsert: true });
    const saved = await coll.findOne({ id }, { projection: NO_ID });
    if (!saved) return { success: false, error: "upsert failed" };
    return { success: true, data: saved as FashionItem };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// DELETE — id 기준 삭제.
export async function serverDeleteFashion(
  id: string,
): Promise<ApiResponse<FashionItem>> {
  try {
    const coll = await fashionCollection();
    const res = await coll.deleteOne({ id });
    if (res.deletedCount === 0) {
      return { success: false, error: "not found" };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

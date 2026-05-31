import { NextRequest, NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE_NAME,
  addFavorite,
  getUserFromSessionId,
  listFavoriteIds,
  removeFavorite,
} from "@/lib/server/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 즐겨찾기는 로그인 사용자 전용. middleware 는 admin 세션만 보므로 여기서 직접 검증한다.
async function requireUserId(req: NextRequest): Promise<string | null> {
  const sessionId = req.cookies.get(USER_SESSION_COOKIE_NAME)?.value;
  const user = sessionId ? await getUserFromSessionId(sessionId) : null;
  return user?.userId ?? null;
}

const unauthorized = () =>
  NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });

/** GET /api/favorites → 현재 사용자의 찜한 fashion_item_id 목록. */
export async function GET(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return unauthorized();

  const data = await listFavoriteIds(userId);
  return NextResponse.json({ success: true, data });
}

/** POST /api/favorites { id } → 찜 추가 (idempotent). */
export async function POST(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return unauthorized();

  let body: { id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid json body" },
      { status: 400 },
    );
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json(
      { success: false, error: "id required" },
      { status: 400 },
    );
  }

  await addFavorite(userId, id);
  return NextResponse.json({ success: true });
}

/** DELETE /api/favorites?id=<id> → 찜 해제. */
export async function DELETE(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return unauthorized();

  const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json(
      { success: false, error: "id required" },
      { status: 400 },
    );
  }

  await removeFavorite(userId, id);
  return NextResponse.json({ success: true });
}

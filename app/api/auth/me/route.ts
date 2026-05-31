import { NextRequest, NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE_NAME,
  getUserFromSessionId,
} from "@/lib/server/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me
 * 현재 로그인한 사용자 정보. 비로그인 시 user: null (200).
 * 클라이언트가 헤더 로그인 상태/즐겨찾기 활성화 여부를 판단하는 데 사용.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get(USER_SESSION_COOKIE_NAME)?.value;
  const user = sessionId ? await getUserFromSessionId(sessionId) : null;

  if (!user) {
    return NextResponse.json({ success: true, user: null });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user.userId,
      provider: user.provider,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
  });
}

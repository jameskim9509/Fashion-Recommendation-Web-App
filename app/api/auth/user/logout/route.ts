import { NextRequest, NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE_NAME,
  deleteUserSession,
} from "@/lib/server/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/user/logout
 * 사용자 세션을 DB 에서 삭제하고 쿠키를 만료시킨다.
 * (관리자 로그아웃 /api/auth/logout 과는 별개 경로.)
 */
export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get(USER_SESSION_COOKIE_NAME)?.value;
  if (sessionId) {
    await deleteUserSession(sessionId).catch(() => {
      // 이미 만료/삭제된 세션이어도 쿠키 정리는 진행.
    });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: USER_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

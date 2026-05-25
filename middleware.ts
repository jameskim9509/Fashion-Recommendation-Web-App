import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  getSessionFromId,
} from "@/lib/server/auth-edge";

/**
 * 보호 대상:
 *   - /admin/* 페이지 (단, /admin/login 제외)
 *   - /api/fashion 의 POST / DELETE (GET 은 공개 — Dashboard 가 익명으로 패션 목록 조회)
 *
 * Supabase JS 는 fetch 기반이라 Edge runtime 에서 동작. scrypt 가 필요한 곳(login route)만
 * runtime = "nodejs" 로 별도 지정.
 */
export const config = {
  matcher: ["/admin/:path*", "/api/fashion"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();
  const isWriteApi =
    pathname === "/api/fashion" &&
    (method === "POST" || method === "DELETE");
  const isLoginPage = pathname === "/admin/login";

  // /api/fashion GET 은 보호하지 않음.
  if (pathname === "/api/fashion" && !isWriteApi) {
    return NextResponse.next();
  }

  const sessionId = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionId ? await getSessionFromId(sessionId) : null;

  // 이미 로그인한 사용자가 로그인 페이지 방문 → /admin 으로.
  if (isLoginPage) {
    if (session) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    if (isWriteApi) {
      return NextResponse.json(
        { success: false, error: "unauthorized" },
        { status: 401 },
      );
    }
    // /admin/* 페이지 미인증 → 로그인 페이지로, 원래 경로 from 쿼리에 보존.
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

import { NextRequest, NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE_NAME,
  USER_SESSION_TTL_SECONDS,
  createUserSession,
  exchangeCodeForProfile,
  isOAuthProvider,
  upsertUserFromOAuth,
} from "@/lib/server/user-auth";
import { OAUTH_STATE_COOKIE, computeRedirectUri } from "@/lib/server/oauth-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/oauth/:provider/callback
 * 동의 페이지에서 돌아온 code 를 토큰→프로필로 교환하고 로그인 세션을 발급한다.
 * 모든 실패 경로는 홈으로 리다이렉트하되 ?login=error 쿼리로 표시.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params;
  const home = new URL("/", req.url);
  // reason: 실패 지점을 표시(진단용). 민감정보는 담지 않는다.
  const fail = (reason: string) => {
    home.searchParams.set("login", "error");
    home.searchParams.set("reason", reason);
    const res = NextResponse.redirect(home);
    res.cookies.set({ name: OAUTH_STATE_COOKIE, value: "", path: "/", maxAge: 0 });
    return res;
  };

  if (!isOAuthProvider(provider)) return fail("bad_provider");

  const url = req.nextUrl;
  // 사용자가 동의를 거부하면 provider 가 error 쿼리로 돌려보냄.
  const providerError = url.searchParams.get("error");
  if (providerError) return fail(`provider_${providerError}`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  // state 누락/불일치 → CSRF 의심. 차단.
  if (!code || !state) return fail("missing_code_or_state");
  if (!cookieState) return fail("no_state_cookie");
  if (state !== cookieState) return fail("state_mismatch");

  try {
    const redirectUri = computeRedirectUri(url.origin, provider);
    const profile = await exchangeCodeForProfile(provider, code, redirectUri);
    const userId = await upsertUserFromOAuth(provider, profile);
    const { sessionId } = await createUserSession(userId);

    home.searchParams.set("login", "success");
    const res = NextResponse.redirect(home);
    res.cookies.set({
      name: USER_SESSION_COOKIE_NAME,
      value: sessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: USER_SESSION_TTL_SECONDS,
    });
    // 일회용 state 쿠키 정리.
    res.cookies.set({ name: OAUTH_STATE_COOKIE, value: "", path: "/", maxAge: 0 });
    return res;
  } catch (err) {
    console.error("OAuth callback failed:", err);
    return fail("exchange");
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  getProviderClient,
  isOAuthProvider,
} from "@/lib/server/user-auth";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_TTL_SECONDS,
  computeRedirectUri,
} from "@/lib/server/oauth-http";

// crypto.randomUUID 만 쓰지만 env(client secret) 평가를 위해 nodejs 런타임으로 통일.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/oauth/:provider
 * OAuth 동의 페이지로 리다이렉트. state 를 httpOnly 쿠키에 심어 콜백에서 검증(CSRF 방지).
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params;
  if (!isOAuthProvider(provider)) {
    return NextResponse.json(
      { success: false, error: "unknown provider" },
      { status: 404 },
    );
  }
  if (!getProviderClient(provider)) {
    return NextResponse.json(
      { success: false, error: `${provider} OAuth not configured` },
      { status: 503 },
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = computeRedirectUri(req.nextUrl.origin, provider);
  const authorizeUrl = buildAuthorizeUrl(provider, redirectUri, state);
  if (!authorizeUrl) {
    return NextResponse.json(
      { success: false, error: "failed to build authorize url" },
      { status: 500 },
    );
  }

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_STATE_TTL_SECONDS,
  });
  return res;
}

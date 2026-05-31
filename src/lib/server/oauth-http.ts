import "server-only";

/**
 * OAuth 시작/콜백 라우트가 공유하는 HTTP 레벨 헬퍼.
 *   - state CSRF 쿠키 이름
 *   - redirect_uri 계산 (요청 origin 기반, 프록시 환경은 OAUTH_REDIRECT_BASE_URL 로 override)
 */

export const OAUTH_STATE_COOKIE = "oauth_state";
export const OAUTH_STATE_TTL_SECONDS = 600; // 10m — 동의 페이지 왕복 동안만 유효

export function computeRedirectUri(origin: string, provider: string): string {
  const base =
    process.env.OAUTH_REDIRECT_BASE_URL?.replace(/\/$/, "") || origin;
  return `${base}/api/auth/oauth/${provider}/callback`;
}

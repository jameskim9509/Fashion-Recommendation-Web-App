import "server-only";

/**
 * OAuth 시작/콜백 라우트가 공유하는 HTTP 레벨 헬퍼.
 *   - state CSRF 쿠키 이름
 *   - 앱 자기 리다이렉트에 쓸 origin (요청 origin 기반, 프록시/컨테이너 환경은
 *     OAUTH_REDIRECT_BASE_URL 로 override)
 *   - redirect_uri 계산
 */

export const OAUTH_STATE_COOKIE = "oauth_state";
export const OAUTH_STATE_TTL_SECONDS = 600; // 10m — 동의 페이지 왕복 동안만 유효

/**
 * 앱이 자기 자신으로 리다이렉트(콜백→홈, redirect_uri 등)할 때 사용할 origin.
 * standalone 컨테이너/프록시에서는 요청 origin 이 외부 접속 URL 과 다를 수 있다
 * (예: HOSTNAME=0.0.0.0 → http://0.0.0.0:3000). OAUTH_REDIRECT_BASE_URL 이 있으면
 * 그 origin 을 우선 사용하고, 없으면(예: Vercel) 요청 origin 을 그대로 쓴다.
 */
export function resolveAppOrigin(reqOrigin: string): string {
  const base = process.env.OAUTH_REDIRECT_BASE_URL?.trim();
  if (!base) return reqOrigin;
  try {
    return new URL(base).origin;
  } catch {
    return reqOrigin;
  }
}

export function computeRedirectUri(origin: string, provider: string): string {
  return `${resolveAppOrigin(origin)}/api/auth/oauth/${provider}/callback`;
}

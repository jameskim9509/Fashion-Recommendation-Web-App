import "server-only";
import { getSupabase } from "./supabase";

/**
 * 일반 사용자 OAuth 2.0 (Authorization Code) 플로우 + 세션/즐겨찾기 유틸.
 * 관리자 인증(auth.ts)과 동일하게 자체 세션 방식이며 Supabase Auth 를 쓰지 않는다.
 * fetch 기반이라 Edge 에서도 동작하지만, 라우트는 nodejs 런타임에서 호출한다.
 *
 * Edge(middleware)에서 필요한 세션 조회는 ./user-auth-edge 로 분리.
 */

export {
  USER_SESSION_COOKIE_NAME,
  USER_SESSION_TTL_SECONDS,
  getUserFromSessionId,
  type SessionUser,
} from "./user-auth-edge";

import { USER_SESSION_TTL_SECONDS } from "./user-auth-edge";

export type OAuthProvider = "google" | "kakao";

/** 콜백에서 ?reason= 으로 노출할 짧은 진단 코드를 들고 다니는 에러. */
export class OAuthError extends Error {
  reason: string;
  constructor(reason: string, message?: string) {
    super(message ?? reason);
    this.reason = reason;
  }
}

export interface OAuthProfile {
  providerUserId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

interface ProviderConfig {
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
  /** authorize URL 에 추가로 붙일 파라미터 (provider 별 옵션). */
  extraAuthParams?: Record<string, string>;
  clientId(): string | undefined;
  clientSecret(): string | undefined;
  parseProfile(raw: unknown): OAuthProfile;
}

const PROVIDERS: Record<OAuthProvider, ProviderConfig> = {
  google: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid email profile",
    extraAuthParams: { access_type: "offline", prompt: "select_account" },
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    parseProfile: (raw) => {
      const u = raw as {
        sub?: string;
        email?: string;
        name?: string;
        picture?: string;
      };
      return {
        providerUserId: String(u.sub ?? ""),
        email: u.email ?? null,
        name: u.name ?? null,
        avatarUrl: u.picture ?? null,
      };
    },
  },
  kakao: {
    authorizeUrl: "https://kauth.kakao.com/oauth/authorize",
    tokenUrl: "https://kauth.kakao.com/oauth/token",
    userInfoUrl: "https://kapi.kakao.com/v2/user/me",
    // Kakao 는 콘솔 동의항목과 일치해야 함. 콤마 구분.
    // account_email 은 비즈니스 앱 전환이 필요해 제외(미설정 시 KOE006). email 은 null 로 저장됨.
    scope: "profile_nickname,profile_image",
    clientId: () => process.env.KAKAO_CLIENT_ID,
    clientSecret: () => process.env.KAKAO_CLIENT_SECRET,
    parseProfile: (raw) => {
      const u = raw as {
        id?: number | string;
        kakao_account?: {
          email?: string;
          profile?: { nickname?: string; profile_image_url?: string };
        };
        properties?: { nickname?: string; profile_image?: string };
      };
      const acc = u.kakao_account;
      return {
        providerUserId: String(u.id ?? ""),
        email: acc?.email ?? null,
        name: acc?.profile?.nickname ?? u.properties?.nickname ?? null,
        avatarUrl:
          acc?.profile?.profile_image_url ?? u.properties?.profile_image ?? null,
      };
    },
  },
};

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "kakao";
}

/** provider 설정이 env 로 갖춰져 있는지. 미설정이면 시작 라우트에서 503 처리. */
export function getProviderClient(provider: OAuthProvider): {
  clientId: string;
  clientSecret?: string;
} | null {
  const cfg = PROVIDERS[provider];
  const clientId = cfg.clientId();
  if (!clientId) return null;
  return { clientId, clientSecret: cfg.clientSecret() };
}

/** 사용자 동의 페이지로 보낼 authorize URL 을 만든다. */
export function buildAuthorizeUrl(
  provider: OAuthProvider,
  redirectUri: string,
  state: string,
): string | null {
  const cfg = PROVIDERS[provider];
  const client = getProviderClient(provider);
  if (!client) return null;

  const params = new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: cfg.scope,
    state,
    ...(cfg.extraAuthParams ?? {}),
  });
  return `${cfg.authorizeUrl}?${params.toString()}`;
}

/** authorization code → access token → 사용자 프로필. 실패 시 throw. */
export async function exchangeCodeForProfile(
  provider: OAuthProvider,
  code: string,
  redirectUri: string,
): Promise<OAuthProfile> {
  const cfg = PROVIDERS[provider];
  const client = getProviderClient(provider);
  if (!client) throw new Error(`${provider} OAuth not configured`);

  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: client.clientId,
    redirect_uri: redirectUri,
    code,
  });
  if (client.clientSecret) tokenBody.set("client_secret", client.clientSecret);

  const tokenRes = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody.toString(),
  });
  if (!tokenRes.ok) {
    const detail = await tokenRes.text().catch(() => "");
    // 제공자가 준 error 코드를 추출해 진단용 reason 으로 전달 (예: invalid_client).
    let code = `http_${tokenRes.status}`;
    try {
      const j = JSON.parse(detail) as { error?: string };
      if (j.error) code = j.error;
    } catch {
      /* JSON 아님 — http_status 유지 */
    }
    throw new OAuthError(
      `token_${code}`,
      `token exchange failed (${tokenRes.status}): ${detail}`,
    );
  }
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) {
    throw new OAuthError("no_access_token", "no access_token in token response");
  }

  const infoRes = await fetch(cfg.userInfoUrl, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!infoRes.ok) {
    const detail = await infoRes.text().catch(() => "");
    throw new OAuthError(
      "userinfo",
      `userinfo fetch failed (${infoRes.status}): ${detail}`,
    );
  }
  const profile = cfg.parseProfile(await infoRes.json());
  if (!profile.providerUserId) {
    throw new OAuthError("no_provider_user_id", "could not resolve provider user id");
  }
  return profile;
}

/** OAuth 프로필을 users 테이블에 upsert 하고 user id 를 돌려준다. */
export async function upsertUserFromOAuth(
  provider: OAuthProvider,
  profile: OAuthProfile,
): Promise<string> {
  const supabase = getSupabase();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        provider,
        provider_user_id: profile.providerUserId,
        email: profile.email,
        name: profile.name,
        avatar_url: profile.avatarUrl,
        last_login_at: nowIso,
      },
      { onConflict: "provider,provider_user_id" },
    )
    .select("id")
    .single();
  if (error || !data) {
    throw new OAuthError(
      "db_upsert_user",
      `Failed to upsert user: ${error?.message ?? "unknown"}`,
    );
  }
  return data.id;
}

export async function createUserSession(userId: string): Promise<{
  sessionId: string;
  expiresAt: Date;
}> {
  const expiresAt = new Date(Date.now() + USER_SESSION_TTL_SECONDS * 1000);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("user_sessions")
    .insert({ user_id: userId, expires_at: expiresAt.toISOString() })
    .select("id")
    .single();
  if (error || !data) {
    throw new OAuthError(
      "db_session",
      `Failed to create user session: ${error?.message ?? "unknown"}`,
    );
  }
  return { sessionId: data.id, expiresAt };
}

export async function deleteUserSession(sessionId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from("user_sessions").delete().eq("id", sessionId);
}

// ── 즐겨찾기(찜) ──────────────────────────────────────────
export async function listFavoriteIds(userId: string): Promise<string[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("user_favorites")
    .select("fashion_item_id")
    .eq("user_id", userId);
  if (error || !data) return [];
  return data.map((r) => r.fashion_item_id as string);
}

export async function addFavorite(
  userId: string,
  fashionItemId: string,
): Promise<void> {
  const supabase = getSupabase();
  // 이미 있으면 무시 (unique 제약). onConflict 로 idempotent.
  const { error } = await supabase
    .from("user_favorites")
    .upsert(
      { user_id: userId, fashion_item_id: fashionItemId },
      { onConflict: "user_id,fashion_item_id", ignoreDuplicates: true },
    );
  if (error) {
    throw new Error(`Failed to add favorite: ${error.message}`);
  }
}

export async function removeFavorite(
  userId: string,
  fashionItemId: string,
): Promise<void> {
  const supabase = getSupabase();
  await supabase
    .from("user_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("fashion_item_id", fashionItemId);
}

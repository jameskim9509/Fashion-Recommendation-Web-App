import "server-only";
import { getSupabase } from "./supabase";

/**
 * 일반 사용자(OAuth) 세션 — Edge runtime 에서 안전하게 import 가능.
 * 관리자 세션(auth-edge.ts)과 쿠키 이름/테이블이 모두 분리되어 있다.
 *   - 관리자: admin_session 쿠키 + sessions/admins 테이블
 *   - 사용자: user_session  쿠키 + user_sessions/users 테이블
 */

export const USER_SESSION_COOKIE_NAME = "user_session";
export const USER_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30d

export interface SessionUser {
  sessionId: string;
  userId: string;
  provider: "google" | "kakao";
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  expiresAt: Date;
}

export async function getUserFromSessionId(
  sessionId: string,
): Promise<SessionUser | null> {
  if (!sessionId) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("user_sessions")
    .select(
      "id, user_id, expires_at, users!inner(provider, email, name, avatar_url)",
    )
    .eq("id", sessionId)
    .gte("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;

  const userRel = (
    Array.isArray(data.users) ? data.users[0] : data.users
  ) as
    | {
        provider: "google" | "kakao";
        email: string | null;
        name: string | null;
        avatar_url: string | null;
      }
    | undefined;
  if (!userRel) return null;

  return {
    sessionId: data.id,
    userId: data.user_id,
    provider: userRel.provider,
    email: userRel.email,
    name: userRel.name,
    avatarUrl: userRel.avatar_url,
    expiresAt: new Date(data.expires_at),
  };
}

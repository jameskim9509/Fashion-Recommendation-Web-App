import "server-only";
import { getSupabase } from "./supabase";

/**
 * Edge runtime 에서 안전하게 import 할 수 있는 인증 유틸.
 * scrypt(node:crypto) 를 쓰는 비밀번호 해싱은 별도 모듈 (./auth.ts) 에 격리.
 * middleware.ts 는 본 파일에서만 import 해야 함.
 */

export const SESSION_COOKIE_NAME = "admin_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7d

export interface SessionWithAdmin {
  sessionId: string;
  adminId: string;
  username: string;
  expiresAt: Date;
}

export async function getSessionFromId(
  sessionId: string,
): Promise<SessionWithAdmin | null> {
  if (!sessionId) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, admin_id, expires_at, admins!inner(username)")
    .eq("id", sessionId)
    .gte("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;

  const adminRel = (
    Array.isArray(data.admins) ? data.admins[0] : data.admins
  ) as { username: string } | undefined;
  if (!adminRel?.username) return null;

  return {
    sessionId: data.id,
    adminId: data.admin_id,
    username: adminRel.username,
    expiresAt: new Date(data.expires_at),
  };
}

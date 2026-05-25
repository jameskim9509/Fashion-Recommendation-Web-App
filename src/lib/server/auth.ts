import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getSupabase } from "./supabase";

/**
 * Node runtime 전용 인증 유틸 (scrypt 해싱 + 세션 쓰기 작업).
 * Edge 에서 사용할 함수는 ./auth-edge 로 분리되어 있음 — middleware 는 그쪽만 import.
 */

export {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  getSessionFromId,
  type SessionWithAdmin,
} from "./auth-edge";

import { SESSION_TTL_SECONDS } from "./auth-edge";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const SCRYPT_KEYLEN = 64;
const HASH_PREFIX = "scrypt:";

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  if (!stored.startsWith(HASH_PREFIX)) return false;
  const [, saltHex, derivedHex] = stored.split(":");
  if (!saltHex || !derivedHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(derivedHex, "hex");
  const actual = await scryptAsync(plain, salt, expected.length);

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/** 향후 비밀번호 재설정/시드 스크립트 용. 현재는 마이그레이션 시드에서 미리 계산해 INSERT. */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(plain, salt, SCRYPT_KEYLEN);
  return `${HASH_PREFIX}${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function findAdminByUsername(
  username: string,
): Promise<{ id: string; passwordHash: string } | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("admins")
    .select("id, password_hash")
    .eq("username", username)
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, passwordHash: data.password_hash };
}

export async function createSession(adminId: string): Promise<{
  sessionId: string;
  expiresAt: Date;
}> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .insert({ admin_id: adminId, expires_at: expiresAt.toISOString() })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`Failed to create session: ${error?.message ?? "unknown"}`);
  }
  return { sessionId: data.id, expiresAt };
}

export async function deleteSession(sessionId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from("sessions").delete().eq("id", sessionId);
}

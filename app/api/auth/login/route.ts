import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  createSession,
  findAdminByUsername,
  verifyPassword,
} from "@/lib/server/auth";

// scrypt 가 Node 빌트인이므로 Edge runtime 불가.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid json body" },
      { status: 400 },
    );
  }

  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!username || !password) {
    return NextResponse.json(
      { success: false, error: "username / password required" },
      { status: 400 },
    );
  }

  const admin = await findAdminByUsername(username);
  // username 존재 여부에 따라 분기를 다르게 가져가면 사용자 열거 공격에 노출됨 → 동일 응답.
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
    return NextResponse.json(
      { success: false, error: "invalid credentials" },
      { status: 401 },
    );
  }

  const { sessionId, expiresAt } = await createSession(admin.id);

  const res = NextResponse.json({ success: true, expiresAt });
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}

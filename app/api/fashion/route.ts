import { NextRequest, NextResponse } from "next/server";

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const APPS_SCRIPT_TOKEN = process.env.APPS_SCRIPT_TOKEN;

export const dynamic = "force-dynamic";

function getUpstream(): { url: string; token: string } {
  if (!APPS_SCRIPT_URL || !APPS_SCRIPT_TOKEN) {
    throw new Error(
      "APPS_SCRIPT_URL / APPS_SCRIPT_TOKEN env not set (see .env.example)",
    );
  }
  return { url: APPS_SCRIPT_URL, token: APPS_SCRIPT_TOKEN };
}

/**
 * Apps Script Web App 호출 시 두 가지 비표준 설정이 필수입니다 (원본 fashionApi.ts 주석 참고):
 *   1) POST Content-Type 은 반드시 text/plain — application/json 으로 바꾸면
 *      CORS preflight 가 발생해 본 요청이 실패합니다.
 *   2) redirect: "follow" — Apps Script /exec 는 항상 googleusercontent.com 으로 302 리다이렉트됩니다.
 *
 * 토큰은 절대 클라이언트로 노출하지 않습니다 (process.env 는 서버에서만 평가됨).
 */

// GET /api/fashion              → list all
// GET /api/fashion?weather=...  → list filtered by weather
export async function GET(req: NextRequest) {
  const { url } = getUpstream();
  const upstream = new URL(url);
  upstream.searchParams.set("action", "list");

  const weather = req.nextUrl.searchParams.get("weather");
  if (weather) upstream.searchParams.set("weather", weather);

  const res = await fetch(upstream.toString(), {
    redirect: "follow",
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

// POST /api/fashion             → upsert (body = Partial<FashionItem>)
export async function POST(req: NextRequest) {
  const { url, token } = getUpstream();
  const item = await req.json();

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ token, action: "upsert", item }),
    redirect: "follow",
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

// DELETE /api/fashion?id=...
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { success: false, error: "id query param required" },
      { status: 400 },
    );
  }

  const { url, token } = getUpstream();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ token, action: "delete", id }),
    redirect: "follow",
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

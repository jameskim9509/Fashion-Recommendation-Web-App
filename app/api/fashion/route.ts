import { NextRequest, NextResponse } from "next/server";
import {
  serverDeleteFashion,
  serverListFashion,
  serverUpsertFashion,
} from "@/lib/server/appsScript";

export const dynamic = "force-dynamic";

// GET /api/fashion              → list all
// GET /api/fashion?weather=...  → list filtered by weather
export async function GET(req: NextRequest) {
  const weather = req.nextUrl.searchParams.get("weather") ?? undefined;
  const data = await serverListFashion({ weather });
  return NextResponse.json(data);
}

// POST /api/fashion             → upsert (body = Partial<FashionItem>)
export async function POST(req: NextRequest) {
  const item = await req.json();
  const data = await serverUpsertFashion(item);
  return NextResponse.json(data);
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
  const data = await serverDeleteFashion(id);
  return NextResponse.json(data);
}

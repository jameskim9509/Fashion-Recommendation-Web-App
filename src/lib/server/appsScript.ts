import "server-only";
import type { ApiResponse, FashionItem } from "@/app/services/fashionApi";

/**
 * Apps Script Web App 서버 사이드 어댑터.
 * Route Handler (app/api/fashion/route.ts) 와 Server Component (app/page.tsx) 가 공유합니다.
 * "server-only" import 로 클라이언트 번들에 새어 들어가는 것을 방지.
 *
 * Apps Script 비표준 호출 규약 (Content-Type: text/plain, redirect: follow) 은 본 파일에 모여 있습니다.
 */

function getConfig(): { url: string; token: string } {
  const url = process.env.APPS_SCRIPT_URL;
  const token = process.env.APPS_SCRIPT_TOKEN;
  if (!url || !token) {
    throw new Error(
      "APPS_SCRIPT_URL / APPS_SCRIPT_TOKEN env not set (see .env.example)",
    );
  }
  return { url, token };
}

async function postAction<T>(
  body: Record<string, unknown>,
): Promise<ApiResponse<T>> {
  const { url } = getConfig();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(body),
    redirect: "follow",
    cache: "no-store",
  });
  return (await res.json()) as ApiResponse<T>;
}

export async function serverListFashion(
  opts: { weather?: string } = {},
): Promise<ApiResponse<FashionItem[]>> {
  const { url } = getConfig();
  const upstream = new URL(url);
  upstream.searchParams.set("action", "list");
  if (opts.weather) upstream.searchParams.set("weather", opts.weather);

  const res = await fetch(upstream.toString(), {
    redirect: "follow",
    cache: "no-store",
  });
  return (await res.json()) as ApiResponse<FashionItem[]>;
}

export async function serverUpsertFashion(
  item: Partial<FashionItem>,
): Promise<ApiResponse<FashionItem>> {
  const { token } = getConfig();
  return postAction<FashionItem>({ token, action: "upsert", item });
}

export async function serverDeleteFashion(
  id: string,
): Promise<ApiResponse<FashionItem>> {
  const { token } = getConfig();
  return postAction<FashionItem>({ token, action: "delete", id });
}

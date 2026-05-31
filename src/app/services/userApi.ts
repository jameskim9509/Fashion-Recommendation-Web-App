/**
 * 일반 사용자(OAuth) 로그인 상태 + 즐겨찾기 클라이언트 래퍼.
 * 모든 호출은 같은 origin 의 Next.js Route Handler 로 향한다.
 *   - 로그인 시작은 일반 링크 이동: <a href="/api/auth/oauth/google"> (fetch 아님 — 외부 동의 페이지로 이동)
 */

export type OAuthProvider = "google" | "kakao";

export interface SessionUser {
  id: string;
  provider: OAuthProvider;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

/** 동의 페이지로 보낼 로그인 시작 URL. <a href> 에 사용. */
export function oauthLoginUrl(provider: OAuthProvider): string {
  return `/api/auth/oauth/${provider}`;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const data: { success: boolean; user: SessionUser | null } =
      await res.json();
    return data.success ? data.user : null;
  } catch (error) {
    console.error("Failed to fetch current user:", error);
    return null;
  }
}

export async function logoutUser(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/user/logout", { method: "POST" });
    const data: { success: boolean } = await res.json();
    return data.success;
  } catch (error) {
    console.error("Failed to log out:", error);
    return false;
  }
}

export async function getFavoriteIds(): Promise<string[]> {
  try {
    const res = await fetch("/api/favorites", { cache: "no-store" });
    if (res.status === 401) return [];
    const data: { success: boolean; data?: string[] } = await res.json();
    return data.success && data.data ? data.data : [];
  } catch (error) {
    console.error("Failed to fetch favorites:", error);
    return [];
  }
}

export async function addFavorite(id: string): Promise<boolean> {
  try {
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data: { success: boolean } = await res.json();
    return data.success;
  } catch (error) {
    console.error("Failed to add favorite:", error);
    return false;
  }
}

export async function removeFavorite(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/favorites?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data: { success: boolean } = await res.json();
    return data.success;
  } catch (error) {
    console.error("Failed to remove favorite:", error);
    return false;
  }
}

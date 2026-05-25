/**
 * 브라우저는 같은 origin 의 /api/fashion 으로만 호출합니다.
 * Apps Script URL/토큰은 Next.js Route Handler (app/api/fashion/route.ts) 에서만
 * process.env 로 평가되며, 클라이언트 번들에 포함되지 않습니다.
 */
const API_BASE_URL = "/api/fashion";

export interface FashionItem {
  id: string;
  weather:
    | "sunny"
    | "cloudy"
    | "rainy"
    | "snowy"
    | "windy"
    | "foggy";
  temperature_min_c?: number;
  temperature_max_c?: number;
  temperature_avg_c?: number;
  temperature_feels_like_c?: number;
  temperature_band?:
    | "freezing"
    | "cold"
    | "cool"
    | "mild"
    | "warm"
    | "hot";
  gender: "male" | "female" | "unisex";
  fashion_category?: string;
  outer?: string;
  top?: string;
  bottom?: string;
  shoes?: string;
  accessory?: string;
  color_palette?: string;
  material?: string;
  description?: string;
  image_prompt?: string;
  figma_layer_name?: string;
  active?: boolean;
  updated_at?: Date | string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  error?: string;
}

class FashionApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async getFashionByWeather(
    weather: string,
  ): Promise<FashionItem[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}?weather=${encodeURIComponent(weather)}`,
      );
      const data: ApiResponse<FashionItem[]> = await response.json();
      if (data.success && data.data) return data.data;
      console.error("Fashion API returned error:", data.error);
      return [];
    } catch (error) {
      console.error("Failed to fetch fashion list:", error);
      return [];
    }
  }

  async getAllItems(): Promise<FashionItem[]> {
    try {
      const response = await fetch(this.baseUrl);
      const data: ApiResponse<FashionItem[]> = await response.json();
      if (data.success && data.data) return data.data;
      return [];
    } catch (error) {
      console.error("Failed to fetch all items:", error);
      return [];
    }
  }

  async upsertItem(
    item: Partial<FashionItem>,
  ): Promise<FashionItem | null> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data: ApiResponse<FashionItem> = await response.json();
      if (data.success && data.data) return data.data;
      console.error("Failed to upsert item:", data.error);
      return null;
    } catch (error) {
      console.error("Failed to upsert item:", error);
      return null;
    }
  }

  async deleteItem(id: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const data: ApiResponse<FashionItem> = await response.json();
      return data.success;
    } catch (error) {
      console.error("Failed to delete item:", error);
      return false;
    }
  }
}

export const fashionApi = new FashionApiService();

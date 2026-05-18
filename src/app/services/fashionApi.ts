const API_BASE_URL =
  "https://script.google.com/macros/s/AKfycbxCbfQ3fUb5u5uCUt0CQ-4xV_J9GUduQtQNWP3t7wsxgH-K50f2RMbUl7KcvuCaXZTdCA/exec";
const API_TOKEN = "728185da-bc7f-476a-b3d4-c977556dcc8f";

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
  private token: string;

  constructor(
    baseUrl: string = API_BASE_URL,
    token: string = API_TOKEN,
  ) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  /**
   * weather 조건만 API에 전달하여 해당 날씨의 전체 패션 리스트를 가져옵니다.
   * temperature_band, gender 필터링은 프론트엔드에서 수행합니다.
   */
  async getFashionByWeather(
    weather: string,
  ): Promise<FashionItem[]> {
    const url = `${this.baseUrl}?weather=${encodeURIComponent(weather)}`;

    try {
      const response = await fetch(url, { redirect: "follow" });
      const data: ApiResponse<FashionItem[]> =
        await response.json();

      if (data.success && data.data) {
        return data.data;
      }

      console.error("Fashion API returned error:", data.error);
      return [];
    } catch (error) {
      console.error("Failed to fetch fashion list:", error);
      return [];
    }
  }

  async getAllItems(): Promise<FashionItem[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}?action=list`,
        { redirect: "follow" },
      );
      const data: ApiResponse<FashionItem[]> =
        await response.json();
      if (data.success && data.data) {
        return data.data;
      }
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
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({
          token: this.token,
          action: "upsert",
          item,
        }),
        redirect: "follow",
      });
      const data: ApiResponse<FashionItem> =
        await response.json();
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
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({
          token: this.token,
          action: "delete",
          id,
        }),
        redirect: "follow",
      });
      const data: ApiResponse<FashionItem> =
        await response.json();
      return data.success;
    } catch (error) {
      console.error("Failed to delete item:", error);
      return false;
    }
  }

  /** API 호출 실패 시 사용하는 mock 데이터 (weather 기준으로만 반환) */
  private getMockData(weather: string): FashionItem[] {
    const mockData: FashionItem[] = [
      // ── sunny ──────────────────────────────────────────
      {
        id: "MOCK_S01",
        weather: "sunny",
        temperature_band: "hot",
        gender: "female",
        fashion_category: "casual",
        outer: "none",
        top: "화이트 린넨 셔츠",
        bottom: "베이지 쇼츠",
        shoes: "샌들",
        accessory: "스트로우 햇",
        color_palette: "화이트, 베이지, 내추럴",
        description:
          "맑고 더운 날을 위한 여성 여름 캐주얼. 가볍고 통기성 좋은 소재로 시원함을 강조합니다.",
        active: true,
      },
      {
        id: "MOCK_S02",
        weather: "sunny",
        temperature_band: "hot",
        gender: "male",
        fashion_category: "casual",
        outer: "none",
        top: "스트라이프 반팔 티셔츠",
        bottom: "카고 반바지",
        shoes: "스포츠 슬리퍼",
        accessory: "캡 모자",
        color_palette: "네이비, 화이트, 카키",
        description:
          "더운 여름날 남성을 위한 시원한 캐주얼 룩. 활동성과 스타일을 동시에 잡았습니다.",
        active: true,
      },
      {
        id: "MOCK_S03",
        weather: "sunny",
        temperature_band: "warm",
        gender: "female",
        fashion_category: "street",
        outer: "데님 자켓 (가볍게)",
        top: "크롭 탱크탑",
        bottom: "와이드 팬츠",
        shoes: "청키 스니커즈",
        accessory: "토트백",
        color_palette: "데님 블루, 크림, 화이트",
        description:
          "선선한 맑은 날 데님 자켓 하나로 완성하는 여성 스트릿 룩.",
        active: true,
      },
      {
        id: "MOCK_S04",
        weather: "sunny",
        temperature_band: "warm",
        gender: "male",
        fashion_category: "minimal",
        outer: "라이트 블레이저",
        top: "화이트 반팔 티셔츠",
        bottom: "슬림 치노 팬츠",
        shoes: "로퍼",
        accessory: "미니멀 시계",
        color_palette: "오프화이트, 카멜, 베이지",
        description:
          "따뜻한 봄·가을 맑은 날에 어울리는 남성 미니멀 캐주얼.",
        active: true,
      },
      {
        id: "MOCK_S05",
        weather: "sunny",
        temperature_band: "mild",
        gender: "unisex",
        fashion_category: "casual",
        outer: "얇은 후드집업",
        top: "베이직 티셔츠",
        bottom: "조거 팬츠",
        shoes: "러닝화",
        accessory: "크로스백",
        color_palette: "그레이, 화이트, 블랙",
        description:
          "온화한 날씨에 남녀 모두 편하게 입을 수 있는 유니섹스 캐주얼 룩.",
        active: true,
      },
      // ── rainy ──────────────────────────────────────────
      {
        id: "MOCK_R01",
        weather: "rainy",
        temperature_band: "cool",
        gender: "male",
        fashion_category: "street",
        outer: "블랙 방수 자켓",
        top: "그레이 후디",
        bottom: "다크 데님 팬츠",
        shoes: "방수 스니커즈",
        accessory: "접이식 우산",
        color_palette: "블랙, 다크 그레이, 네이비",
        description:
          "비 오는 선선한 날 남성을 위한 방수 스트릿 룩. 실용성과 스타일을 모두 잡았습니다.",
        active: true,
      },
      {
        id: "MOCK_R02",
        weather: "rainy",
        temperature_band: "cool",
        gender: "female",
        fashion_category: "casual",
        outer: "트렌치코트",
        top: "터틀넥 니트",
        bottom: "미디 스커트",
        shoes: "첼시 부츠",
        accessory: "장우산",
        color_palette: "카멜, 크림, 브라운",
        description:
          "비 오는 날에도 우아하게. 트렌치코트로 완성하는 여성 레이니 룩.",
        active: true,
      },
      // ── cloudy ─────────────────────────────────────────
      {
        id: "MOCK_C01",
        weather: "cloudy",
        temperature_band: "cold",
        gender: "unisex",
        fashion_category: "minimal",
        outer: "그레이 울 코트",
        top: "블랙 니트 스웨터",
        bottom: "와이드 슬랙스",
        shoes: "블랙 레더 슈즈",
        accessory: "울 머플러",
        color_palette: "그레이, 블랙, 차콜",
        description:
          "흐리고 추운 날에 어울리는 유니섹스 미니멀 룩. 레이어드로 보온성을 높였습니다.",
        active: true,
      },
      {
        id: "MOCK_C02",
        weather: "cloudy",
        temperature_band: "mild",
        gender: "female",
        fashion_category: "casual",
        outer: "오버사이즈 가디건",
        top: "스트라이프 티셔츠",
        bottom: "청바지",
        shoes: "스니커즈",
        accessory: "숄더백",
        color_palette: "오트밀, 스트라이프 네이비, 인디고",
        description:
          "흐린 날의 포근함을 느낄 수 있는 여성 캐주얼 레이어드 룩.",
        active: true,
      },
    ];
    return mockData.filter((item) => item.weather === weather);
  }
}

export const fashionApi = new FashionApiService();
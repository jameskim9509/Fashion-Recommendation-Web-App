"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Wind,
  CloudFog,
  MapPin,
  Settings,
  RefreshCw,
  Droplets,
  Thermometer,
  Shirt,
  Footprints,
  Sparkles,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  fashionApi,
  FashionItem,
} from "../services/fashionApi";
import {
  fetchCurrentWeather,
  type CurrentWeather,
  type WeatherType,
} from "../services/weatherApi";

// ─────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────
type GenderType = "male" | "female" | "unisex";
type TempBand =
  | "freezing"
  | "cold"
  | "cool"
  | "mild"
  | "warm"
  | "hot";


// ─────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────
const weatherConfig: Record<
  WeatherType,
  {
    icon: React.ElementType;
    label: string;
    gradient: string;
    iconColor: string;
  }
> = {
  sunny: {
    icon: Sun,
    label: "맑음",
    gradient: "from-amber-400 to-orange-500",
    iconColor: "text-yellow-100",
  },
  cloudy: {
    icon: Cloud,
    label: "흐림",
    gradient: "from-slate-400 to-gray-600",
    iconColor: "text-gray-100",
  },
  rainy: {
    icon: CloudRain,
    label: "비",
    gradient: "from-blue-500 to-indigo-700",
    iconColor: "text-blue-100",
  },
  snowy: {
    icon: Snowflake,
    label: "눈",
    gradient: "from-cyan-400 to-blue-500",
    iconColor: "text-cyan-100",
  },
  windy: {
    icon: Wind,
    label: "바람",
    gradient: "from-teal-400 to-emerald-600",
    iconColor: "text-teal-100",
  },
  foggy: {
    icon: CloudFog,
    label: "안개",
    gradient: "from-slate-300 to-slate-500",
    iconColor: "text-slate-100",
  },
};

const tempBandConfig: Record<
  TempBand,
  { label: string; range: string; color: string }
> = {
  freezing: {
    label: "영하",
    range: "0°C 이하",
    color: "bg-cyan-100 text-cyan-800",
  },
  cold: {
    label: "추움",
    range: "1 ~ 9°C",
    color: "bg-blue-100 text-blue-800",
  },
  cool: {
    label: "선선",
    range: "10 ~ 16°C",
    color: "bg-sky-100 text-sky-800",
  },
  mild: {
    label: "온화",
    range: "17 ~ 22°C",
    color: "bg-green-100 text-green-800",
  },
  warm: {
    label: "따뜻",
    range: "23 ~ 27°C",
    color: "bg-yellow-100 text-yellow-800",
  },
  hot: {
    label: "더움",
    range: "28°C 이상",
    color: "bg-red-100 text-red-800",
  },
};

const genderLabel: Record<GenderType, string> = {
  male: "남성",
  female: "여성",
  unisex: "유니섹스",
};

const genderColor: Record<GenderType, string> = {
  male: "bg-blue-100 text-blue-700",
  female: "bg-pink-100 text-pink-700",
  unisex: "bg-purple-100 text-purple-700",
};

const categoryColor: Record<string, string> = {
  casual: "bg-emerald-100 text-emerald-700",
  street: "bg-orange-100 text-orange-700",
  minimal: "bg-gray-100 text-gray-700",
  formal: "bg-indigo-100 text-indigo-700",
  sporty: "bg-lime-100 text-lime-700",
  business: "bg-amber-100 text-amber-700",
  date: "bg-rose-100 text-rose-700",
  travel: "bg-teal-100 text-teal-700",
};

// ─────────────────────────────────────────────────────────
// 온도 → 기온 구간
// ─────────────────────────────────────────────────────────
function getTempBand(temp: number): TempBand {
  if (temp <= 0) return "freezing";
  if (temp <= 9) return "cold";
  if (temp <= 16) return "cool";
  if (temp <= 22) return "mild";
  if (temp <= 27) return "warm";
  return "hot";
}

// ─────────────────────────────────────────────────────────
// 패션 데이터의 숫자 기온 추출
// ─────────────────────────────────────────────────────────
function getItemTemperature(item: FashionItem): number | null {
  // FashionItem 타입상 number | undefined지만, OpenAPI spec(NullableNumberLike)에
  // 따르면 API가 빈 문자열 ""을 반환할 수 있으므로 unknown으로 다뤄 런타임 가드한다.
  const candidates: unknown[] = [
    item.temperature_avg_c,
    item.temperature_feels_like_c,
    item.temperature_max_c,
    item.temperature_min_c,
  ];

  for (const value of candidates) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    const numberValue = Number(value);

    if (!Number.isNaN(numberValue)) {
      return numberValue;
    }
  }

  return null;
}

function getItemTempBand(item: FashionItem): TempBand | null {
  const temperature = getItemTemperature(item);

  if (temperature === null) {
    return null;
  }

  return getTempBand(temperature);
}

// ─────────────────────────────────────────────────────────
// 패션 카드 컴포넌트
// ─────────────────────────────────────────────────────────
function FashionCard({ item }: { item: FashionItem }) {
  const [expanded, setExpanded] = useState(false);

  const itemTemperature = getItemTemperature(item);
  const tempBand = getItemTempBand(item);
  const catKey = item.fashion_category ?? "casual";

  const outfitRows: {
    label: string;
    value?: string;
    icon: React.ElementType;
  }[] = [
    { label: "아우터", value: item.outer, icon: Shirt },
    { label: "상의", value: item.top, icon: Shirt },
    { label: "하의", value: item.bottom, icon: Shirt },
    { label: "신발", value: item.shoes, icon: Footprints },
    {
      label: "악세사리",
      value: item.accessory,
      icon: Sparkles,
    },
  ].filter((r) => r.value && r.value !== "none");

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* 카드 헤더 */}
      <div className="p-5 pb-3">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {/* 카테고리 */}
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs ${categoryColor[catKey] ?? "bg-gray-100 text-gray-600"}`}
          >
            {catKey}
          </span>

          {/* 기온 구간: temperature_band 컬럼이 아니라 숫자 기온으로 계산.
              기온 정보가 전혀 없으면 "기온 무관" 뱃지로 표시한다. */}
          {tempBand ? (
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs ${tempBandConfig[tempBand].color}`}
            >
              {itemTemperature !== null
                ? `기준 ${itemTemperature}°C`
                : ""}
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">
              기온 무관
            </span>
          )}
        </div>

        {/* 설명 */}
        <p className="text-gray-700 leading-relaxed">
          {item.description ?? "스타일 설명이 없습니다."}
        </p>

        {/* 컬러 팔레트 */}
        {item.color_palette && (
          <div className="flex items-center gap-1.5 mt-2">
            <Tag className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-400">
              {item.color_palette}
            </span>
          </div>
        )}
      </div>

      {/* 구분선 */}
      <div className="mx-5 border-t border-gray-100" />

      {/* 아이템 목록 (접기/펼치기) */}
      <div className="px-5 py-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center justify-between w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <span>착장 구성 보기</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {expanded && (
          <div className="mt-3 space-y-2">
            {outfitRows.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="flex items-start gap-2"
              >
                <Icon className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />
                <span className="text-xs text-gray-400 w-16 shrink-0">
                  {label}
                </span>
                <span className="text-xs text-gray-700">
                  {value}
                </span>
              </div>
            ))}

            {item.material && (
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />
                <span className="text-xs text-gray-400 w-16 shrink-0">
                  소재
                </span>
                <span className="text-xs text-gray-700">
                  {item.material}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 메인 대시보드
// ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const [currentWeather, setCurrentWeather] =
    useState<CurrentWeather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [selectedGender, setSelectedGender] =
    useState<GenderType>("female");
  const [allFashionItems, setAllFashionItems] = useState<
    FashionItem[]
  >([]);
  const [fashionLoading, setFashionLoading] = useState(false);

  const genderOptions: {
    type: GenderType;
    label: string;
    emoji: string;
  }[] = [
    { type: "male", label: "남성", emoji: "👨" },
    { type: "female", label: "여성", emoji: "👩" },
    { type: "unisex", label: "유니섹스", emoji: "🧑" },
  ];

  // ── 날씨 로드 ─────────────────────────────────────────
  const loadWeather = useCallback(async () => {
    setWeatherLoading(true);

    try {
      const w = await fetchCurrentWeather();
      setCurrentWeather(w);
    } catch (error) {
      console.error("Failed to load weather:", error);
      setCurrentWeather(null);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  // ── 날씨 변경 시 → API에서 weather 기준으로만 전체 리스트 조회 ──
  const loadFashionList = useCallback(
    async (weather: WeatherType) => {
      setFashionLoading(true);

      try {
        const items =
          await fashionApi.getFashionByWeather(weather);
        setAllFashionItems(
          items.filter((i) => i.active !== false),
        );
      } finally {
        setFashionLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (currentWeather) {
      loadFashionList(currentWeather.weather);
    }
  }, [currentWeather?.weather, loadFashionList]);

  // ── 프론트엔드 필터링: item 숫자 기온 → band 계산 + currentWeather band 비교 + gender ──
  const filtered = useMemo(() => {
    if (!currentWeather) {
      return [];
    }

    const currentWeatherBand = getTempBand(
      currentWeather.temperature,
    );

    return allFashionItems.filter((item) => {
      const itemBand = getItemTempBand(item);

      // 기온 정보가 없는 아이템은 band 매칭을 건너뛰고 통과시킨다
      // (이전에는 silently drop 되었음). 카드에서는 "기온 무관" 뱃지로 표시한다.
      const bandMatch =
        itemBand === null || itemBand === currentWeatherBand;
      const genderMatch = item.gender === selectedGender;

      return bandMatch && genderMatch;
    });
  }, [allFashionItems, currentWeather, selectedGender]);

  const wConf = currentWeather
    ? weatherConfig[currentWeather.weather]
    : null;
  const tempBand = currentWeather
    ? getTempBand(currentWeather.temperature)
    : "mild";
  const fetchedTime = currentWeather
    ? currentWeather.fetchedAt.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* ── Header ── */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="mb-2">오늘의 패션 추천</h1>
            <p className="text-gray-600">
              날씨에 맞는 완벽한 스타일을 찾아보세요
            </p>
          </div>

          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-200"
          >
            <Settings className="w-5 h-5" />
            <span>관리자</span>
          </button>
        </header>

        {/* ── 날씨 + 성별 선택 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* 현재 날씨 카드 */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h2>현재 날씨</h2>
                {currentWeather && (
                  <span className="text-gray-400 text-sm">
                    ({currentWeather.location})
                  </span>
                )}
              </div>

              <button
                onClick={loadWeather}
                disabled={weatherLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <RefreshCw
                  className={`w-4 h-4 ${weatherLoading ? "animate-spin" : ""}`}
                />
                새로고침
              </button>
            </div>

            {weatherLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <div className="animate-spin w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">
                    날씨 정보를 불러오는 중...
                  </p>
                </div>
              </div>
            ) : currentWeather && wConf ? (
              <>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 mb-5">
                  <div
                    className={`p-3 rounded-xl bg-gradient-to-br ${wConf.gradient}`}
                  >
                    <wConf.icon className="w-8 h-8 text-white" />
                  </div>

                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl text-gray-800">
                        {currentWeather.temperature}°C
                      </span>
                      <span className="text-gray-400">/</span>
                      <span className="text-gray-500 text-sm">
                        체감 {currentWeather.feelsLike}°C
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-600">
                        {wConf.label}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${tempBandConfig[tempBand].color}`}
                      >
                        {tempBandConfig[tempBand].label} (
                        {tempBandConfig[tempBand].range})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <Droplets className="w-5 h-5 text-blue-500 shrink-0" />
                    <div>
                      <div className="text-xs text-gray-500">
                        습도
                      </div>
                      <div className="text-gray-700">
                        {currentWeather.humidity}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                    <Thermometer className="w-5 h-5 text-orange-500 shrink-0" />
                    <div>
                      <div className="text-xs text-gray-500">
                        체감 온도
                      </div>
                      <div className="text-gray-700">
                        {currentWeather.feelsLike}°C
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-400 mb-5">
                  마지막 업데이트: {fetchedTime}
                </p>

                {/* 성별 선택 */}
                <div>
                  <h3 className="mb-3">성별 선택</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {genderOptions.map((opt) => {
                      const isSel = selectedGender === opt.type;

                      return (
                        <button
                          key={opt.type}
                          onClick={() =>
                            setSelectedGender(opt.type)
                          }
                          className={`p-4 rounded-2xl border-2 transition-all ${
                            isSel
                              ? "bg-gradient-to-r from-purple-100 to-pink-100 border-purple-300 shadow-lg scale-[1.02]"
                              : "bg-white hover:bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="text-3xl mb-2">
                            {opt.emoji}
                          </div>
                          <div
                            className={
                              isSel
                                ? "text-purple-700"
                                : "text-gray-600"
                            }
                          >
                            {opt.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-gray-400">
                날씨 정보를 불러올 수 없습니다.
              </div>
            )}
          </div>

          {/* 날씨 비주얼 카드 */}
          <div
            className={`rounded-3xl shadow-xl p-8 text-white bg-gradient-to-br ${wConf ? wConf.gradient : "from-blue-600 to-purple-600"} transition-all duration-500`}
          >
            <div className="flex flex-col items-center justify-center h-full text-center min-h-[300px]">
              {weatherLoading ? (
                <div className="animate-pulse flex flex-col items-center gap-4">
                  <div className="w-24 h-24 bg-white/20 rounded-full" />
                  <div className="w-32 h-12 bg-white/20 rounded-xl" />
                  <div className="w-20 h-6 bg-white/20 rounded-full" />
                </div>
              ) : currentWeather && wConf ? (
                <>
                  <wConf.icon
                    className={`w-24 h-24 mb-4 ${wConf.iconColor} opacity-90`}
                  />
                  <div className="text-7xl mb-2">
                    {currentWeather.temperature}°C
                  </div>
                  <div className="text-2xl opacity-90 mb-4">
                    {wConf.label}
                  </div>
                  <div className="px-4 py-2 bg-white/20 rounded-full backdrop-blur-sm flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {currentWeather.location}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── 추천 스타일 리스트 ── */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-2">
            <h2>추천 스타일</h2>

            {!fashionLoading && allFashionItems.length > 0 && (
              <span className="text-sm text-gray-400">
                {allFashionItems.length}개 조회 →{" "}
                <span className="text-purple-600">
                  {filtered.length}개 매칭
                </span>
              </span>
            )}
          </div>

          {/* 현재 필터 정보 */}
          {currentWeather && !fashionLoading && (
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                {wConf && (
                  <wConf.icon className="w-3.5 h-3.5" />
                )}
                날씨: {wConf?.label}
              </span>

              <span
                className={`px-3 py-1 rounded-full text-xs ${tempBandConfig[tempBand].color}`}
              >
                현재 기온 구간: {tempBandConfig[tempBand].label}{" "}
                ({tempBandConfig[tempBand].range})
              </span>

              <span
                className={`px-3 py-1 rounded-full text-xs ${genderColor[selectedGender]}`}
              >
                {genderLabel[selectedGender]}
              </span>
            </div>
          )}

          {fashionLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-500">
                스타일을 불러오는 중...
              </p>
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((item) => (
                <FashionCard key={item.id} item={item} />
              ))}
            </div>
          ) : allFashionItems.length > 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="text-5xl mb-4">🤔</div>
              <p className="mb-1">
                현재 기온 구간 · 성별 조건에 맞는 스타일이
                없습니다.
              </p>
              <p className="text-sm text-gray-400">
                조회된 {allFashionItems.length}개 중{" "}
                <strong>
                  {tempBandConfig[tempBand].label}
                </strong>{" "}
                /&nbsp;
                <strong>
                  {genderLabel[selectedGender]}
                </strong>{" "}
                조건에 해당하는 데이터를 추가해보세요.
              </p>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <div className="text-5xl mb-4">📭</div>
              <p className="mb-1">
                날씨 조건에 맞는 패션 데이터가 없습니다.
              </p>
              <p className="text-sm text-gray-400">
                관리자 페이지에서 새로운 스타일을 추가해보세요!
              </p>
            </div>
          )}
        </div>

        <footer className="mt-8 text-center text-sm text-gray-500">
          <p>
            날씨 정보는 자동으로 업데이트됩니다. 외출 전 꼭
            확인하세요!
          </p>
        </footer>
      </div>
    </div>
  );
}
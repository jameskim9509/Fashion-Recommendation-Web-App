"use client";

import {
  useState,
  useEffect,
  useMemo,
  useId,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  LogOut,
  Search,
  Filter,
  RotateCcw,
} from "lucide-react";
import {
  fashionApi,
  FashionItem,
} from "../services/fashionApi";

// 필터 "전체" 옵션의 sentinel 값.
const ALL = "all";

type TempBand =
  | "freezing"
  | "cold"
  | "cool"
  | "mild"
  | "warm"
  | "hot";

/**
 * 아이템의 대표 숫자 기온을 추출한다. avg → feels_like → max → min 순.
 * (Dashboard.getItemTemperature 와 동일한 우선순위)
 */
function getItemTemperature(item: FashionItem): number | null {
  const candidates: unknown[] = [
    item.temperature_avg_c,
    item.temperature_feels_like_c,
    item.temperature_max_c,
    item.temperature_min_c,
  ];

  for (const value of candidates) {
    if (value === undefined || value === null || value === "") continue;
    const numberValue = Number(value);
    if (!Number.isNaN(numberValue)) return numberValue;
  }

  return null;
}

/**
 * 숫자 기온 → 기온 구간. 임계값은 Dashboard.getTempBand 와 반드시 동기화할 것.
 */
function getTempBand(temp: number): TempBand {
  if (temp <= 0) return "freezing";
  if (temp <= 9) return "cold";
  if (temp <= 16) return "cool";
  if (temp <= 22) return "mild";
  if (temp <= 27) return "warm";
  return "hot";
}

function getItemTempBand(item: FashionItem): TempBand | null {
  const temperature = getItemTemperature(item);
  return temperature === null ? null : getTempBand(temperature);
}

// 기온 구간 필터 옵션 ("none" = 기온 정보가 전혀 없는 아이템).
const tempBandFilterOptions: { value: string; label: string }[] = [
  { value: "freezing", label: "영하 (0°C 이하)" },
  { value: "cold", label: "추움 (1~9°C)" },
  { value: "cool", label: "선선 (10~16°C)" },
  { value: "mild", label: "온화 (17~22°C)" },
  { value: "warm", label: "따뜻 (23~27°C)" },
  { value: "hot", label: "더움 (28°C 이상)" },
  { value: "none", label: "기온 무관" },
];

const statusFilterOptions: { value: string; label: string }[] = [
  { value: "active", label: "활성" },
  { value: "inactive", label: "비활성" },
];

/** 필터 드롭다운 공통 래퍼 (라벨 + select). */
function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  const selectId = useId();

  return (
    <div>
      <label
        htmlFor={selectId}
        className="block text-xs text-gray-500 mb-1.5"
      >
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {children}
      </select>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [items, setItems] = useState<FashionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] =
    useState<Partial<FashionItem> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // ── 필터 상태 ──
  const [search, setSearch] = useState("");
  const [weatherFilter, setWeatherFilter] = useState(ALL);
  const [genderFilter, setGenderFilter] = useState(ALL);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [tempBandFilter, setTempBandFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);

  const weatherOptions = [
    "sunny",
    "cloudy",
    "rainy",
    "snowy",
    "windy",
    "foggy",
  ];

  const genderOptions = ["male", "female", "unisex"];

  const fashionCategoryOptions = [
    "casual",
    "street",
    "minimal",
    "formal",
    "sporty",
    "business",
    "date",
    "travel",
  ];

  const hasActiveFilters =
    search.trim() !== "" ||
    weatherFilter !== ALL ||
    genderFilter !== ALL ||
    categoryFilter !== ALL ||
    tempBandFilter !== ALL ||
    statusFilter !== ALL;

  const handleResetFilters = () => {
    setSearch("");
    setWeatherFilter(ALL);
    setGenderFilter(ALL);
    setCategoryFilter(ALL);
    setTempBandFilter(ALL);
    setStatusFilter(ALL);
  };

  // ── 다중 조건 필터링 (전부 AND 결합, 클라이언트 측) ──
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      if (weatherFilter !== ALL && item.weather !== weatherFilter) {
        return false;
      }
      if (genderFilter !== ALL && item.gender !== genderFilter) {
        return false;
      }
      if (
        categoryFilter !== ALL &&
        (item.fashion_category ?? "") !== categoryFilter
      ) {
        return false;
      }
      if (statusFilter !== ALL) {
        const isActive = item.active !== false;
        if (statusFilter === "active" && !isActive) return false;
        if (statusFilter === "inactive" && isActive) return false;
      }
      if (tempBandFilter !== ALL) {
        const band = getItemTempBand(item);
        const bandMatch =
          tempBandFilter === "none"
            ? band === null
            : band === tempBandFilter;
        if (!bandMatch) return false;
      }
      if (query) {
        const haystack = [
          item.id,
          item.description,
          item.outer,
          item.top,
          item.bottom,
          item.shoes,
          item.accessory,
          item.color_palette,
          item.material,
          item.figma_layer_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [
    items,
    search,
    weatherFilter,
    genderFilter,
    categoryFilter,
    tempBandFilter,
    statusFilter,
  ]);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await fashionApi.getAllItems();
      setItems(data);
    } catch (error) {
      console.error("Failed to load items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingItem({
      weather: "sunny",
      gender: "female",
      fashion_category: "casual",
      active: true,
    });
  };

  const handleEdit = (item: FashionItem) => {
    setIsCreating(false);
    setEditingItem({ ...item });
  };

  const handleSave = async () => {
    if (!editingItem) return;

    const saved = await fashionApi.upsertItem(editingItem);

    if (saved) {
      await loadItems();
      setEditingItem(null);
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    const success = await fashionApi.deleteItem(id);

    if (success) {
      await loadItems();
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    setIsCreating(false);
  };

  const updateEditingItem = (field: string, value: any) => {
    setEditingItem((prev) =>
      prev ? { ...prev, [field]: value } : null,
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-white rounded-xl transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <div>
              <h1 className="mb-1">패션 데이터 관리</h1>
              <p className="text-gray-600">
                날씨별 패션 추천 데이터를 관리하세요
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>새로 만들기</span>
            </button>
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.replace("/admin/login");
                router.refresh();
              }}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
              title="로그아웃"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </header>

        {editingItem && (
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2>
                {isCreating
                  ? "새 스타일 만들기"
                  : "스타일 수정"}
              </h2>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>저장</span>
                </button>

                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>취소</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-2">ID</label>
                <input
                  type="text"
                  value={editingItem.id || ""}
                  onChange={(e) =>
                    updateEditingItem("id", e.target.value)
                  }
                  placeholder="자동 생성"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!isCreating}
                />
              </div>

              <div>
                <label className="block text-sm mb-2">
                  날씨 *
                </label>
                <select
                  value={editingItem.weather || ""}
                  onChange={(e) =>
                    updateEditingItem("weather", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {weatherOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2">
                  성별 *
                </label>
                <select
                  value={editingItem.gender || ""}
                  onChange={(e) =>
                    updateEditingItem("gender", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {genderOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2">
                  평균 기온 (°C)
                </label>
                <input
                  type="number"
                  value={editingItem.temperature_avg_c || ""}
                  onChange={(e) =>
                    updateEditingItem(
                      "temperature_avg_c",
                      e.target.value === ""
                        ? ""
                        : Number(e.target.value),
                    )
                  }
                  placeholder="예: 26"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">
                  최저 기온 (°C)
                </label>
                <input
                  type="number"
                  value={editingItem.temperature_min_c || ""}
                  onChange={(e) =>
                    updateEditingItem(
                      "temperature_min_c",
                      e.target.value === ""
                        ? ""
                        : Number(e.target.value),
                    )
                  }
                  placeholder="예: 22"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">
                  최고 기온 (°C)
                </label>
                <input
                  type="number"
                  value={editingItem.temperature_max_c || ""}
                  onChange={(e) =>
                    updateEditingItem(
                      "temperature_max_c",
                      e.target.value === ""
                        ? ""
                        : Number(e.target.value),
                    )
                  }
                  placeholder="예: 29"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">
                  체감 기온 (°C)
                </label>
                <input
                  type="number"
                  value={
                    editingItem.temperature_feels_like_c || ""
                  }
                  onChange={(e) =>
                    updateEditingItem(
                      "temperature_feels_like_c",
                      e.target.value === ""
                        ? ""
                        : Number(e.target.value),
                    )
                  }
                  placeholder="예: 28"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">
                  카테고리
                </label>
                <select
                  value={editingItem.fashion_category || ""}
                  onChange={(e) =>
                    updateEditingItem(
                      "fashion_category",
                      e.target.value,
                    )
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">선택</option>
                  {fashionCategoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2">
                  아우터
                </label>
                <input
                  type="text"
                  value={editingItem.outer || ""}
                  onChange={(e) =>
                    updateEditingItem("outer", e.target.value)
                  }
                  placeholder="예: black jacket"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">
                  상의
                </label>
                <input
                  type="text"
                  value={editingItem.top || ""}
                  onChange={(e) =>
                    updateEditingItem("top", e.target.value)
                  }
                  placeholder="예: white t-shirt"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">
                  하의
                </label>
                <input
                  type="text"
                  value={editingItem.bottom || ""}
                  onChange={(e) =>
                    updateEditingItem("bottom", e.target.value)
                  }
                  placeholder="예: blue jeans"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">
                  신발
                </label>
                <input
                  type="text"
                  value={editingItem.shoes || ""}
                  onChange={(e) =>
                    updateEditingItem("shoes", e.target.value)
                  }
                  placeholder="예: sneakers"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">
                  악세서리
                </label>
                <input
                  type="text"
                  value={editingItem.accessory || ""}
                  onChange={(e) =>
                    updateEditingItem(
                      "accessory",
                      e.target.value,
                    )
                  }
                  placeholder="예: sunglasses"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">
                  색상 팔레트
                </label>
                <input
                  type="text"
                  value={editingItem.color_palette || ""}
                  onChange={(e) =>
                    updateEditingItem(
                      "color_palette",
                      e.target.value,
                    )
                  }
                  placeholder="예: black, white, gray"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">
                  소재
                </label>
                <input
                  type="text"
                  value={editingItem.material || ""}
                  onChange={(e) =>
                    updateEditingItem(
                      "material",
                      e.target.value,
                    )
                  }
                  placeholder="예: cotton, linen"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm mb-2">
                  설명
                </label>
                <textarea
                  value={editingItem.description || ""}
                  onChange={(e) =>
                    updateEditingItem(
                      "description",
                      e.target.value,
                    )
                  }
                  placeholder="스타일 설명을 입력하세요"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm mb-2">
                  이미지 프롬프트 (Figma에서 이미지 생성용)
                </label>
                <textarea
                  value={editingItem.image_prompt || ""}
                  onChange={(e) =>
                    updateEditingItem(
                      "image_prompt",
                      e.target.value,
                    )
                  }
                  placeholder="이미지 생성을 위한 프롬프트를 입력하세요"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">
                  Figma 레이어명
                </label>
                <input
                  type="text"
                  value={editingItem.figma_layer_name || ""}
                  onChange={(e) =>
                    updateEditingItem(
                      "figma_layer_name",
                      e.target.value,
                    )
                  }
                  placeholder="예: sunny_warm_female_casual"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-3 pt-7">
                <input
                  id="active"
                  type="checkbox"
                  checked={editingItem.active !== false}
                  onChange={(e) =>
                    updateEditingItem(
                      "active",
                      e.target.checked,
                    )
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="active" className="text-sm">
                  활성화
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2>
              등록된 스타일{" "}
              <span className="text-gray-400" aria-live="polite">
                {hasActiveFilters
                  ? `(${filteredItems.length} / ${items.length}개)`
                  : `(${items.length}개)`}
              </span>
            </h2>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>필터 초기화</span>
              </button>
            )}
          </div>

          {!loading && items.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center gap-2 mb-3 text-gray-500">
                <Filter className="w-4 h-4" />
                <span className="text-sm">필터</span>
              </div>

              {/* 검색 */}
              <div className="relative mb-3">
                <Search
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="스타일 검색"
                  placeholder="ID · 설명 · 착장 · 색상 · 소재 검색..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 드롭다운 필터 */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <FilterSelect
                  label="날씨"
                  value={weatherFilter}
                  onChange={setWeatherFilter}
                >
                  <option value={ALL}>전체</option>
                  {weatherOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </FilterSelect>

                <FilterSelect
                  label="성별"
                  value={genderFilter}
                  onChange={setGenderFilter}
                >
                  <option value={ALL}>전체</option>
                  {genderOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </FilterSelect>

                <FilterSelect
                  label="카테고리"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                >
                  <option value={ALL}>전체</option>
                  {fashionCategoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </FilterSelect>

                <FilterSelect
                  label="기온 구간"
                  value={tempBandFilter}
                  onChange={setTempBandFilter}
                >
                  <option value={ALL}>전체</option>
                  {tempBandFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </FilterSelect>

                <FilterSelect
                  label="활성 상태"
                  value={statusFilter}
                  onChange={setStatusFilter}
                >
                  <option value={ALL}>전체</option>
                  {statusFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </FilterSelect>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">
                데이터를 불러오는 중...
              </p>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm">
                      날씨
                    </th>
                    <th className="px-4 py-3 text-left text-sm">
                      기온
                    </th>
                    <th className="px-4 py-3 text-left text-sm">
                      성별
                    </th>
                    <th className="px-4 py-3 text-left text-sm">
                      카테고리
                    </th>
                    <th className="px-4 py-3 text-left text-sm">
                      설명
                    </th>
                    <th className="px-4 py-3 text-left text-sm">
                      상태
                    </th>
                    <th className="px-4 py-3 text-left text-sm">
                      작업
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm font-mono">
                        {item.id}
                      </td>

                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                          {item.weather}
                        </span>
                      </td>

                      {/* 기온 구간 필터와 동일하게 대표 기온(avg→feels→max→min)을
                          표시해, 필터 결과 행과 표시 값이 어긋나지 않게 한다. */}
                      <td className="px-4 py-3 text-sm">
                        {(() => {
                          const temp = getItemTemperature(item);
                          return temp === null ? "-" : `${temp}°C`;
                        })()}
                      </td>

                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                          {item.gender}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-sm">
                        {item.fashion_category || "-"}
                      </td>

                      <td className="px-4 py-3 text-sm max-w-xs truncate">
                        {item.description || "-"}
                      </td>

                      <td className="px-4 py-3 text-sm">
                        {item.active !== false ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                            활성
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded-full text-xs">
                            비활성
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                            title="수정"
                          >
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(item.id)
                            }
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : items.length > 0 ? (
            <div
              role="status"
              className="text-center py-12 text-gray-500"
            >
              <div className="text-6xl mb-4">🔍</div>
              <p className="mb-2">
                필터 조건에 맞는 스타일이 없습니다.
              </p>
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                필터 초기화
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📦</div>
              <p className="mb-2">등록된 스타일이 없습니다.</p>
              <p className="text-sm">
                새로 만들기 버튼을 눌러 첫 스타일을
                추가해보세요!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
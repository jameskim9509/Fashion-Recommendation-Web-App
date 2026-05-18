import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
} from "lucide-react";
import {
  fashionApi,
  FashionItem,
} from "../services/fashionApi";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FashionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] =
    useState<Partial<FashionItem> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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
              onClick={() => navigate('/')}
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

          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>새로 만들기</span>
          </button>
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
          <h2 className="mb-6">
            등록된 스타일 ({items.length}개)
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">
                데이터를 불러오는 중...
              </p>
            </div>
          ) : items.length > 0 ? (
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
                      평균 기온
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
                      작업
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {items.map((item) => (
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

                      <td className="px-4 py-3 text-sm">
                        {item.temperature_avg_c !== undefined &&
                        item.temperature_avg_c !== null &&
                        item.temperature_avg_c !== ""
                          ? `${item.temperature_avg_c}°C`
                          : "-"}
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
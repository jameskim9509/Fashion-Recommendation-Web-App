import Dashboard from "@/app/components/Dashboard";
import { fetchCurrentWeather } from "@/app/services/weatherApi";
import { serverListFashion } from "@/lib/server/appsScript";

// 매 요청마다 서버에서 새로 렌더 (날씨/패션 데이터를 캐싱하지 않음).
export const dynamic = "force-dynamic";

export default async function Page() {
  // 서버에서는 navigator.geolocation 이 없어 fetchCurrentWeather 가 SEOUL_FALLBACK 좌표로 동작한다.
  // 클라이언트 hydrate 후 Dashboard 의 useEffect 가 실제 위치로 weather 를 다시 갱신함.
  const initialWeather = await fetchCurrentWeather().catch(() => undefined);

  const fashionRes = initialWeather
    ? await serverListFashion({ weather: initialWeather.weather }).catch(
        () => null,
      )
    : null;
  const initialFashionItems =
    fashionRes?.success && fashionRes.data ? fashionRes.data : [];

  return (
    <Dashboard
      initialWeather={initialWeather}
      initialFashionItems={initialFashionItems}
    />
  );
}

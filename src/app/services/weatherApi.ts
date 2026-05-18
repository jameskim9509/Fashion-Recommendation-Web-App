/**
 * 실시간 날씨 조회 서비스 (Open-Meteo).
 *
 * - https://open-meteo.com — API 키 불필요, 무료, 회원가입 불필요.
 * - 위치는 navigator.geolocation으로 받고, 실패/거부 시 서울 좌표로 fallback.
 * - Open-Meteo의 WMO weather code(0~99)를 앱의 WeatherType으로 매핑.
 */

export type WeatherType =
  | "sunny"
  | "cloudy"
  | "rainy"
  | "snowy"
  | "windy"
  | "foggy";

export interface CurrentWeather {
  weather: WeatherType;
  temperature: number;
  feelsLike: number;
  humidity: number;
  location: string;
  fetchedAt: Date;
}

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

const SEOUL_FALLBACK = {
  latitude: 37.5665,
  longitude: 126.978,
  name: "서울",
} as const;

interface Coords {
  latitude: number;
  longitude: number;
  name: string;
}

interface OpenMeteoResponse {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
}

/**
 * WMO weather interpretation code → WeatherType.
 * 참고: https://open-meteo.com/en/docs (Weather variable documentation 섹션)
 */
function mapWmoCode(code: number): WeatherType {
  if (code === 0) return "sunny";
  if (code >= 1 && code <= 3) return "cloudy";
  if (code === 45 || code === 48) return "foggy";
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    code >= 95
  ) {
    return "rainy";
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return "snowy";
  }
  return "cloudy";
}

/**
 * 브라우저 Geolocation API로 좌표를 받아오고, 실패/거부 시 서울 좌표 fallback.
 */
async function resolveCoords(): Promise<Coords> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { ...SEOUL_FALLBACK };
  }

  try {
    const position = await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          maximumAge: 5 * 60 * 1000,
          enableHighAccuracy: false,
        });
      },
    );

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      name: "현재 위치",
    };
  } catch {
    return { ...SEOUL_FALLBACK };
  }
}

export async function fetchCurrentWeather(): Promise<CurrentWeather> {
  const coords = await resolveCoords();

  const params = new URLSearchParams({
    latitude: String(coords.latitude),
    longitude: String(coords.longitude),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
    timezone: "auto",
  });

  const response = await fetch(`${OPEN_METEO_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(
      `Open-Meteo returned ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const current = data.current;

  let weather = mapWmoCode(current.weather_code);

  // 풍속이 30 km/h 이상이고 비/눈이 아니면 "바람"으로 격상.
  if (
    current.wind_speed_10m >= 30 &&
    weather !== "rainy" &&
    weather !== "snowy"
  ) {
    weather = "windy";
  }

  return {
    weather,
    temperature: Math.round(current.temperature_2m),
    feelsLike: Math.round(current.apparent_temperature),
    humidity: Math.round(current.relative_humidity_2m),
    location: coords.name,
    fetchedAt: new Date(),
  };
}

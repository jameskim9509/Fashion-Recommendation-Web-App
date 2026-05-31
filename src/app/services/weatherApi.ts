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
  /** Date on the client; ISO string after Server→Client serialization. */
  fetchedAt: Date | string;
}

/** 일자별 예보 1건. */
export interface DailyForecast {
  /** 예보 시간대(timezone) 기준 로컬 날짜 "YYYY-MM-DD". */
  date: string;
  weather: WeatherType;
  tempMax: number;
  tempMin: number;
  /** (max+min)/2 반올림 — 기온 구간(TempBand) 계산에 사용. */
  tempAvg: number;
}

/** 현재 날씨 + 주간 예보 묶음 (지오로케이션·요청 1회로 함께 조회). */
export interface WeatherBundle {
  current: CurrentWeather;
  forecast: DailyForecast[];
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
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    wind_speed_10m_max: number[];
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

/**
 * WMO code를 WeatherType으로 매핑하되, 풍속이 30 km/h 이상이고
 * 비/눈이 아니면 "바람"으로 격상한다. (현재/일별 공통 로직)
 */
function resolveWeatherType(
  code: number,
  windSpeed: number,
): WeatherType {
  const weather = mapWmoCode(code);
  if (
    windSpeed >= 30 &&
    weather !== "rainy" &&
    weather !== "snowy"
  ) {
    return "windy";
  }
  return weather;
}

function parseCurrent(
  data: OpenMeteoResponse,
  coords: Coords,
): CurrentWeather {
  const current = data.current;

  return {
    weather: resolveWeatherType(
      current.weather_code,
      current.wind_speed_10m,
    ),
    temperature: Math.round(current.temperature_2m),
    feelsLike: Math.round(current.apparent_temperature),
    humidity: Math.round(current.relative_humidity_2m),
    location: coords.name,
    fetchedAt: new Date(),
  };
}

function parseDaily(data: OpenMeteoResponse): DailyForecast[] {
  const daily = data.daily;
  if (!daily) return [];

  return daily.time.map((date, i) => {
    const max = daily.temperature_2m_max[i];
    const min = daily.temperature_2m_min[i];

    return {
      date,
      weather: resolveWeatherType(
        daily.weather_code[i],
        daily.wind_speed_10m_max[i],
      ),
      tempMax: Math.round(max),
      tempMin: Math.round(min),
      tempAvg: Math.round((max + min) / 2),
    };
  });
}

/**
 * 현재 날씨 + 주간 예보를 한 번의 요청으로 함께 조회한다.
 * 좌표는 navigator.geolocation, 실패/거부 시 서울 fallback.
 */
export async function fetchWeatherBundle(): Promise<WeatherBundle> {
  const coords = await resolveCoords();

  const params = new URLSearchParams({
    latitude: String(coords.latitude),
    longitude: String(coords.longitude),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max",
    forecast_days: "7",
    timezone: "auto",
  });

  const response = await fetch(`${OPEN_METEO_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(
      `Open-Meteo returned ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as OpenMeteoResponse;

  return {
    current: parseCurrent(data, coords),
    forecast: parseDaily(data),
  };
}

/** 현재 날씨만 필요할 때 쓰는 thin wrapper. */
export async function fetchCurrentWeather(): Promise<CurrentWeather> {
  return (await fetchWeatherBundle()).current;
}

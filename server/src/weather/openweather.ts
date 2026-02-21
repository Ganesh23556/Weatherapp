import NodeCache from "node-cache";
import { env } from "../lib/env.js";

type Units = "metric" | "imperial";

export type CityResult = {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
};

export type WeatherBundle = {
  location: { lat: number; lon: number };
  current: {
    dt: number;
    temp: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    description: string;
    icon: string;
  };
  pastDays: Array<{
    date: string;
    temp_avg?: number;
    description?: string;
    icon?: string;
    unavailable?: boolean;
  }>;
  futureDays: Array<{
    date: string;
    temp_min: number;
    temp_max: number;
    description: string;
    icon: string;
  }>;
};

const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401 || /invalid api key/i.test(text)) {
      throw new Error(
        "Invalid OpenWeather API key. Please check your OPENWEATHER_API_KEY in server/.env."
      );
    }
    if (res.status === 403 || /not available for your subscription/i.test(text)) {
      // Create a specific error that can be caught to handle plan limitations
      const err = new Error("This feature (historical data) requires a different OpenWeather plan (e.g., One Call 3.0).");
      (err as any).isPlanError = true;
      throw err;
    }
    throw new Error(`Weather API error ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

function requireApiKey() {
  if (!env.OPENWEATHER_API_KEY || env.OPENWEATHER_API_KEY.trim().length === 0) {
    throw new Error("OPENWEATHER_API_KEY is not configured on the server");
  }
}

export async function searchCity(q: string): Promise<CityResult[]> {
  requireApiKey();
  const url = new URL("https://api.openweathermap.org/geo/1.0/direct");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "5");
  url.searchParams.set("appid", env.OPENWEATHER_API_KEY.trim());

  const results = await fetchJson<
    Array<{ name: string; country: string; state?: string; lat: number; lon: number }>
  >(url.toString());
  return results.map((r) => ({
    name: r.name,
    country: r.country,
    state: r.state,
    lat: r.lat,
    lon: r.lon
  }));
}

function isoDateFromUnix(dt: number) {
  return new Date(dt * 1000).toISOString().slice(0, 10);
}

export async function getWeatherBundle(params: {
  lat: number;
  lon: number;
  units: Units;
}): Promise<WeatherBundle> {
  requireApiKey();
  const key = `bundle:${params.lat.toFixed(4)}:${params.lon.toFixed(4)}:${params.units}`;
  const cached = cache.get<WeatherBundle>(key);
  if (cached) return cached;

  const { lat, lon, units } = params;

  // Current weather
  const currentUrl = new URL("https://api.openweathermap.org/data/2.5/weather");
  currentUrl.searchParams.set("lat", String(lat));
  currentUrl.searchParams.set("lon", String(lon));
  currentUrl.searchParams.set("units", units);
  currentUrl.searchParams.set("appid", env.OPENWEATHER_API_KEY.trim());

  const current = await fetchJson<{
    dt: number;
    main: { temp: number; feels_like: number; humidity: number };
    wind: { speed: number };
    weather: Array<{ description: string; icon: string }>;
  }>(currentUrl.toString());

  // 5-day forecast in 3h steps -> aggregate to daily min/max + representative icon/desc
  const forecastUrl = new URL("https://api.openweathermap.org/data/2.5/forecast");
  forecastUrl.searchParams.set("lat", String(lat));
  forecastUrl.searchParams.set("lon", String(lon));
  forecastUrl.searchParams.set("units", units);
  forecastUrl.searchParams.set("appid", env.OPENWEATHER_API_KEY.trim());

  const forecast = await fetchJson<{
    list: Array<{
      dt: number;
      main: { temp_min: number; temp_max: number };
      weather: Array<{ description: string; icon: string }>;
    }>;
  }>(forecastUrl.toString());

  const byDate = new Map<
    string,
    { min: number; max: number; icons: string[]; descs: string[] }
  >();
  for (const item of forecast.list) {
    const date = isoDateFromUnix(item.dt);
    const prev = byDate.get(date);
    const icon = item.weather?.[0]?.icon ?? "01d";
    const desc = item.weather?.[0]?.description ?? "unknown";
    if (!prev) {
      byDate.set(date, { min: item.main.temp_min, max: item.main.temp_max, icons: [icon], descs: [desc] });
    } else {
      prev.min = Math.min(prev.min, item.main.temp_min);
      prev.max = Math.max(prev.max, item.main.temp_max);
      prev.icons.push(icon);
      prev.descs.push(desc);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const futureDays = Array.from(byDate.entries())
    .filter(([date]) => date >= today)
    .slice(0, 6) // includes today; client can render separately if desired
    .map(([date, agg]) => ({
      date,
      temp_min: agg.min,
      temp_max: agg.max,
      description: mostCommon(agg.descs),
      icon: mostCommon(agg.icons)
    }));

  // Past days (best-effort): use One Call Time Machine (may require plan). If unavailable, return placeholders.
  const pastDays: WeatherBundle["pastDays"] = [];
  const nowUnix = Math.floor(Date.now() / 1000);
  for (let d = 1; d <= 5; d++) {
    const dt = nowUnix - d * 24 * 60 * 60;
    try {
      const tmUrl = new URL("https://api.openweathermap.org/data/3.0/onecall/timemachine");
      tmUrl.searchParams.set("lat", String(lat));
      tmUrl.searchParams.set("lon", String(lon));
      tmUrl.searchParams.set("dt", String(dt));
      tmUrl.searchParams.set("units", units);
      tmUrl.searchParams.set("appid", env.OPENWEATHER_API_KEY.trim());

      const tm = await fetchJson<{
        data: Array<{
          dt: number;
          temp: number;
          weather: Array<{ description: string; icon: string }>;
        }>;
      }>(tmUrl.toString());

      const temps = tm.data.map((x) => x.temp).filter((t) => typeof t === "number");
      const avg = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : undefined;
      const icons = tm.data.map((x) => x.weather?.[0]?.icon).filter(Boolean) as string[];
      const descs = tm.data.map((x) => x.weather?.[0]?.description).filter(Boolean) as string[];

      pastDays.push({
        date: new Date(dt * 1000).toISOString().slice(0, 10),
        temp_avg: avg,
        icon: icons.length ? mostCommon(icons) : undefined,
        description: descs.length ? mostCommon(descs) : undefined
      });
    } catch {
      pastDays.push({
        date: new Date(dt * 1000).toISOString().slice(0, 10),
        unavailable: true
      });
    }
  }

  const bundle: WeatherBundle = {
    location: { lat, lon },
    current: {
      dt: current.dt,
      temp: current.main.temp,
      feels_like: current.main.feels_like,
      humidity: current.main.humidity,
      wind_speed: current.wind.speed,
      description: current.weather?.[0]?.description ?? "unknown",
      icon: current.weather?.[0]?.icon ?? "01d"
    },
    pastDays,
    futureDays
  };

  cache.set(key, bundle);
  return bundle;
}

function mostCommon(items: string[]) {
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i, (counts.get(i) ?? 0) + 1);
  let best = items[0] ?? "";
  let bestCount = -1;
  for (const [k, v] of counts.entries()) {
    if (v > bestCount) {
      best = k;
      bestCount = v;
    }
  }
  return best;
}


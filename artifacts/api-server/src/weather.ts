import { logger } from "./lib/logger";

/**
 * Clima del viaje con Open-Meteo (gratis, sin clave):
 * - pronóstico real si las fechas caen en los próximos 16 días;
 * - si no, «clima típico»: media de las mismas fechas de los últimos 3 años.
 */

export type StopWeather = {
  city: string;
  startDate: string;
  endDate: string;
  source: "forecast" | "typical";
  avgHigh: number;
  avgLow: number;
  maxTemp: number;
  minTemp: number;
  rainyDays: number;
  totalDays: number;
  /** Solo si el viaje está en curso: condiciones en vivo. */
  current: { temperature: number; apparentTemperature: number; precipitation: number; observedAt: string } | null;
};

type Daily = {
  time?: string[];
  temperature_2m_max?: (number | null)[];
  temperature_2m_min?: (number | null)[];
  precipitation_probability_max?: (number | null)[];
  precipitation_sum?: (number | null)[];
};

const FORECAST_DAYS = 16;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
// Las claves «live» cambian cada 10 min, así que caducan solas.
const cache = new Map<string, { expiresAt: number; value: unknown }>();

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
  return (await response.json()) as T;
}

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  const value = await load();
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  return value;
}

const round = (n: number) => Math.round(n * 10) / 10;
const nums = (list?: (number | null)[]) => (list ?? []).filter((n): n is number => typeof n === "number");

/** Resume datos diarios. Lluvia: probabilidad ≥ 50 % (pronóstico) o ≥ 1 mm (histórico). Exportada para pruebas. */
export function summarizeDaily(daily: Daily, source: StopWeather["source"], yearsAveraged = 1) {
  const highs = nums(daily.temperature_2m_max);
  const lows = nums(daily.temperature_2m_min);
  if (!highs.length || !lows.length) return null;
  const rainyFromProb = nums(daily.precipitation_probability_max).filter((p) => p >= 50).length;
  const rainyFromSum = nums(daily.precipitation_sum).filter((mm) => mm >= 1).length;
  const days = Math.max(1, Math.round((daily.time?.length ?? highs.length) / yearsAveraged));
  return {
    source,
    avgHigh: round(highs.reduce((a, b) => a + b, 0) / highs.length),
    avgLow: round(lows.reduce((a, b) => a + b, 0) / lows.length),
    maxTemp: round(Math.max(...highs)),
    minTemp: round(Math.min(...lows)),
    rainyDays: Math.round((source === "forecast" ? rainyFromProb : rainyFromSum) / yearsAveraged),
    totalDays: days,
  };
}

function shiftYear(iso: string, years: number) {
  const [y, m, d] = iso.split("-");
  const day = m === "02" && d === "29" ? "28" : d;
  return `${Number(y) - years}-${m}-${day}`;
}

const isoToday = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

async function geocodeCity(city: string, language: "en" | "es") {
  const name = city.split(",")[0].trim();
  const country = city.split(",").slice(1).join(",").trim().toLowerCase();
  const data = await cached(`geo|${language}|${city.toLowerCase()}`, () =>
    getJson<{ results?: { latitude: number; longitude: number; country?: string }[] }>(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=${language}&format=json`,
    ));
  const results = data.results ?? [];
  // Si viene el país («Lisboa, Portugal»), preferir esa coincidencia.
  return results.find((r) => country && r.country?.toLowerCase().includes(country)) ?? results[0] ?? null;
}

export async function getStopWeather(params: { city: string; startDate: string; endDate: string; language: "en" | "es" }): Promise<StopWeather | null> {
  try {
    const place = await geocodeCity(params.city, params.language);
    if (!place) return null;
    const { latitude, longitude } = place;
    const lastForecastDay = addDays(isoToday(), FORECAST_DAYS - 1);
    const base = { city: params.city, startDate: params.startDate, endDate: params.endDate };

    if (params.startDate <= lastForecastDay && params.endDate >= isoToday()) {
      const start = params.startDate < isoToday() ? isoToday() : params.startDate;
      const end = params.endDate > lastForecastDay ? lastForecastDay : params.endDate;
      const ongoing = params.startDate <= isoToday();
      type Forecast = { daily?: Daily; current?: { time?: string; temperature_2m?: number; apparent_temperature?: number; precipitation?: number } };
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${start}&end_date=${end}`;
      // En curso: sin caché larga (clima en vivo, 10 min); si no, 6 h.
      const data = ongoing
        ? await cached(`live|${latitude}|${longitude}|${start}|${end}|${Math.floor(Date.now() / 600_000)}`, () =>
            getJson<Forecast>(`${url}&current=temperature_2m,apparent_temperature,precipitation`))
        : await cached(`fc|${latitude}|${longitude}|${start}|${end}`, () => getJson<Forecast>(url));
      const summary = data.daily ? summarizeDaily(data.daily, "forecast") : null;
      const c = data.current;
      const current = ongoing && typeof c?.temperature_2m === "number"
        ? { temperature: round(c.temperature_2m), apparentTemperature: round(c.apparent_temperature ?? c.temperature_2m), precipitation: round(c.precipitation ?? 0), observedAt: c.time ?? new Date().toISOString() }
        : null;
      return summary ? { ...base, ...summary, current } : null;
    }

    // Clima típico: mismas fechas de los 3 años anteriores al viaje.
    const years = [1, 2, 3];
    const series = await Promise.all(years.map((offset) => {
      const start = shiftYear(params.startDate, offset);
      const end = shiftYear(params.endDate, offset);
      return cached(`arch|${latitude}|${longitude}|${start}|${end}`, () =>
        getJson<{ daily?: Daily }>(
          `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&start_date=${start}&end_date=${end}`,
        )).catch(() => ({ daily: undefined }));
    }));
    const merged: Daily = { time: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_sum: [] };
    let usable = 0;
    for (const { daily } of series) {
      if (!daily?.time?.length) continue;
      usable += 1;
      merged.time!.push(...daily.time);
      merged.temperature_2m_max!.push(...(daily.temperature_2m_max ?? []));
      merged.temperature_2m_min!.push(...(daily.temperature_2m_min ?? []));
      merged.precipitation_sum!.push(...(daily.precipitation_sum ?? []));
    }
    const summary = usable ? summarizeDaily(merged, "typical", usable) : null;
    return summary ? { ...base, ...summary, current: null } : null;
  } catch (error) {
    logger.warn({ err: error, city: params.city }, "Weather lookup failed");
    return null;
  }
}

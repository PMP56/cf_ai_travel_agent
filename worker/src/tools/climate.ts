/**
 * Climate normals for a destination in a given month, from Open-Meteo's ERA5
 * archive. Keyless.
 *
 * Trips are planned months ahead, so a 16-day forecast is useless — what the
 * planner needs is "what is April usually like here". We compute that from the
 * same calendar month across the last N complete years.
 *
 * ONE request covers the whole multi-year span and every month is derived from
 * it client-side. The obvious implementation — one request per year — fires 5x
 * the traffic at a free, rate-limited, keyless API and gets throttled in bursts.
 * A single response also means one cache entry serves all twelve months.
 *
 * No LLM involved: plain fetch + arithmetic, unit-testable without a model.
 */

import { cached, TTL } from "../utils/cache";

const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const TIMEOUT_MS = 10000;
const YEARS_SAMPLED = 5;

export interface ClimateNormals {
  month: string;
  yearsSampled: number;
  avgHighC: number;
  avgLowC: number;
  /** Mean total rainfall across the sampled months, in mm. */
  avgPrecipitationMm: number;
  /** Share of days with >1mm rain, 0-1. The number travellers actually feel. */
  rainyDayFraction: number;
  recordHighC: number;
  recordLowC: number;
  /** Mean of daily max wind, km/h. In places like Patagonia this is the story. */
  avgWindKph: number;
  peakWindKph: number;
}

/** Every month's normals from a single fetch, keyed by month name. */
export type ClimateYear = Record<string, ClimateNormals>;

/**
 * Distinguishes "this location genuinely has no archive data" from "the request
 * failed". Collapsing both into null hides rate limiting, which is the failure
 * you actually hit against a free keyless API.
 */
export class ClimateFetchError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ClimateFetchError";
  }
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round1 = (n: number) => Math.round(n * 10) / 10;

interface MonthBucket {
  highs: number[];
  lows: number[];
  winds: number[];
  precipByYear: Map<number, number[]>;
}

/**
 * Fetch the full multi-year archive and derive normals for all twelve months.
 * Cache this per (lat, lon) — normals do not change between requests.
 *
 * @throws ClimateFetchError when the request fails or returns nothing usable.
 */
export async function getClimateYear(
  latitude: number,
  longitude: number,
  timezone = "UTC"
): Promise<ClimateYear> {
  // One fetch already yields all twelve months, so this is purely about not
  // repeating a five-year archive pull for a destination seen recently.
  const key = `climate:${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
  return cached(key, TTL.climate, () => fetchClimateYear(latitude, longitude, timezone));
}

async function fetchClimateYear(
  latitude: number,
  longitude: number,
  timezone: string
): Promise<ClimateYear> {
  // ERA5 lags real time, so never sample the current year.
  const lastCompleteYear = new Date().getUTCFullYear() - 1;
  const firstYear = lastCompleteYear - (YEARS_SAMPLED - 1);

  const url =
    `${ARCHIVE_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&start_date=${firstYear}-01-01&end_date=${lastCompleteYear}-12-31` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max` +
    `&timezone=${encodeURIComponent(timezone)}`;

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    throw new ClimateFetchError(`archive request failed: ${String(err)}`);
  }

  if (!res.ok) {
    throw new ClimateFetchError(
      res.status === 429 ? "archive rate limited" : `archive returned ${res.status}`,
      res.status
    );
  }

  const data = (await res.json()) as {
    daily?: {
      time?: unknown;
      temperature_2m_max?: unknown;
      temperature_2m_min?: unknown;
      precipitation_sum?: unknown;
      wind_speed_10m_max?: unknown;
    };
  };

  const time = data?.daily?.time;
  const maxima = data?.daily?.temperature_2m_max;
  const minima = data?.daily?.temperature_2m_min;
  const precip = data?.daily?.precipitation_sum;
  const wind = data?.daily?.wind_speed_10m_max;

  if (!Array.isArray(time) || !Array.isArray(maxima) || !Array.isArray(minima)) {
    throw new ClimateFetchError("archive returned no daily series");
  }

  const buckets = new Map<number, MonthBucket>();

  for (let i = 0; i < time.length; i++) {
    const day = time[i];
    if (typeof day !== "string" || day.length < 7) continue;

    const year = Number(day.slice(0, 4));
    const month = Number(day.slice(5, 7));
    if (!month || month < 1 || month > 12) continue;

    const high = maxima[i];
    const low = minima[i];
    if (typeof high !== "number" || typeof low !== "number") continue;
    if (!Number.isFinite(high) || !Number.isFinite(low)) continue;

    let bucket = buckets.get(month);
    if (!bucket) {
      bucket = { highs: [], lows: [], winds: [], precipByYear: new Map() };
      buckets.set(month, bucket);
    }

    bucket.highs.push(high);
    bucket.lows.push(low);

    const kph = Array.isArray(wind) ? wind[i] : undefined;
    if (typeof kph === "number" && Number.isFinite(kph)) bucket.winds.push(kph);

    const mm = Array.isArray(precip) ? precip[i] : undefined;
    if (typeof mm === "number" && Number.isFinite(mm)) {
      const forYear = bucket.precipByYear.get(year) ?? [];
      forYear.push(mm);
      bucket.precipByYear.set(year, forYear);
    }
  }

  if (buckets.size === 0) {
    throw new ClimateFetchError("archive has no usable data for this location");
  }

  const result: ClimateYear = {};

  for (const [monthNumber, bucket] of buckets) {
    const name = MONTH_NAMES[monthNumber - 1];
    const yearTotals: number[] = [];
    let rainyDays = 0;
    let totalDays = 0;

    for (const days of bucket.precipByYear.values()) {
      yearTotals.push(days.reduce((a, b) => a + b, 0));
      rainyDays += days.filter((mm) => mm > 1).length;
      totalDays += days.length;
    }

    result[name] = {
      month: name,
      yearsSampled: bucket.precipByYear.size || YEARS_SAMPLED,
      avgHighC: round1(mean(bucket.highs)),
      avgLowC: round1(mean(bucket.lows)),
      avgPrecipitationMm: yearTotals.length ? Math.round(mean(yearTotals)) : 0,
      rainyDayFraction: totalDays ? Math.round((rainyDays / totalDays) * 100) / 100 : 0,
      recordHighC: round1(Math.max(...bucket.highs)),
      recordLowC: round1(Math.min(...bucket.lows)),
      avgWindKph: bucket.winds.length ? round1(mean(bucket.winds)) : 0,
      peakWindKph: bucket.winds.length ? round1(Math.max(...bucket.winds)) : 0,
    };
  }

  return result;
}

/**
 * Normals for one month. Returns null only when the month name is unrecognised
 * or that month is genuinely absent from the archive — a failed *request*
 * throws, so callers can tell the two apart and retry or degrade knowingly.
 */
export async function getClimateNormals(
  latitude: number,
  longitude: number,
  monthName: string,
  timezone = "UTC"
): Promise<ClimateNormals | null> {
  const name = MONTH_NAMES.find(
    (m) => m.toLowerCase() === monthName.trim().toLowerCase()
  );
  if (!name) return null;

  const year = await getClimateYear(latitude, longitude, timezone);
  return year[name] ?? null;
}

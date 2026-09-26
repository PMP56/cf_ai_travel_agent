/**
 * Destination -> real coordinates, via Open-Meteo's geocoding API.
 * Keyless, no rate limit published, no attribution requirement.
 *
 * No LLM involved: this is a plain fetch so it can be tested without a model.
 */

import { cached, TTL } from "../utils/cache";

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const TIMEOUT_MS = 5000;

export interface ResolvedPlace {
  name: string;
  country: string;
  countryCode: string;
  admin1: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  population: number | null;
}

interface GeocodeResult {
  name?: unknown;
  country?: unknown;
  country_code?: unknown;
  admin1?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  timezone?: unknown;
  population?: unknown;
}

function toPlace(r: GeocodeResult): ResolvedPlace | null {
  if (
    typeof r.name !== "string" ||
    typeof r.latitude !== "number" ||
    typeof r.longitude !== "number"
  ) {
    return null;
  }
  return {
    name: r.name,
    country: typeof r.country === "string" ? r.country : "",
    countryCode: typeof r.country_code === "string" ? r.country_code : "",
    admin1: typeof r.admin1 === "string" ? r.admin1 : null,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: typeof r.timezone === "string" ? r.timezone : "UTC",
    population: typeof r.population === "number" ? r.population : null,
  };
}

/**
 * Resolve a place name. Returns the candidates ranked most-populous first,
 * because the API happily returns Kyoto, Tanzania (pop. unknown) alongside
 * Kyoto, Japan (pop. 1.46M) and order is not guaranteed.
 *
 * Callers take [0] but keep the rest: an ambiguous destination is exactly the
 * case where the UI should show ChoiceChips rather than guess.
 */
export async function geocodeDestination(
  query: string,
  count = 5
): Promise<ResolvedPlace[]> {
  return cached(`geocode:${query.toLowerCase()}:${count}`, TTL.geocode, () =>
    fetchGeocode(query, count)
  );
}

async function fetchGeocode(query: string, count: number): Promise<ResolvedPlace[]> {
  const url =
    `${GEOCODE_URL}?name=${encodeURIComponent(query)}` +
    `&count=${count}&language=en&format=json`;

  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) return [];

  const data = (await res.json()) as { results?: unknown };
  if (!Array.isArray(data?.results)) return [];

  return data.results
    .map(toPlace)
    .filter((p): p is ResolvedPlace => p !== null)
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0));
}

/**
 * Notable, visitable places near a coordinate — keyless, from Wikipedia.
 *
 * Why not OSM/Overpass: it is a map database, not a curated attraction list.
 * Everything is weighted equally, so a municipal records office outranks
 * Kinkaku-ji, and `name` is in the local script. Filtering to wikidata-tagged
 * POIs mostly returns hotels.
 *
 * Why not raw Wikipedia geosearch: it returns every geotagged article,
 * including battles, famines and fire stations.
 *
 * What works is geosearch for candidates plus PAGEVIEWS as the notability
 * signal. Measured for Kyoto: Fushimi Inari 428/day, Kiyomizu-dera 340,
 * Kinkaku-ji 306 — against Yowa famine 6 and the City Fire Department 2.
 * Roughly a 100x separation between attractions and noise.
 *
 * Three batched calls per destination, regardless of how many candidates.
 * No LLM involved.
 */

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const USER_AGENT = "ai-travel-agent/0.2 (https://travel-agent-111.pages.dev/)";
const TIMEOUT_MS = 10000;

/** Wikipedia's extracts endpoint caps at 20 titles per request. */
const EXTRACT_BATCH = 20;
const PAGEVIEW_BATCH = 50;

export interface NotablePlace {
  title: string;
  latitude: number;
  longitude: number;
  distanceM: number;
  /** Mean daily Wikipedia pageviews over the last 30 days. The ranking signal. */
  viewsPerDay: number;
  summary: string;
  url: string;
}

/**
 * Geotagged articles that are not places you can visit. Pageviews alone do not
 * remove these — "Battle of X" can be popular — so they go by title shape.
 */
const NON_PLACE_PREFIXES = [
  "list of", "timeline of", "history of", "battle of", "siege of",
  "economy of", "culture of", "demographics of", "geography of",
  "transport in", "education in", "tourism in", "climate of",
  "outline of", "index of", "bibliography of",
];

const NON_PLACE_SUFFIXES = [
  " famine", " rebellion", " incident", " massacre", " earthquake",
  " uprising", " conspiracy", " dynasty", " period", " era",
  " bombing", " attack", " shooting", " riot", " protest", " election",
];

/** Government and civic bodies are geotagged but are not attractions. */
const INSTITUTION_TERMS = [
  "parliament", "cabinet of", "ministry of", "central bank", "embassy of",
  "supreme court", "city council", "agency for", "fire department",
  "police department", "prison", "constituency", "diocese of",
  "althing", "capital region", "airport", "stadium", "town hall",
];

function isVisitable(title: string, destinationName: string): boolean {
  const t = title.toLowerCase().trim();
  if (t === destinationName.toLowerCase().trim()) return false;
  if (NON_PLACE_PREFIXES.some((p) => t.startsWith(p))) return false;
  if (NON_PLACE_SUFFIXES.some((s) => t.endsWith(s))) return false;
  // "2011 Marrakesh bombing" — a dated event, not a destination.
  if (/^\d{4}[\s\u2013\u2014-]/.test(t)) return false;
  if (INSTITUTION_TERMS.some((k) => t.includes(k))) return false;
  if (t.includes("(disambiguation)")) return false;
  return true;
}

/**
 * POST rather than GET: a batch of 50 titles can blow past URL-length limits,
 * and MediaWiki accepts POST for read queries.
 */
async function wikiCall(params: Record<string, string>): Promise<any> {
  const body = new URLSearchParams({
    format: "json",
    formatversion: "2",
    ...params,
  });

  const res = await fetch(WIKI_API, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`Wikipedia API returned ${res.status}`);

  const data = await res.json();
  if ((data as any)?.error) {
    throw new Error(`Wikipedia API error: ${(data as any).error.info ?? "unknown"}`);
  }
  return data;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Wikipedia's geosearch radius is capped at 10km, which is fine for a city but
 * useless for a region: El Calafate's actual draw is Perito Moreno Glacier,
 * 50km away. Wider areas are covered by tiling overlapping 10km searches in
 * rings around the centre. Calls are parallel and cheap (~150ms each).
 */
const GEOSEARCH_MAX_RADIUS_M = 10000;

function searchPoints(
  latitude: number,
  longitude: number,
  desiredRadiusM: number
): { lat: number; lon: number }[] {
  if (desiredRadiusM <= GEOSEARCH_MAX_RADIUS_M) return [{ lat: latitude, lon: longitude }];

  const points = [{ lat: latitude, lon: longitude }];
  const ringsNeeded = Math.min(2, Math.ceil(desiredRadiusM / 18000));
  const latDegPerKm = 1 / 111;
  const lonDegPerKm = 1 / (111 * Math.max(Math.cos((latitude * Math.PI) / 180), 0.05));

  for (let ring = 1; ring <= ringsNeeded; ring++) {
    const distanceKm = ring * 18;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      points.push({
        lat: latitude + distanceKm * Math.sin(angle) * latDegPerKm,
        lon: longitude + distanceKm * Math.cos(angle) * lonDegPerKm,
      });
    }
  }

  return points;
}

/** Step 1 — candidates near the point. */
async function geosearch(
  latitude: number,
  longitude: number,
  radiusM: number,
  limit: number
): Promise<{ title: string; lat: number; lon: number; dist: number }[]> {
  const data = await wikiCall({
    action: "query",
    list: "geosearch",
    gscoord: `${latitude}|${longitude}`,
    gsradius: String(radiusM),
    gslimit: String(limit),
  });

  const results = data?.query?.geosearch;
  if (!Array.isArray(results)) return [];

  return results.filter(
    (r: any) =>
      typeof r?.title === "string" &&
      typeof r?.lat === "number" &&
      typeof r?.lon === "number"
  );
}

/** Step 2 — notability, batched. */
async function pageviews(titles: string[]): Promise<Map<string, number>> {
  const views = new Map<string, number>();

  const groups = chunk(titles, PAGEVIEW_BATCH);
  const batches = await Promise.all(
    groups.map((group) =>
      wikiCall({
        action: "query",
        prop: "pageviews",
        pvipdays: "30",
        titles: group.join("|"),
      }).catch((err) => {
        // Loud, because a dropped batch silently demotes real attractions to
        // zero views and they then fail the notability threshold.
        console.error(`Pageview batch of ${group.length} failed: ${err}`);
        return null;
      })
    )
  );

  const failed = batches.filter((b) => b === null).length;
  if (failed > 0 && failed === groups.length) {
    throw new Error("All pageview batches failed; cannot rank places");
  }

  for (const data of batches) {
    for (const page of data?.query?.pages ?? []) {
      const daily = Object.values(page?.pageviews ?? {}).filter(
        (v): v is number => typeof v === "number"
      );
      if (typeof page?.title === "string" && daily.length > 0) {
        views.set(page.title, Math.round(daily.reduce((a, b) => a + b, 0) / daily.length));
      }
    }
  }

  return views;
}

/** Step 3 — descriptions for the winners, batched. */
async function summaries(titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();

  const batches = await Promise.all(
    chunk(titles, EXTRACT_BATCH).map((group: string[]) =>
      wikiCall({
        action: "query",
        prop: "extracts",
        exintro: "1",
        explaintext: "1",
        titles: group.join("|"),
      }).catch((err) => {
        console.error(`Extract batch of ${group.length} failed: ${err}`);
        return null;
      })
    )
  );

  for (const data of batches) {
    for (const page of data?.query?.pages ?? []) {
      if (typeof page?.title === "string" && typeof page?.extract === "string") {
        // First two sentences is plenty for a prompt, and keeps output tokens down.
        const trimmed = page.extract.replace(/\s+/g, " ").trim();
        const cut = trimmed.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
        out.set(page.title, cut.slice(0, 400));
      }
    }
  }

  return out;
}

export interface FindPlacesOptions {
  /**
   * Search radius in metres. 15km suits a city. Small or remote towns need far
   * more — El Calafate's draw is Perito Moreno Glacier, 50km away — so callers
   * should widen this when population is low. See radiusForPopulation().
   */
  radiusM?: number;
  /** How many places to return. */
  limit?: number;
  /** Discard anything below this many daily views. Noise sits under ~20. */
  minViewsPerDay?: number;
  /** Used to drop the destination's own article from the results. */
  destinationName?: string;
}

export async function findNotablePlaces(
  latitude: number,
  longitude: number,
  {
    radiusM = 15000,
    limit = 20,
    minViewsPerDay = 20,
    destinationName = "",
  }: FindPlacesOptions = {}
): Promise<NotablePlace[]> {
  // 500 is the API maximum and it matters: geosearch returns NEAREST-first, so
  // a 100-candidate cap never escapes a dense city centre. At 100, Kyoto
  // returned none of Kinkaku-ji, Fushimi Inari or Kiyomizu-dera; at 500 it
  // returns 429 candidates spanning the full radius and finds all of them.
  const tiles = await Promise.all(
    searchPoints(latitude, longitude, radiusM).map((pt) =>
      geosearch(pt.lat, pt.lon, GEOSEARCH_MAX_RADIUS_M, 500).catch(() => [])
    )
  );

  // Tiles overlap, so the same article can arrive several times; keep the
  // sighting closest to the true centre.
  const byTitle = new Map<string, { title: string; lat: number; lon: number; dist: number }>();
  for (const tile of tiles) {
    for (const c of tile) {
      const existing = byTitle.get(c.title);
      if (!existing || c.dist < existing.dist) byTitle.set(c.title, c);
    }
  }

  const visitable = [...byTitle.values()].filter((c) => isVisitable(c.title, destinationName));
  if (visitable.length === 0) return [];

  const views = await pageviews(visitable.map((c) => c.title));

  const ranked = visitable
    .map((c) => ({ ...c, views: views.get(c.title) ?? 0 }))
    .filter((c) => c.views >= minViewsPerDay)
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);

  if (ranked.length === 0) return [];

  const extracts = await summaries(ranked.map((c) => c.title));

  return ranked.map((c) => ({
    title: c.title,
    latitude: c.lat,
    longitude: c.lon,
    distanceM: Math.round(c.dist),
    viewsPerDay: c.views,
    summary: extracts.get(c.title) ?? "",
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(c.title.replace(/ /g, "_"))}`,
  }));
}

/**
 * A sensible search radius for a destination's size. A metropolis is its own
 * attraction set; a small town is a base for things well outside it.
 */
export function radiusForPopulation(population: number | null): number {
  if (population === null || population < 20000) return 60000;
  if (population < 200000) return 30000;
  return 15000;
}

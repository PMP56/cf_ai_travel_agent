/**
 * Geographic clustering for itineraries.
 *
 * The single most common failure in a generated itinerary is zigzagging: a day
 * that sends you across the city and back because the model grouped places by
 * theme rather than by location. That is arithmetic, not judgement, so it is
 * done here in code — deterministic, free, and testable without a model or a
 * network call. The composer then supplies narrative and ordering *within* the
 * groups this produces.
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function centroidOf(points: GeoPoint[]): GeoPoint {
  if (points.length === 0) return { latitude: 0, longitude: 0 };
  const lat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
  const lon = points.reduce((sum, p) => sum + p.longitude, 0) / points.length;
  return { latitude: lat, longitude: lon };
}

export interface DayCluster<T extends GeoPoint> {
  places: T[];
  centroid: GeoPoint;
  /** Greatest distance between any two places in the group, km. */
  spreadKm: number;
}

function spreadOf<T extends GeoPoint>(places: T[]): number {
  let max = 0;
  for (let i = 0; i < places.length; i++) {
    for (let j = i + 1; j < places.length; j++) {
      const d = haversineKm(places[i], places[j]);
      if (d > max) max = d;
    }
  }
  return Math.round(max * 10) / 10;
}

/**
 * Group places into compact, evenly-sized days.
 *
 * Deliberately greedy rather than k-means: k-means optimises for tight
 * clusters but happily produces one day with six stops and another with one,
 * which is useless for an itinerary. This instead seeds each day from the
 * farthest unassigned place — the outliers that most need their own trip —
 * and fills it with that place's nearest unassigned neighbours. The result is
 * balanced by construction and fully deterministic.
 */
export function clusterByDay<T extends GeoPoint>(
  places: T[],
  dayCount: number
): DayCluster<T>[] {
  if (places.length === 0 || dayCount <= 0) return [];

  const days = Math.min(dayCount, places.length);
  const anchor = centroidOf(places);

  const remaining = [...places];
  const clusters: DayCluster<T>[] = [];

  for (let day = 0; day < days && remaining.length > 0; day++) {
    // Seed from the most remote remaining place: distant sights dictate the
    // shape of a day, so they should choose their companions rather than be
    // swept up as leftovers.
    let seedIndex = 0;
    let seedDistance = -1;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(anchor, remaining[i]);
      if (d > seedDistance) {
        seedDistance = d;
        seedIndex = i;
      }
    }

    const seed = remaining.splice(seedIndex, 1)[0];
    const group: T[] = [seed];

    // Re-divide what is left across the days still to fill. A fixed quota
    // front-loads: reserving only one place per remaining day gave Kyoto
    // 3/3/3/1/1 instead of 3/2/2/2/2.
    const daysLeft = days - day;
    const target = Math.ceil((remaining.length + 1) / daysLeft);
    const slots = Math.max(0, Math.min(target - 1, remaining.length - (daysLeft - 1)));
    for (let n = 0; n < slots; n++) {
      let bestIndex = -1;
      let bestDistance = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const d = haversineKm(seed, remaining[i]);
        if (d < bestDistance) {
          bestDistance = d;
          bestIndex = i;
        }
      }
      if (bestIndex < 0) break;
      group.push(remaining.splice(bestIndex, 1)[0]);
    }

    clusters.push({
      places: group,
      centroid: centroidOf(group),
      spreadKm: spreadOf(group),
    });
  }

  // Anything left over (rounding) joins the nearest existing day.
  for (const leftover of remaining) {
    let best = clusters[0];
    let bestDistance = Infinity;
    for (const cluster of clusters) {
      const d = haversineKm(cluster.centroid, leftover);
      if (d < bestDistance) {
        bestDistance = d;
        best = cluster;
      }
    }
    best.places.push(leftover);
    best.centroid = centroidOf(best.places);
    best.spreadKm = spreadOf(best.places);
  }

  return clusters;
}

/**
 * Order days so consecutive ones are near each other — a cheap nearest-
 * neighbour tour from the traveller's base. Avoids sending someone north on
 * day 2, south on day 3 and north again on day 4.
 */
export function orderClusters<T extends GeoPoint>(
  clusters: DayCluster<T>[],
  start: GeoPoint
): DayCluster<T>[] {
  const remaining = [...clusters];
  const ordered: DayCluster<T>[] = [];
  let current = start;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i].centroid);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    }
    const next = remaining.splice(bestIndex, 1)[0];
    ordered.push(next);
    current = next.centroid;
  }

  return ordered;
}

/** How many sights a day should hold at each pace. */
export function placesPerDay(pace: "relaxed" | "moderate" | "packed" | null): number {
  if (pace === "relaxed") return 2;
  if (pace === "packed") return 4;
  return 3;
}

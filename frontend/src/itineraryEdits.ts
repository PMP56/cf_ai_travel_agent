import type { CuratedPlace, Itinerary, ItineraryDay } from "./types";

/**
 * Local edits to a generated itinerary.
 *
 * Moving a stop changes the distances, so every operation recomputes them —
 * showing a stale kilometre figure next to a rearranged day would undermine the
 * one thing this interface promises, which is that the numbers are real.
 *
 * Mirrors haversineKm in worker/src/tools/cluster.ts. Duplicated rather than
 * shared because the two packages have no common module; see the type
 * duplication note in docs/PROGRESS.md.
 */

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function pathKm(places: CuratedPlace[]): number {
  let total = 0;
  for (let i = 0; i < places.length - 1; i++) total += haversineKm(places[i], places[i + 1]);
  return Math.round(total * 10) / 10;
}

function rebuild(days: ItineraryDay[], unscheduledDays: number, droppedForPace: number): Itinerary {
  // Drop days emptied by a move, then renumber so the list stays contiguous.
  const kept = days
    .filter((d) => d.places.length > 0)
    .map((d, i) => ({ ...d, day: i + 1, travelKm: pathKm(d.places) }));

  return {
    days: kept,
    unscheduledDays: unscheduledDays + (days.length - kept.length),
    droppedForPace,
    totalTravelKm: Math.round(kept.reduce((sum, d) => sum + d.travelKm, 0) * 10) / 10,
  };
}

/** Move a stop up or down within its day. */
export function reorderWithinDay(
  itinerary: Itinerary,
  dayNumber: number,
  index: number,
  direction: -1 | 1
): Itinerary {
  const days = itinerary.days.map((day) => {
    if (day.day !== dayNumber) return day;
    const target = index + direction;
    if (target < 0 || target >= day.places.length) return day;
    const places = [...day.places];
    [places[index], places[target]] = [places[target], places[index]];
    return { ...day, places };
  });
  return rebuild(days, itinerary.unscheduledDays, itinerary.droppedForPace);
}

/** Move a stop to a different day, appended at the end of that day. */
export function moveToDay(
  itinerary: Itinerary,
  fromDay: number,
  index: number,
  toDay: number
): Itinerary {
  if (fromDay === toDay) return itinerary;

  const moving = itinerary.days.find((d) => d.day === fromDay)?.places[index];
  if (!moving) return itinerary;

  const days = itinerary.days.map((day) => {
    if (day.day === fromDay) {
      return { ...day, places: day.places.filter((_, i) => i !== index) };
    }
    if (day.day === toDay) {
      return { ...day, places: [...day.places, moving] };
    }
    return day;
  });

  return rebuild(days, itinerary.unscheduledDays, itinerary.droppedForPace);
}

/** Drop a stop from the plan entirely. */
export function removePlace(
  itinerary: Itinerary,
  dayNumber: number,
  index: number
): Itinerary {
  const days = itinerary.days.map((day) =>
    day.day === dayNumber
      ? { ...day, places: day.places.filter((_, i) => i !== index) }
      : day
  );
  return rebuild(days, itinerary.unscheduledDays, itinerary.droppedForPace);
}

/** Swap a stop for one the planner found but did not schedule. */
export function swapPlace(
  itinerary: Itinerary,
  dayNumber: number,
  index: number,
  replacement: CuratedPlace
): Itinerary {
  const days = itinerary.days.map((day) =>
    day.day === dayNumber
      ? {
          ...day,
          places: day.places.map((p, i) => (i === index ? replacement : p)),
        }
      : day
  );
  return rebuild(days, itinerary.unscheduledDays, itinerary.droppedForPace);
}

/** Places the planner found but that no day currently includes. */
export function unusedPlaces(
  itinerary: Itinerary,
  allPlaces: CuratedPlace[]
): CuratedPlace[] {
  const scheduled = new Set(
    itinerary.days.flatMap((d) => d.places.map((p) => p.title))
  );
  return allPlaces.filter((p) => !scheduled.has(p.title));
}

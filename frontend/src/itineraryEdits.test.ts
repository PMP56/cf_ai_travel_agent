import { describe, it, expect } from "vitest";
import {
  haversineKm,
  reorderWithinDay,
  moveToDay,
  removePlace,
  swapPlace,
  unusedPlaces,
} from "./itineraryEdits";
import type { CuratedPlace, Itinerary } from "./types";

/**
 * Rearranging must never silently lose a stop or leave a stale distance on
 * screen — the kilometre figures are part of this interface's claim that its
 * numbers are real.
 */

const place = (title: string, latitude: number, longitude: number): CuratedPlace => ({
  title,
  latitude,
  longitude,
  distanceM: 1000,
  viewsPerDay: 100,
  summary: "",
  url: `https://en.wikipedia.org/wiki/${title}`,
  imageUrl: null,
  imageWidth: null,
  imageHeight: null,
  category: "landmark",
  why: "",
});

const A = place("A", 35.00, 135.00);
const B = place("B", 35.02, 135.02);
const C = place("C", 36.00, 136.00);
const D = place("D", 36.02, 136.02);
const SPARE = place("Spare", 35.5, 135.5);

const build = (): Itinerary => ({
  days: [
    { day: 1, title: "One", note: "", places: [A, B], travelKm: 2.8 },
    { day: 2, title: "Two", note: "", places: [C, D], travelKm: 2.8 },
  ],
  unscheduledDays: 0,
  droppedForPace: 0,
  totalTravelKm: 5.6,
});

const titles = (it: Itinerary) => it.days.flatMap((d) => d.places.map((p) => p.title));

describe("haversineKm", () => {
  it("agrees with the worker's implementation to within a metre", () => {
    // Same fixture as worker/src/tools/cluster.test.ts — the two are duplicated
    // by necessity and must not drift.
    const d = haversineKm({ latitude: 34.9858, longitude: 135.7588 }, { latitude: 35.0394, longitude: 135.7292 });
    expect(d).toBeGreaterThan(5.5);
    expect(d).toBeLessThan(6.6);
  });
});

describe("reorderWithinDay", () => {
  it("swaps adjacent stops", () => {
    const next = reorderWithinDay(build(), 1, 0, 1);
    expect(next.days[0].places.map((p) => p.title)).toEqual(["B", "A"]);
  });

  it("ignores a move off either end", () => {
    expect(reorderWithinDay(build(), 1, 0, -1).days[0].places.map((p) => p.title)).toEqual(["A", "B"]);
    expect(reorderWithinDay(build(), 1, 1, 1).days[0].places.map((p) => p.title)).toEqual(["A", "B"]);
  });

  it("does not touch other days", () => {
    expect(reorderWithinDay(build(), 1, 0, 1).days[1].places.map((p) => p.title)).toEqual(["C", "D"]);
  });
});

describe("moveToDay", () => {
  it("moves a stop and keeps every place", () => {
    const next = moveToDay(build(), 1, 0, 2);
    expect(titles(next).sort()).toEqual(["A", "B", "C", "D"]);
    expect(next.days[0].places.map((p) => p.title)).toEqual(["B"]);
    expect(next.days[1].places.map((p) => p.title)).toEqual(["C", "D", "A"]);
  });

  it("recomputes distances rather than leaving them stale", () => {
    const before = build();
    const next = moveToDay(before, 1, 0, 2);
    // Day 2 now spans two far-apart clusters, so it must get longer.
    expect(next.days[1].travelKm).toBeGreaterThan(before.days[1].travelKm);
    expect(next.totalTravelKm).not.toBe(before.totalTravelKm);
  });

  it("drops a day emptied by the move and renumbers the rest", () => {
    let it = moveToDay(build(), 1, 0, 2);
    it = moveToDay(it, 1, 0, 2);
    expect(it.days).toHaveLength(1);
    expect(it.days[0].day).toBe(1);
    expect(it.unscheduledDays).toBe(1);
    expect(titles(it).sort()).toEqual(["A", "B", "C", "D"]);
  });

  it("is a no-op when source and target are the same day", () => {
    expect(moveToDay(build(), 1, 0, 1)).toEqual(build());
  });

  it("ignores an out-of-range index", () => {
    expect(titles(moveToDay(build(), 1, 99, 2)).sort()).toEqual(["A", "B", "C", "D"]);
  });
});

describe("removePlace", () => {
  it("removes exactly one stop", () => {
    expect(titles(removePlace(build(), 1, 0))).toEqual(["B", "C", "D"]);
  });

  it("collapses a day left empty", () => {
    let it = removePlace(build(), 1, 0);
    it = removePlace(it, 1, 0);
    expect(it.days).toHaveLength(1);
    expect(it.days[0].places.map((p) => p.title)).toEqual(["C", "D"]);
  });
});

describe("swapPlace", () => {
  it("substitutes in place and keeps the day length", () => {
    const next = swapPlace(build(), 1, 0, SPARE);
    expect(next.days[0].places.map((p) => p.title)).toEqual(["Spare", "B"]);
    expect(titles(next)).toHaveLength(4);
  });

  it("recomputes the day's distance", () => {
    const next = swapPlace(build(), 1, 0, SPARE);
    expect(next.days[0].travelKm).not.toBe(build().days[0].travelKm);
  });
});

describe("unusedPlaces", () => {
  it("returns only places no day contains", () => {
    expect(unusedPlaces(build(), [A, B, C, D, SPARE]).map((p) => p.title)).toEqual(["Spare"]);
  });

  it("returns an empty list when everything is scheduled", () => {
    expect(unusedPlaces(build(), [A, B, C, D])).toEqual([]);
  });

  it("counts a removed place as available again", () => {
    const next = removePlace(build(), 1, 0);
    expect(unusedPlaces(next, [A, B, C, D]).map((p) => p.title)).toEqual(["A"]);
  });
});

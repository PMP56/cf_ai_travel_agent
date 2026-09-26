import { describe, it, expect } from "vitest";
import {
  haversineKm,
  centroidOf,
  clusterByDay,
  orderClusters,
  placesPerDay,
} from "./cluster";

/**
 * Clustering is pure arithmetic with no network and no model, so it is the one
 * part of the pipeline that can be pinned down exactly. These cases encode the
 * bugs that actually happened rather than hypothetical ones.
 */

const pt = (latitude: number, longitude: number, id = "") => ({ latitude, longitude, id });

describe("haversineKm", () => {
  it("is zero for a point to itself", () => {
    expect(haversineKm(pt(35, 135), pt(35, 135))).toBe(0);
  });

  it("matches a known distance", () => {
    // Kyoto Station to Kinkaku-ji is roughly 6km.
    const d = haversineKm(pt(34.9858, 135.7588), pt(35.0394, 135.7292));
    expect(d).toBeGreaterThan(5.5);
    expect(d).toBeLessThan(6.6);
  });

  it("is symmetric", () => {
    const a = pt(51.5, -0.12);
    const b = pt(48.85, 2.35);
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9);
  });

  it("handles the antimeridian without producing a tiny distance", () => {
    // 1 degree apart across the date line, near the equator: ~111km, not ~0.
    const d = haversineKm(pt(0, 179.5), pt(0, -179.5));
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });
});

describe("centroidOf", () => {
  it("returns the mean position", () => {
    const c = centroidOf([pt(0, 0), pt(10, 20)]);
    expect(c.latitude).toBeCloseTo(5);
    expect(c.longitude).toBeCloseTo(10);
  });

  it("does not throw on an empty list", () => {
    expect(centroidOf([])).toEqual({ latitude: 0, longitude: 0 });
  });
});

describe("clusterByDay", () => {
  // A ring of points so no grouping is trivially obvious.
  const ring = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      pt(35 + Math.sin((i / n) * Math.PI * 2) * 0.05, 135.7 + Math.cos((i / n) * Math.PI * 2) * 0.05, `p${i}`)
    );

  it.each([
    [11, 5],
    [10, 5],
    [12, 4],
    [7, 5],
    [20, 7],
    [6, 6],
  ])("keeps every place and stays balanced: %i places over %i days", (n, days) => {
    const clusters = clusterByDay(ring(n), days);
    const sizes = clusters.map((c) => c.places.length);
    const total = sizes.reduce((a, b) => a + b, 0);

    expect(total).toBe(n);
    // The regression this guards: the original slot formula produced 3/3/3/1/1
    // for 11 places over 5 days because it reserved only one place per
    // remaining day instead of a fair share.
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  it("never loses a place to rounding", () => {
    const places = ring(13);
    const seen = clusterByDay(places, 4).flatMap((c) => c.places.map((p) => p.id));
    expect(new Set(seen).size).toBe(13);
  });

  it("returns fewer days than asked when places run out", () => {
    expect(clusterByDay(ring(3), 10)).toHaveLength(3);
  });

  it("handles degenerate input", () => {
    expect(clusterByDay([], 5)).toEqual([]);
    expect(clusterByDay(ring(4), 0)).toEqual([]);
    expect(clusterByDay(ring(1), 3)).toHaveLength(1);
  });

  it("groups nearby places together rather than by input order", () => {
    // Two tight clusters 100km apart, interleaved in the input.
    const places = [
      pt(35.00, 135.00, "a1"), pt(36.00, 136.00, "b1"),
      pt(35.01, 135.01, "a2"), pt(36.01, 136.01, "b2"),
    ];
    const clusters = clusterByDay(places, 2);
    for (const cluster of clusters) {
      const prefixes = cluster.places.map((p) => p.id[0]);
      expect(new Set(prefixes).size).toBe(1);
    }
  });

  it("reports spread as the widest gap inside a day", () => {
    const clusters = clusterByDay([pt(0, 0, "x"), pt(0, 1, "y")], 1);
    expect(clusters[0].spreadKm).toBeGreaterThan(100);
  });
});

describe("orderClusters", () => {
  it("visits the nearest group first", () => {
    const near = clusterByDay([pt(35.00, 135.00, "near")], 1)[0];
    const far = clusterByDay([pt(36.00, 136.00, "far")], 1)[0];
    const ordered = orderClusters([far, near], { latitude: 35, longitude: 135 });
    expect(ordered[0].places[0].id).toBe("near");
  });

  it("keeps every cluster", () => {
    const clusters = clusterByDay(
      Array.from({ length: 9 }, (_, i) => pt(35 + i * 0.01, 135 + i * 0.01, `p${i}`)),
      3
    );
    expect(orderClusters(clusters, { latitude: 35, longitude: 135 })).toHaveLength(3);
  });
});

describe("placesPerDay", () => {
  it("increases with pace", () => {
    expect(placesPerDay("relaxed")).toBeLessThan(placesPerDay("moderate"));
    expect(placesPerDay("moderate")).toBeLessThan(placesPerDay("packed"));
  });

  it("treats an unstated pace as moderate", () => {
    expect(placesPerDay(null)).toBe(placesPerDay("moderate"));
  });
});

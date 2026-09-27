import { describe, it, expect } from "vitest";
import { monthComfort, bestMonths } from "./monthComfort";
import type { ClimateNormals } from "./types";

const m = (over: Partial<ClimateNormals>): ClimateNormals => ({
  month: "April", yearsSampled: 5,
  avgHighC: 20, avgLowC: 10, avgPrecipitationMm: 80, rainyDayFraction: 0.25,
  recordHighC: 28, recordLowC: 3, avgWindKph: 14, peakWindKph: 35,
  ...over,
});

describe("monthComfort", () => {
  it("calls a mild dry month ideal", () => {
    expect(monthComfort(m({})).comfort).toBe("ideal");
  });

  it("penalises real heat, and says so", () => {
    const v = monthComfort(m({ avgHighC: 34, avgLowC: 25 }));
    expect(v.comfort).toBe("harsh");
    expect(v.reason).toMatch(/34°/);
  });

  it("penalises real cold", () => {
    expect(monthComfort(m({ avgHighC: 3, avgLowC: -4 })).comfort).toBe("harsh");
  });

  it("treats a persistently wet month as worse than a damp one", () => {
    const damp = monthComfort(m({ rainyDayFraction: 0.42 }));
    const soaked = monthComfort(m({ rainyDayFraction: 0.6 }));
    const order = { ideal: 0, good: 1, mixed: 2, harsh: 3 } as const;
    expect(order[soaked.comfort]).toBeGreaterThan(order[damp.comfort]);
  });

  it("ignores ordinary wind but flags genuine wind", () => {
    expect(monthComfort(m({ avgWindKph: 18 })).reason).not.toMatch(/wind/);
    expect(monthComfort(m({ avgWindKph: 34 })).reason).toMatch(/wind/);
  });

  it("gives a pleasant month no reason to explain", () => {
    expect(monthComfort(m({})).reason).toBe("");
  });
});

describe("bestMonths", () => {
  const year = (spec: Record<string, Partial<ClimateNormals>>) =>
    Object.fromEntries(Object.entries(spec).map(([k, v]) => [k, m({ month: k, ...v })]));

  it("returns the pleasant months, driest first", () => {
    const r = bestMonths(year({
      January: { avgHighC: 4 },
      April: { avgHighC: 20, rainyDayFraction: 0.3 },
      May: { avgHighC: 21, rainyDayFraction: 0.15 },
      August: { avgHighC: 34 },
    }));
    expect(r).toEqual(["May", "April"]);
  });

  it("returns nothing when no month scores well, rather than the least bad", () => {
    expect(bestMonths(year({
      January: { avgHighC: 2 },
      July: { avgHighC: 38, avgLowC: 28 },
    }))).toEqual([]);
  });

  it("caps the list so the answer stays an answer", () => {
    const spec: Record<string, Partial<ClimateNormals>> = {};
    for (const mo of ["Jan","Feb","Mar","Apr","May","Jun","Jul"]) spec[mo] = { avgHighC: 20 };
    expect(bestMonths(year(spec)).length).toBe(4);
  });
});

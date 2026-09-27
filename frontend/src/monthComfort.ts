import type { ClimateNormals } from "./types";

/**
 * How pleasant a month is for walking around outdoors.
 *
 * The chart used to plot a floating high/low range bar, which is a convention
 * that has to be decoded: most people read bar height as "more of something",
 * not bar *position* as a temperature band. It also answered the wrong
 * question. What a traveller wants to know is "is this a good month, and if
 * not, which are?" — so the months are scored and coloured instead.
 *
 * Pure and deterministic, so it is unit-tested rather than eyeballed.
 */

export type Comfort = "ideal" | "good" | "mixed" | "harsh";

export interface MonthVerdict {
  comfort: Comfort;
  /** Short reason, for a tooltip. Empty when the month is simply pleasant. */
  reason: string;
}

/** Thresholds chosen for sightseeing on foot, not for sunbathing. */
const IDEAL_HIGH = [16, 26] as const;
const OK_HIGH = [11, 30] as const;
const COLD_LOW = 2;
const WET = 0.4;
const VERY_WET = 0.55;

export function monthComfort(n: ClimateNormals): MonthVerdict {
  const reasons: string[] = [];
  let penalty = 0;

  // Above ~32° a day on foot is hard going whatever else is true, so this
  // alone reaches "harsh" rather than needing a second strike.
  if (n.avgHighC > 32) {
    penalty += 4;
    reasons.push(`${Math.round(n.avgHighC)}° days`);
  } else if (n.avgHighC > OK_HIGH[1]) {
    penalty += 2;
    reasons.push(`hot, ${Math.round(n.avgHighC)}°`);
  } else if (n.avgHighC < 6) {
    penalty += 4;
    reasons.push(`cold, ${Math.round(n.avgHighC)}°`);
  } else if (n.avgHighC < OK_HIGH[0]) {
    penalty += 2;
    reasons.push(`chilly, ${Math.round(n.avgHighC)}°`);
  } else if (n.avgHighC < IDEAL_HIGH[0] || n.avgHighC > IDEAL_HIGH[1]) {
    penalty += 1;
  }

  if (n.avgLowC < COLD_LOW) {
    penalty += 1;
    reasons.push(`nights near ${Math.round(n.avgLowC)}°`);
  }

  if (n.rainyDayFraction > VERY_WET) {
    penalty += 2;
    reasons.push(`rain ${Math.round(n.rainyDayFraction * 100)}% of days`);
  } else if (n.rainyDayFraction > WET) {
    penalty += 1;
    reasons.push(`rain ${Math.round(n.rainyDayFraction * 100)}% of days`);
  }

  // Wind only counts once it genuinely changes a day out.
  if (n.avgWindKph > 30) {
    penalty += 1;
    reasons.push(`windy, ${Math.round(n.avgWindKph)}km/h`);
  }

  const comfort: Comfort =
    penalty === 0 ? "ideal" : penalty === 1 ? "good" : penalty <= 3 ? "mixed" : "harsh";

  return { comfort, reason: reasons.join(", ") };
}

export const COMFORT_LABEL: Record<Comfort, string> = {
  ideal: "ideal",
  good: "good",
  mixed: "mixed",
  harsh: "hard going",
};

/** CSS colour per level, reusing the existing semantic tokens. */
export const COMFORT_COLOUR: Record<Comfort, string> = {
  ideal: "hsl(var(--live))",
  good: "hsl(var(--live) / 0.55)",
  mixed: "hsl(var(--warn) / 0.75)",
  harsh: "hsl(var(--bad) / 0.7)",
};

/**
 * The months worth travelling in, best first, capped so the answer stays an
 * answer. Returns [] when nowhere in the year scores well — which is itself
 * worth saying rather than padding the list with the least-bad options.
 */
export function bestMonths(year: Record<string, ClimateNormals>, limit = 4): string[] {
  return Object.values(year)
    .map((n) => ({ month: n.month, verdict: monthComfort(n), n }))
    .filter((m) => m.verdict.comfort === "ideal" || m.verdict.comfort === "good")
    .sort((a, b) => {
      // Prefer ideal, then drier.
      const rank = (c: Comfort) => (c === "ideal" ? 0 : 1);
      const byComfort = rank(a.verdict.comfort) - rank(b.verdict.comfort);
      return byComfort !== 0 ? byComfort : a.n.rainyDayFraction - b.n.rainyDayFraction;
    })
    .slice(0, limit)
    .map((m) => m.month);
}

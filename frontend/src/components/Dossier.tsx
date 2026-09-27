import {
  BookOpen,
  Bus,
  TriangleAlert,
  HandHeart,
  UtensilsCrossed,
  ShieldCheck,
  Thermometer,
  ExternalLink,
} from "lucide-react";
import { monthComfort, bestMonths, COMFORT_COLOUR, COMFORT_LABEL } from "../monthComfort";
import type {
  ClimateGuidance,
  ClimateNormals,
  Critique,
  DestinationBrief,
  FoodBrief,
} from "../types";

/**
 * The supporting facts.
 *
 * These began as four boxes of grey prose at the foot of the page, which made
 * genuinely useful material — a warning about photographing geiko, a month that
 * rains a third of the time — read as filler. Each panel now leads with the
 * thing you would act on, and the climate panel became the chart the data was
 * always capable of supporting.
 */

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * `flat` drops the card chrome. Inside the details column the surrounding panel
 * already provides a border and a background, so a bordered card within it
 * reads as a box inside a box; there the sections are separated by rules
 * instead. In the main column, where they stand alone, they keep the card.
 */
function Panel({
  icon: Icon,
  label,
  source,
  href,
  children,
  className = "",
  flat = false,
}: {
  icon: typeof BookOpen;
  label: string;
  source?: string;
  href?: string;
  children: React.ReactNode;
  className?: string;
  flat?: boolean;
}) {
  return (
    <section
      className={`flex flex-col ${
        flat ? "" : "border border-rule bg-paper-raised rounded-sm"
      } ${className}`}
    >
      <header
        className={
          flat
            ? // Full-bleed tinted band: in the details column several sections
              // stack in one scroll area, and a hairline between them was not
              // enough to read as a boundary.
              "flex items-center gap-2 -mx-3.5 px-3.5 py-2 mb-3 bg-paper-sunken border-y border-rule"
            : "flex items-center gap-2 px-3.5 py-2 border-b border-rule"
        }
      >
        <Icon className="w-3.5 h-3.5 text-ink-faint shrink-0" strokeWidth={1.75} aria-hidden />
        <h3 className="eyebrow flex-1">{label}</h3>
        {source &&
          (href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="figure text-ink-faint hover:text-accent inline-flex items-center gap-1"
            >
              {source}
              <ExternalLink className="w-2.5 h-2.5" aria-hidden />
            </a>
          ) : (
            <span className="figure text-ink-faint">{source}</span>
          ))}
      </header>
      <div className={`flex-1 ${flat ? "px-0" : "px-3.5 py-3"}`}>{children}</div>
    </section>
  );
}

/** A thing to act on, not a paragraph to wade through. */
function Callout({
  icon: Icon,
  label,
  tone = "neutral",
  children,
}: {
  icon: typeof BookOpen;
  label: string;
  tone?: "neutral" | "warn";
  children: React.ReactNode;
}) {
  const accent = tone === "warn" ? "text-warn" : "text-ink-faint";
  return (
    <div className="flex gap-2.5 mt-3 pt-3 border-t border-rule first:mt-0 first:pt-0 first:border-t-0">
      <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${accent}`} strokeWidth={1.75} aria-hidden />
      <div className="min-w-0">
        <span className={`eyebrow ${tone === "warn" ? "text-warn" : ""}`}>{label}</span>
        <p className="text-[13px] text-ink-soft mt-1 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

export function DestinationPanel({ brief , flat }: { flat?: boolean; brief: DestinationBrief }) {
  return (
    <Panel icon={BookOpen} label="The place" source={brief.source.title} href={brief.source.url} flat={flat}>
      <p className="text-[13.5px] leading-relaxed">{brief.overview}</p>

      {brief.gettingAround && (
        <Callout icon={Bus} label="Getting around">{brief.gettingAround}</Callout>
      )}
      {brief.safety && (
        <Callout icon={TriangleAlert} label="Watch out" tone="warn">{brief.safety}</Callout>
      )}
      {brief.etiquette && (
        <Callout icon={HandHeart} label="Local custom">{brief.etiquette}</Callout>
      )}
    </Panel>
  );
}

/**
 * Twelve months, scored and coloured.
 *
 * Was a floating high/low range bar with a 33°/1° axis and a "warm ▲ · rain ▬"
 * legend — a chart you had to decode, answering a question nobody asked. The
 * question is "is this a good month, and if not, when?", so each month now
 * shows its average high as a plain number on a bar whose colour says how
 * pleasant it is. Hovering gives the reason.
 */
function YearStrip({
  year,
  selected,
  onPick,
}: {
  year: Record<string, ClimateNormals>;
  selected: string;
  onPick?: (month: string) => void;
}) {
  const months = MONTHS_FULL.map((m) => year[m]).filter(Boolean);
  if (months.length < 6) return null;

  const max = Math.max(...months.map((m) => m.avgHighC));
  const min = Math.min(...months.map((m) => m.avgLowC));
  const span = Math.max(max - min, 1);

  return (
    <div className="flex items-end gap-[3px]" role="group" aria-label="Comfort by month">
      {MONTHS_FULL.map((full, i) => {
        const n = year[full];
        if (!n) return <div key={full} className="flex-1" />;

        const { comfort, reason } = monthComfort(n);
        const isSelected = full === selected;
        // Height tracks warmth so the seasonal shape is still legible at a
        // glance; colour carries the actual judgement.
        const height = 14 + ((n.avgHighC - min) / span) * 30;

        const title = `${full}: ${Math.round(n.avgHighC)}° / ${Math.round(n.avgLowC)}°, ${COMFORT_LABEL[comfort]}${
          reason ? ` — ${reason}` : ""
        }`;

        const body = (
          <>
            <div
              className="w-full rounded-[2px] flex items-start justify-center pt-0.5"
              style={{
                height,
                background: COMFORT_COLOUR[comfort],
                opacity: isSelected ? 1 : 0.75,
                outline: isSelected ? "2px solid hsl(var(--ink))" : "none",
                outlineOffset: 1,
              }}
            >
              <span className="figure text-paper" style={{ fontSize: 9, fontWeight: 500 }}>
                {Math.round(n.avgHighC)}
              </span>
            </div>
            <span
              className={`figure block text-center mt-1 ${
                isSelected ? "text-ink font-medium" : "text-ink-faint"
              }`}
              style={{ fontSize: 9 }}
            >
              {MONTHS_SHORT[i]}
            </span>
          </>
        );

        return onPick && !isSelected ? (
          <button
            key={full}
            type="button"
            onClick={() => onPick(full)}
            title={`${title} — click to re-plan`}
            aria-label={`Re-plan for ${full}. ${title}`}
            className="flex-1 min-w-0 rounded-xs hover:opacity-100 transition-opacity"
          >
            {body}
          </button>
        ) : (
          <div key={full} className="flex-1 min-w-0" title={title} aria-current={isSelected}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

export function ClimatePanel({
  climate,
  onPickMonth,
  flat,
}: {
  climate: ClimateGuidance;
  onPickMonth?: (month: string) => void;
  flat?: boolean;
}) {
  const n = climate.normals;
  const rainPct = Math.round(n.rainyDayFraction * 100);
  const { comfort, reason } = monthComfort(n);
  const best = bestMonths(climate.year).filter((m) => m !== n.month);

  return (
    <Panel
      icon={Thermometer}
      label={`${n.month} weather`}
      source={`ERA5 · ${n.yearsSampled}yr mean`}
      flat={flat}
    >
      {/* The verdict first, in words, then the numbers behind it. */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className="text-[13px] font-semibold px-1.5 py-0.5 rounded-xs"
          style={{ background: COMFORT_COLOUR[comfort], color: "hsl(var(--paper))" }}
        >
          {COMFORT_LABEL[comfort]}
        </span>
        <span className="figure text-ink-soft">
          {Math.round(n.avgHighC)}° / {Math.round(n.avgLowC)}° · rain {rainPct}% of days
          {n.avgWindKph >= 25 && ` · wind ${Math.round(n.avgWindKph)}km/h`}
        </span>
      </div>
      {reason && <p className="figure text-ink-faint mt-1">{reason}</p>}

      <div className="mt-3">
        <YearStrip year={climate.year} selected={n.month} onPick={onPickMonth} />
        {onPickMonth && (
          <p className="figure text-ink-faint mt-1.5">click a month to re-plan for it</p>
        )}
      </div>

      {best.length > 0 && (
        <p className="text-[12.5px] text-ink-soft mt-3 pt-3 border-t border-rule">
          <span className="eyebrow">Also good</span>{" "}
          <span className="ml-1">{best.join(" · ")}</span>
        </p>
      )}

      {climate.caution && (
        <p className="text-[12.5px] text-warn mt-2.5 leading-relaxed">{climate.caution}</p>
      )}

      {climate.packing.length > 0 && (
        <div className="mt-3 pt-3 border-t border-rule">
          <span className="eyebrow">Pack</span>
          <ul className="flex flex-wrap gap-1.5 mt-1.5">
            {climate.packing.map((item) => (
              <li
                key={item}
                className="text-[12px] px-1.5 py-0.5 rounded-xs bg-paper-sunken border border-rule text-ink-soft"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

export function FoodPanel({ food , flat }: { flat?: boolean; food: FoodBrief }) {
  return (
    <Panel
      icon={UtensilsCrossed}
      label="Eating"
      source={food.source.title}
      href={food.source.url}
      flat={flat}
    >
      {food.dishes.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {food.dishes.map((d) => (
            <li
              key={d}
              className="text-[12.5px] px-2 py-1 rounded-xs bg-paper-sunken border border-rule text-ink"
            >
              {d}
            </li>
          ))}
        </ul>
      )}
      {food.advice && (
        <p className="text-[13px] text-ink-soft mt-3 leading-relaxed">{food.advice}</p>
      )}
      {food.dietaryNote && (
        <Callout icon={ShieldCheck} label="Your dietary note">{food.dietaryNote}</Callout>
      )}
    </Panel>
  );
}

/** What the critic actually checked — an empty result should still show its work. */
const CHECKS = [
  "walking distance per day",
  "stops per day against your pace",
  "the same place twice",
  "days left empty",
  "entries that are not real places",
  "order within each day",
];

export function CritiquePanel({ critique , flat }: { flat?: boolean; critique: Critique }) {
  const blocking = critique.defects.filter((d) => d.severity === "blocking").length;

  return (
    <Panel
      icon={ShieldCheck}
      label="Review"
      source={critique.approved ? "passed" : `${blocking} blocking`}
      flat={flat}
    >
      {critique.defects.length === 0 ? (
        <>
          <p className="text-[13px] text-live flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
            Nothing to flag.
          </p>
          {/* "No issues" is more convincing when it says what was looked at. */}
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 pt-3 border-t border-rule">
            {CHECKS.map((c) => (
              <li key={c} className="figure text-ink-faint flex gap-1.5">
                <span aria-hidden className="text-live">
                  ✓
                </span>
                {c}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <ul className="space-y-2.5">
          {critique.defects.map((d, i) => (
            <li key={i} className="flex gap-2">
              <TriangleAlert
                className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                  d.severity === "blocking" ? "text-bad" : "text-warn"
                }`}
                aria-hidden
              />
              <p className="text-[13px] text-ink-soft leading-relaxed">
                {d.day !== null && <span className="figure text-ink-faint">day {d.day} · </span>}
                {d.issue}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/**
 * Below `lg` there is no third column, so the context panels render inline in
 * the main column instead. Same components, re-exported under names that make
 * the call sites in App.tsx say which layout they belong to.
 */
export { DestinationPanel as DestinationPanelInline, ClimatePanel as ClimatePanelInline };

import {
  BookOpen,
  Bus,
  TriangleAlert,
  HandHeart,
  UtensilsCrossed,
  ShieldCheck,
  Umbrella,
  Wind,
  Thermometer,
  Backpack,
  ExternalLink,
} from "lucide-react";
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
        className={`flex items-center gap-2 ${
          flat ? "px-0 pb-2" : "px-3.5 py-2 border-b border-rule"
        }`}
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
 * Twelve months of temperature as a band chart, with the travel month picked
 * out and every other month clickable.
 *
 * This is the question a traveller actually has — "is this the right month?" —
 * and the archive request already returns the whole year, so answering it costs
 * nothing extra. Clicking a month re-plans against it, which reuses the
 * brief-editing path rather than inventing a second way to change the trip.
 */
function ClimateChart({
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

  const highs = months.map((m) => m.avgHighC);
  const lows = months.map((m) => m.avgLowC);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const span = Math.max(max - min, 1);
  const H = 54;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="figure text-ink-faint" style={{ fontSize: 9 }}>
          {Math.round(max)}°
        </span>
        <span className="figure text-ink-faint" style={{ fontSize: 9 }}>
          warm ▲ · rain ▬
        </span>
      </div>
      <div className="flex items-end gap-[3px]" role="group" aria-label="Average temperature by month">
        {MONTHS_FULL.map((full, i) => {
          const n = year[full];
          if (!n) return <div key={full} className="flex-1" />;

          const isSelected = full === selected;
          const top = ((max - n.avgHighC) / span) * H;
          const height = Math.max(((n.avgHighC - n.avgLowC) / span) * H, 3);

          const bar = (
            <>
              <div className="relative w-full" style={{ height: H }}>
                <div
                  className="absolute inset-x-0 rounded-[2px] transition-colors"
                  style={{
                    top,
                    height,
                    background: isSelected ? "hsl(var(--accent))" : "hsl(var(--ink-faint))",
                    opacity: isSelected ? 1 : 0.45,
                  }}
                />
              </div>
              {/* Rain as a second channel, so wet months read at a glance. Scaled
                  from a visible floor — at raw opacity the difference between a
                  20% and a 45% month was invisible. */}
              <div className="w-full h-[5px] mt-[4px] rounded-full bg-rule overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(Math.min(n.rainyDayFraction / 0.5, 1) * 100)}%`,
                    background: isSelected ? "hsl(var(--accent))" : "hsl(var(--ink-faint))",
                    opacity: isSelected ? 1 : 0.55,
                  }}
                />
              </div>
              <span
                className={`figure block text-center mt-1 ${
                  isSelected ? "text-accent font-medium" : "text-ink-faint"
                }`}
                style={{ fontSize: 9 }}
              >
                {MONTHS_SHORT[i]}
              </span>
            </>
          );

          const title = `${full}: ${n.avgHighC}° / ${n.avgLowC}°C, rain on ${Math.round(
            n.rainyDayFraction * 100
          )}% of days`;

          return onPick && !isSelected ? (
            <button
              key={full}
              type="button"
              onClick={() => onPick(full)}
              title={`${title} — click to re-plan for ${full}`}
              aria-label={`Re-plan for ${full}. ${title}`}
              className="flex-1 min-w-0 group/m rounded-xs hover:bg-paper-sunken transition-colors"
            >
              {bar}
            </button>
          ) : (
            <div key={full} className="flex-1 min-w-0" title={title} aria-current={isSelected}>
              {bar}
            </div>
          );
        })}
      </div>
      <div className="flex items-baseline justify-between mt-1">
        <span className="figure text-ink-faint" style={{ fontSize: 9 }}>
          {Math.round(min)}°
        </span>
        {onPick && (
          <span className="figure text-ink-faint" style={{ fontSize: 9 }}>
            click a month to re-plan
          </span>
        )}
      </div>
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

  return (
    <Panel
      icon={Thermometer}
      label={`${n.month} weather`}
      source={`ERA5 · ${n.yearsSampled}yr mean`}
      flat={flat}
    >
      {/* The three figures that change what you pack and when you go. */}
      <div className="grid grid-cols-3 gap-px bg-rule border border-rule rounded-sm overflow-hidden mb-3">
        {[
          [Thermometer, `${n.avgHighC}° / ${n.avgLowC}°`, "high / low"],
          [Umbrella, `${rainPct}%`, "of days wet"],
          [Wind, `${Math.round(n.avgWindKph)}`, "km/h wind"],
        ].map(([Icon, value, caption]) => {
          const I = Icon as typeof Thermometer;
          return (
            <div key={caption as string} className="bg-paper-raised px-2 py-2 text-center">
              <I className="w-3 h-3 text-ink-faint mx-auto" strokeWidth={1.75} aria-hidden />
              <div className="text-[14px] font-semibold tracking-tight mt-1">{value as string}</div>
              <div className="figure text-ink-faint" style={{ fontSize: 9 }}>
                {caption as string}
              </div>
            </div>
          );
        })}
      </div>

      <ClimateChart year={climate.year} selected={n.month} onPick={onPickMonth} />

      {climate.summary && (
        <p className="text-[13px] text-ink-soft mt-3 pt-3 border-t border-rule leading-relaxed">
          {climate.summary}
        </p>
      )}
      {climate.caution && (
        <p className="text-[13px] text-warn mt-2 leading-relaxed">{climate.caution}</p>
      )}

      {climate.packing.length > 0 && (
        <Callout icon={Backpack} label="Pack">
          <span className="block space-y-1 mt-0.5">
            {climate.packing.map((item) => (
              <span key={item} className="flex gap-2">
                <span aria-hidden className="text-ink-faint shrink-0">
                  —
                </span>
                <span>{item}</span>
              </span>
            ))}
          </span>
        </Callout>
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

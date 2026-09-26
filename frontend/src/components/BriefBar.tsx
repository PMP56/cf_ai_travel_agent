import type { ResolvedPlace, TripBrief } from "../types";

/**
 * The trip brief as a row of facts.
 *
 * This is the thesis of v2 made visible: the request is persistent, inspectable
 * state rather than a message that scrolled away. A chat app makes you re-ask;
 * here the brief is the thing on screen, and anything the planner had to guess
 * or could not determine says so.
 *
 * Editing is Phase 4. What matters now is that every value is shown, including
 * the absent ones — a blank budget is information.
 */

interface BriefBarProps {
  brief: TripBrief;
  place: ResolvedPlace | null;
  alternatives: ResolvedPlace[];
  missing: string[];
}

const LABELS: Record<string, string> = {
  durationDays: "duration",
  travelMonth: "month",
  budget: "budget",
};

function Fact({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="eyebrow">{label}</span>
      <span
        className={`text-[13px] leading-tight truncate ${
          muted ? "text-ink-faint italic" : "text-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function BriefBar({ brief, place, alternatives, missing }: BriefBarProps) {
  const unset = "not specified";

  return (
    <section
      aria-label="Trip brief"
      className="border border-rule bg-paper-raised rounded-sm"
    >
      <div className="px-4 py-3 border-b border-rule">
        <span className="eyebrow">Destination</span>
        <h1 className="display text-[30px] md:text-[38px] mt-1 leading-none">
          {brief.destination}
        </h1>
        {place && (
          <p className="figure text-ink-faint mt-1.5">
            {place.name}
            {place.admin1 ? `, ${place.admin1}` : ""}, {place.country}
            {"  ·  "}
            {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
            {place.population !== null && `  ·  pop ${place.population.toLocaleString()}`}
          </p>
        )}
        {brief.destinationCity && (
          <p className="figure text-ink-faint mt-1">
            region anchored on {brief.destinationCity}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 px-4 py-3">
        <Fact
          label="duration"
          value={brief.durationDays ? `${brief.durationDays} days` : unset}
          muted={!brief.durationDays}
        />
        <Fact label="month" value={brief.travelMonth ?? unset} muted={!brief.travelMonth} />
        <Fact
          label="budget"
          value={
            brief.budget
              ? `${brief.budget.amount.toLocaleString()} ${brief.budget.currency}`
              : unset
          }
          muted={!brief.budget}
        />
        <Fact
          label="travellers"
          value={brief.partySize ? String(brief.partySize) : unset}
          muted={!brief.partySize}
        />
      </div>

      {(brief.interests.length > 0 || brief.constraints.length > 0 || brief.pace) && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3">
          {brief.pace && (
            <span className="figure px-1.5 py-0.5 border border-rule-strong rounded-xs text-ink-soft">
              {brief.pace}
            </span>
          )}
          {brief.interests.map((i) => (
            <span
              key={i}
              className="figure px-1.5 py-0.5 border border-rule rounded-xs text-ink-soft"
            >
              {i}
            </span>
          ))}
          {brief.constraints.map((c) => (
            <span
              key={c}
              className="figure px-1.5 py-0.5 rounded-xs text-accent border border-accent/40"
              title="constraint"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {missing.length > 0 && (
        <p className="figure text-ink-faint px-4 pb-3">
          not stated: {missing.map((m) => LABELS[m] ?? m).join(", ")}
        </p>
      )}

      {alternatives.length > 0 && (
        <div className="px-4 pb-3 border-t border-rule pt-2.5">
          <span className="eyebrow">Did you mean</span>
          <p className="figure text-ink-soft mt-1">
            {alternatives.map((a) => `${a.name}, ${a.country}`).join("  ·  ")}
          </p>
        </div>
      )}
    </section>
  );
}

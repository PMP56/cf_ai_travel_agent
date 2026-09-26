import type { ResolvedPlace, TripBrief } from "../types";
import EditableFact from "./EditableFact";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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
  /** Committing an edit re-plans against the same structured intent. */
  onEdit: (brief: TripBrief) => void;
  /** True while a plan is running; edits are disabled to avoid racing it. */
  busy: boolean;
}

export default function BriefBar({
  brief,
  place,
  alternatives,
  onEdit,
  busy,
}: BriefBarProps) {
  const unset = "not specified";

  return (
    <section
      aria-label="Trip brief"
      className="border border-rule bg-paper-raised rounded-sm"
    >
      <div className="px-4 py-3 border-b border-rule">
        <span className="eyebrow">Destination</span>
        <h1 className="display text-[32px] md:text-[40px] mt-1 leading-none">
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

      <div
        className={`grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 px-4 py-3 ${
          busy ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <EditableFact
          label="duration"
          value={brief.durationDays ? `${brief.durationDays} days` : null}
          editValue={brief.durationDays ? String(brief.durationDays) : ""}
          placeholder={unset}
          inputMode="numeric"
          onCommit={(raw) => {
            const n = parseInt(raw, 10);
            onEdit({ ...brief, durationDays: Number.isFinite(n) && n > 0 ? Math.min(n, 60) : null });
          }}
        />
        <EditableFact
          label="month"
          value={brief.travelMonth}
          placeholder={unset}
          options={MONTHS}
          onCommit={(raw) => {
            const match = MONTHS.find((m) => m.toLowerCase() === raw.toLowerCase());
            onEdit({ ...brief, travelMonth: match ?? null });
          }}
        />
        <EditableFact
          label="budget"
          value={
            brief.budget
              ? `${brief.budget.amount.toLocaleString()} ${brief.budget.currency}`
              : null
          }
          editValue={brief.budget ? String(brief.budget.amount) : ""}
          placeholder={unset}
          inputMode="numeric"
          onCommit={(raw) => {
            const n = parseInt(raw.replace(/[^0-9]/g, ""), 10);
            onEdit({
              ...brief,
              budget:
                Number.isFinite(n) && n > 0
                  ? { amount: n, currency: brief.budget?.currency ?? "USD" }
                  : null,
            });
          }}
        />
        <EditableFact
          label="pace"
          value={brief.pace}
          placeholder={unset}
          options={["relaxed", "moderate", "packed"]}
          onCommit={(raw) =>
            onEdit({
              ...brief,
              pace: (["relaxed", "moderate", "packed"] as const).find((p) => p === raw) ?? null,
            })
          }
        />
      </div>

      <p className="figure text-ink-faint px-4 pb-2 -mt-1">
        {busy ? "re-planning…" : "click any value to change it — the plan reconverges"}
      </p>

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

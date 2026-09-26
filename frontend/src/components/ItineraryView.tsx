import { useState } from "react";
import type { CuratedPlace, Itinerary } from "../types";
import { dayColour } from "../dayColour";

/**
 * The itinerary, as an editable dossier rather than a chat reply.
 *
 * Every place carries its provenance — real coordinates, a Wikipedia link, and
 * the pageview figure that got it selected. The whole point of v2 is that
 * nothing here was invented, so the interface shows the receipts instead of
 * asking to be trusted.
 *
 * Rearranging uses explicit controls rather than drag-and-drop. Dragging is
 * unusable by keyboard without building a second, parallel affordance anyway,
 * and "move to day 3" is both clearer and less fiddly than dropping a card into
 * the right gap.
 */

interface ItineraryViewProps {
  itinerary: Itinerary;
  activeDay: number | null;
  unused: CuratedPlace[];
  onHoverPlace: (place: CuratedPlace | null) => void;
  onFocusDay: (day: number | null) => void;
  onReorder: (day: number, index: number, direction: -1 | 1) => void;
  onMoveToDay: (day: number, index: number, toDay: number) => void;
  onRemove: (day: number, index: number) => void;
  onSwap: (day: number, index: number, replacement: CuratedPlace) => void;
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="figure w-5 h-5 grid place-items-center border border-rule rounded-xs text-ink-faint hover:border-ink-faint hover:text-ink disabled:opacity-25 transition-colors"
    >
      {children}
    </button>
  );
}

function PlaceRow({
  place,
  index,
  dayNumber,
  dayCount,
  isFirst,
  isLast,
  unused,
  onHover,
  onReorder,
  onMoveToDay,
  onRemove,
  onSwap,
}: {
  place: CuratedPlace;
  index: number;
  dayNumber: number;
  dayCount: number;
  isFirst: boolean;
  isLast: boolean;
  unused: CuratedPlace[];
  onHover: (p: CuratedPlace | null) => void;
  onReorder: (day: number, index: number, direction: -1 | 1) => void;
  onMoveToDay: (day: number, index: number, toDay: number) => void;
  onRemove: (day: number, index: number) => void;
  onSwap: (day: number, index: number, replacement: CuratedPlace) => void;
}) {
  const [showSwap, setShowSwap] = useState(false);

  return (
    <li
      className="group/place py-2.5 pl-4 border-l border-rule hover:border-l-ink-faint transition-colors"
      onMouseEnter={() => onHover(place)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <a
          href={place.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[15px] leading-snug hover:text-accent underline-offset-2 hover:underline"
        >
          {place.title}
        </a>
        <span
          className="figure text-ink-faint shrink-0"
          title="average Wikipedia pageviews per day — how this place was ranked"
        >
          {place.viewsPerDay.toLocaleString()}/d
        </span>
      </div>

      {place.why && <p className="text-[13px] text-ink-soft mt-0.5">{place.why}</p>}

      <p className="figure text-ink-faint mt-1">
        {place.category} · {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)} ·{" "}
        {(place.distanceM / 1000).toFixed(1)}km from centre
      </p>

      {/* Controls stay in the DOM for keyboard users; they only fade in on hover. */}
      <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover/place:opacity-100 focus-within:opacity-100 transition-opacity">
        <IconButton
          label="Move earlier in the day"
          onClick={() => onReorder(dayNumber, index, -1)}
          disabled={isFirst}
        >
          ↑
        </IconButton>
        <IconButton
          label="Move later in the day"
          onClick={() => onReorder(dayNumber, index, 1)}
          disabled={isLast}
        >
          ↓
        </IconButton>

        <label className="sr-only" htmlFor={`move-${dayNumber}-${index}`}>
          Move {place.title} to another day
        </label>
        <select
          id={`move-${dayNumber}-${index}`}
          value=""
          onChange={(e) => {
            const target = parseInt(e.target.value, 10);
            if (Number.isFinite(target)) onMoveToDay(dayNumber, index, target);
          }}
          className="figure h-5 bg-transparent border border-rule rounded-xs text-ink-faint hover:border-ink-faint hover:text-ink transition-colors px-1"
        >
          <option value="">day…</option>
          {Array.from({ length: dayCount }, (_, i) => i + 1)
            .filter((d) => d !== dayNumber)
            .map((d) => (
              <option key={d} value={d}>
                day {d}
              </option>
            ))}
        </select>

        {unused.length > 0 && (
          <IconButton
            label="Swap for another place the planner found"
            onClick={() => setShowSwap((v) => !v)}
          >
            ⇄
          </IconButton>
        )}

        <IconButton label="Remove from plan" onClick={() => onRemove(dayNumber, index)}>
          ×
        </IconButton>
      </div>

      {showSwap && (
        <ul className="mt-2 border border-rule rounded-sm divide-y divide-rule">
          {unused.slice(0, 6).map((candidate) => (
            <li key={candidate.title}>
              <button
                type="button"
                onClick={() => {
                  onSwap(dayNumber, index, candidate);
                  setShowSwap(false);
                }}
                className="w-full text-left px-2.5 py-1.5 hover:bg-paper-sunken transition-colors"
              >
                <span className="text-[13px]">{candidate.title}</span>
                <span className="figure text-ink-faint ml-2">
                  {candidate.viewsPerDay.toLocaleString()}/d
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function ItineraryView({
  itinerary,
  activeDay,
  unused,
  onHoverPlace,
  onFocusDay,
  onReorder,
  onMoveToDay,
  onRemove,
  onSwap,
}: ItineraryViewProps) {
  return (
    <section aria-label="Itinerary" className="space-y-5">
      <header className="flex items-baseline justify-between border-b border-rule-strong pb-2">
        <h2 className="display text-[22px]">Itinerary</h2>
        <span className="figure text-ink-faint" aria-live="polite">
          {itinerary.days.length} days · {itinerary.totalTravelKm}km between stops
        </span>
      </header>

      {itinerary.days.map((day) => {
        const dimmed = activeDay !== null && activeDay !== day.day;

        return (
          <article
            key={day.day}
            onMouseEnter={() => onFocusDay(day.day)}
            onMouseLeave={() => onFocusDay(null)}
            className={`transition-opacity ${dimmed ? "opacity-40" : "opacity-100"}`}
          >
            <div className="flex items-baseline gap-2.5">
              <span
                aria-hidden
                className="w-2 h-2 rounded-full shrink-0 translate-y-[-1px]"
                style={{ background: dayColour(day.day) }}
              />
              <span className="eyebrow">Day {day.day}</span>
              <h3 className="display text-[19px] flex-1 min-w-0 truncate">{day.title}</h3>
              <span className="figure text-ink-faint shrink-0">{day.travelKm}km</span>
            </div>

            <ul className="mt-1.5 ml-[3px]">
              {day.places.map((place, i) => (
                <PlaceRow
                  key={place.title}
                  place={place}
                  index={i}
                  dayNumber={day.day}
                  dayCount={itinerary.days.length}
                  isFirst={i === 0}
                  isLast={i === day.places.length - 1}
                  unused={unused}
                  onHover={onHoverPlace}
                  onReorder={onReorder}
                  onMoveToDay={onMoveToDay}
                  onRemove={onRemove}
                  onSwap={onSwap}
                />
              ))}
            </ul>

            {day.note && (
              <p className="text-[13px] text-ink-soft mt-2 ml-[19px] pl-3 border-l-2 border-rule-strong italic">
                {day.note}
              </p>
            )}
          </article>
        );
      })}

      {itinerary.droppedForPace > 0 && (
        <p className="figure text-ink-faint border border-rule rounded-sm px-3 py-2">
          {itinerary.droppedForPace} more notable place
          {itinerary.droppedForPace > 1 ? "s" : ""} nearby, held back to keep the pace you asked
          for — use ⇄ on any stop to swap one in.
        </p>
      )}

      {itinerary.unscheduledDays > 0 && (
        <p className="figure text-warn border border-warn/40 rounded-sm px-3 py-2">
          {itinerary.unscheduledDays} day{itinerary.unscheduledDays > 1 ? "s" : ""} of the trip
          have nothing scheduled — too few notable places were found nearby.
        </p>
      )}
    </section>
  );
}

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Landmark,
  Building2,
  Church,
  Trees,
  Mountain,
  ShoppingBag,
  Eye,
  Map as MapIcon,
  Ticket,
  Hourglass,
  Repeat2,
  X,
  ExternalLink,
} from "lucide-react";
import type { CuratedPlace, Itinerary } from "../types";
import { dayColour } from "../dayColour";

/**
 * The itinerary: the centre of the workspace.
 *
 * Earlier this was a flat list of text, which made a rich, grounded plan read
 * like an unstyled document — impossible to scan and hard to tell apart from
 * prose. It now leads with Wikipedia's own lead image for each place, so the
 * page is anchored by real photographs of real locations rather than decorated
 * with stock imagery. Provenance stays visible: coordinates, the pageview
 * figure that earned a place its slot, and a link to the source.
 *
 * Rearranging uses explicit controls rather than drag-and-drop, which is
 * unusable by keyboard without building a second, parallel affordance.
 */

interface ItineraryViewProps {
  itinerary: Itinerary;
  activeDay: number | null;
  unused: CuratedPlace[];
  /** The place whose detail panel is open, if any. */
  selectedPlace: CuratedPlace | null;
  onSelect: (place: CuratedPlace) => void;
  onHoverPlace: (place: CuratedPlace | null) => void;
  onFocusDay: (day: number | null) => void;
  onReorder: (day: number, index: number, direction: -1 | 1) => void;
  onMoveToDay: (day: number, index: number, toDay: number) => void;
  onRemove: (day: number, index: number) => void;
  onSwap: (day: number, index: number, replacement: CuratedPlace) => void;
}

const CATEGORY_ICON: Record<string, typeof Landmark> = {
  landmark: Landmark,
  museum: Building2,
  religious: Church,
  nature: Trees,
  park: Trees,
  market: ShoppingBag,
  viewpoint: Eye,
  neighbourhood: MapIcon,
  entertainment: Ticket,
  historic: Mountain,
};

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const Icon = CATEGORY_ICON[category] ?? Landmark;
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}

/** Wikipedia's lead image, or a typographic stand-in when there is none. */
function PlaceThumb({ place }: { place: CuratedPlace }) {
  const [failed, setFailed] = useState(false);

  if (!place.imageUrl || failed) {
    return (
      <div className="w-[84px] h-[84px] shrink-0 rounded-sm bg-paper-sunken border border-rule grid place-items-center">
        <CategoryIcon category={place.category} className="w-5 h-5 text-ink-faint" />
      </div>
    );
  }

  return (
    <img
      src={place.imageUrl}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-[84px] h-[84px] shrink-0 rounded-sm object-cover border border-rule bg-paper-sunken"
    />
  );
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
      className="w-6 h-6 grid place-items-center rounded-xs border border-rule text-ink-soft hover:border-ink-faint hover:text-ink hover:bg-paper-sunken disabled:opacity-25 transition-colors"
    >
      {children}
    </button>
  );
}

function PlaceRow(props: {
  place: CuratedPlace;
  index: number;
  dayNumber: number;
  dayCount: number;
  isFirst: boolean;
  isLast: boolean;
  unused: CuratedPlace[];
  isSelected: boolean;
  onSelect: (place: CuratedPlace) => void;
  onHover: (p: CuratedPlace | null) => void;
  onReorder: (day: number, index: number, direction: -1 | 1) => void;
  onMoveToDay: (day: number, index: number, toDay: number) => void;
  onRemove: (day: number, index: number) => void;
  onSwap: (day: number, index: number, replacement: CuratedPlace) => void;
}) {
  const {
    place, index, dayNumber, dayCount, isFirst, isLast, unused, isSelected,
    onSelect, onHover, onReorder, onMoveToDay, onRemove, onSwap,
  } = props;
  const [showSwap, setShowSwap] = useState(false);

  return (
    <li
      className="group/place relative"
      onMouseEnter={() => onHover(place)}
      onMouseLeave={() => onHover(null)}
    >
      <div
        className={`flex gap-3 py-3 px-3 -mx-3 rounded-sm transition-colors ${
          isSelected ? "bg-accent/8 ring-1 ring-accent/30" : "hover:bg-paper-sunken/60"
        }`}
      >
        <PlaceThumb place={place} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => onSelect(place)}
              aria-label={`Show details for ${place.title}`}
              className={`text-[14.5px] font-medium leading-snug text-left underline-offset-2 hover:underline transition-colors ${
                isSelected ? "text-accent underline" : "hover:text-accent"
              }`}
            >
              {place.title}
            </button>
            <a
              href={place.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label={`${place.title} on Wikipedia`}
              title="Open on Wikipedia"
              className="shrink-0 text-ink-faint hover:text-accent transition-colors mt-0.5"
            >
              <ExternalLink className="w-3 h-3" aria-hidden />
            </a>
            <span
              className="figure text-ink-faint shrink-0 pt-0.5"
              title="average Wikipedia pageviews per day — how this place earned its slot"
            >
              {place.viewsPerDay.toLocaleString()}
            </span>
          </div>

          {place.why && (
            <p className="text-[13px] text-ink-soft mt-0.5 leading-snug">{place.why}</p>
          )}

          <div className="flex items-center gap-1.5 mt-1.5">
            <CategoryIcon category={place.category} className="w-3 h-3 text-ink-faint" />
            <span className="figure text-ink-faint">
              {place.category} · {(place.distanceM / 1000).toFixed(1)}km out
            </span>
          </div>

          {/* Present for keyboard users; revealed on hover or focus. */}
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover/place:opacity-100 focus-within:opacity-100 transition-opacity">
            <IconButton label="Move earlier in the day" onClick={() => onReorder(dayNumber, index, -1)} disabled={isFirst}>
              <ArrowUp className="w-3 h-3" />
            </IconButton>
            <IconButton label="Move later in the day" onClick={() => onReorder(dayNumber, index, 1)} disabled={isLast}>
              <ArrowDown className="w-3 h-3" />
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
              className="figure h-6 bg-paper border border-rule rounded-xs text-ink-soft hover:border-ink-faint hover:text-ink transition-colors px-1"
            >
              <option value="">day…</option>
              {Array.from({ length: dayCount }, (_, i) => i + 1)
                .filter((d) => d !== dayNumber)
                .map((d) => (
                  <option key={d} value={d}>day {d}</option>
                ))}
            </select>

            {unused.length > 0 && (
              <IconButton label="Swap for another place found nearby" onClick={() => setShowSwap((v) => !v)}>
                <Repeat2 className="w-3 h-3" />
              </IconButton>
            )}
            <IconButton label="Remove from plan" onClick={() => onRemove(dayNumber, index)}>
              <X className="w-3 h-3" />
            </IconButton>
          </div>

          {showSwap && (
            <ul className="mt-2 border border-rule rounded-sm divide-y divide-rule overflow-hidden">
              {unused.slice(0, 5).map((candidate) => (
                <li key={candidate.title}>
                  <button
                    type="button"
                    onClick={() => { onSwap(dayNumber, index, candidate); setShowSwap(false); }}
                    className="w-full flex items-center gap-2 text-left px-2.5 py-2 hover:bg-paper-sunken transition-colors"
                  >
                    {candidate.imageUrl ? (
                      <img src={candidate.imageUrl} alt="" className="w-8 h-8 rounded-xs object-cover shrink-0" />
                    ) : (
                      <span className="w-8 h-8 rounded-xs bg-paper-sunken grid place-items-center shrink-0">
                        <CategoryIcon category={candidate.category} className="w-3 h-3 text-ink-faint" />
                      </span>
                    )}
                    <span className="text-[13px] flex-1 truncate">{candidate.title}</span>
                    <span className="figure text-ink-faint">{candidate.viewsPerDay.toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

export default function ItineraryView({
  itinerary, activeDay, unused, selectedPlace, onSelect, onHoverPlace, onFocusDay,
  onReorder, onMoveToDay, onRemove, onSwap,
}: ItineraryViewProps) {
  return (
    <section aria-label="Itinerary" className="space-y-3">
      <header className="flex items-baseline justify-between">
        <h2 className="display text-[24px]">Itinerary</h2>
        <span className="figure text-ink-faint" aria-live="polite">
          {itinerary.days.length} days · {itinerary.totalTravelKm}km between stops
        </span>
      </header>

      <div className="space-y-2.5">
        {itinerary.days.map((day) => {
          const dimmed = activeDay !== null && activeDay !== day.day;

          return (
            <article
              key={day.day}
              onMouseEnter={() => onFocusDay(day.day)}
              onMouseLeave={() => onFocusDay(null)}
              className={`border border-rule rounded-sm bg-paper-raised overflow-hidden transition-opacity ${
                dimmed ? "opacity-45" : "opacity-100"
              }`}
            >
              {/* The colour bar ties this day to its markers on the map. */}
              <div
                className="flex items-center gap-2.5 px-3 py-2 border-b border-rule"
                style={{ boxShadow: `inset 3px 0 0 0 ${dayColour(day.day)}` }}
              >
                <span
                  className="figure w-5 h-5 grid place-items-center rounded-full text-[10px] font-medium shrink-0"
                  style={{ background: dayColour(day.day), color: "hsl(var(--paper))" }}
                  aria-hidden
                >
                  {day.day}
                </span>
                <h3 className="text-[14px] font-semibold tracking-tight flex-1 min-w-0 truncate">
                  {day.title}
                </h3>
                <span className="figure text-ink-faint shrink-0">{day.travelKm}km</span>
              </div>

              <ul className="px-3 divide-y divide-rule">
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
                    isSelected={selectedPlace?.title === place.title}
                    onSelect={onSelect}
                    onHover={onHoverPlace}
                    onReorder={onReorder}
                    onMoveToDay={onMoveToDay}
                    onRemove={onRemove}
                    onSwap={onSwap}
                  />
                ))}
              </ul>

              {day.note && (
                <p className="text-[12.5px] text-ink-soft leading-relaxed px-3 py-2.5 border-t border-rule bg-paper-sunken/40">
                  {day.note}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {(itinerary.droppedForPace > 0 || itinerary.unscheduledDays > 0) && (
        <div className="space-y-1.5">
          {itinerary.droppedForPace > 0 && (
            <p className="figure text-ink-faint flex items-start gap-2 border border-rule rounded-sm px-3 py-2">
              <Hourglass className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden />
              <span>
                {itinerary.droppedForPace} more notable place
                {itinerary.droppedForPace > 1 ? "s" : ""} nearby, held back to keep your pace — swap
                one in from any stop.
              </span>
            </p>
          )}
          {itinerary.unscheduledDays > 0 && (
            <p className="figure text-warn border border-warn/40 rounded-sm px-3 py-2">
              {itinerary.unscheduledDays} day{itinerary.unscheduledDays > 1 ? "s" : ""} with nothing
              scheduled — too few notable places were found nearby.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

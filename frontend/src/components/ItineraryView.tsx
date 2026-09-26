import type { CuratedPlace, Itinerary } from "../types";
import { dayColour } from "../dayColour";

/**
 * The itinerary, as a dossier rather than a chat reply.
 *
 * Every place carries its provenance — real coordinates, a Wikipedia link, and
 * the daily pageview figure that got it selected. That is deliberate: the whole
 * point of v2 is that nothing here was invented, so the interface shows the
 * receipts instead of asking to be trusted.
 */

interface ItineraryViewProps {
  itinerary: Itinerary;
  activeDay: number | null;
  onHoverPlace: (place: CuratedPlace | null) => void;
  onFocusDay: (day: number | null) => void;
}

function PlaceRow({
  place,
  onHover,
}: {
  place: CuratedPlace;
  onHover: (p: CuratedPlace | null) => void;
}) {
  return (
    <li
      className="group py-2.5 pl-4 border-l border-rule hover:border-l-ink-faint transition-colors"
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
        <span className="figure text-ink-faint shrink-0" title="average Wikipedia pageviews per day">
          {place.viewsPerDay.toLocaleString()}/d
        </span>
      </div>

      {place.why && <p className="text-[13px] text-ink-soft mt-0.5">{place.why}</p>}

      <p className="figure text-ink-faint mt-1">
        {place.category} · {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)} ·{" "}
        {(place.distanceM / 1000).toFixed(1)}km from centre
      </p>
    </li>
  );
}

export default function ItineraryView({
  itinerary,
  activeDay,
  onHoverPlace,
  onFocusDay,
}: ItineraryViewProps) {
  return (
    <section aria-label="Itinerary" className="space-y-5">
      <header className="flex items-baseline justify-between border-b border-rule-strong pb-2">
        <h2 className="display text-[22px]">Itinerary</h2>
        <span className="figure text-ink-faint">
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
              {day.places.map((place) => (
                <PlaceRow key={place.title} place={place} onHover={onHoverPlace} />
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

      {itinerary.unscheduledDays > 0 && (
        <p className="figure text-warn border border-warn/40 rounded-sm px-3 py-2">
          {itinerary.unscheduledDays} day{itinerary.unscheduledDays > 1 ? "s" : ""} of the trip
          have nothing scheduled — too few notable places were found nearby.
        </p>
      )}
    </section>
  );
}

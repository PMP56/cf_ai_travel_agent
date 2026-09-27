import { ArrowLeft, ExternalLink, MapPin, TrendingUp, Ruler, CalendarDays } from "lucide-react";
import type { CuratedPlace, Itinerary } from "../types";
import { usePlaceDetail } from "../usePlaceDetail";
import { dayColour } from "../dayColour";

/**
 * Everything known about one place.
 *
 * Leads with the measured facts the pipeline produced — coordinates, the
 * pageview figure that earned it a slot, which day it falls on — because those
 * are what distinguish this from a travel blog. The prose and gallery beneath
 * are fetched from Wikipedia on demand and are enrichment: if they fail, the
 * grounded facts still stand on their own.
 */

interface PlaceDetailProps {
  place: CuratedPlace;
  itinerary: Itinerary | null;
  onBack: () => void;
  /**
   * The mobile sheet supplies its own header with a close control, and "back to
   * overview" means nothing there — the sheet closes onto the plan, not onto a
   * context panel. Suppress the internal one rather than stacking two headers.
   */
  hideBack?: boolean;
}

function positionInTrip(itinerary: Itinerary | null, place: CuratedPlace) {
  if (!itinerary) return null;
  for (const day of itinerary.days) {
    const index = day.places.findIndex((p) => p.title === place.title);
    if (index >= 0) return { day: day.day, stop: index + 1, total: day.places.length, title: day.title };
  }
  return null;
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-paper-raised px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3 text-ink-faint shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="eyebrow" style={{ fontSize: 9 }}>
          {label}
        </span>
      </div>
      <div className="figure text-ink mt-1">{value}</div>
    </div>
  );
}

export default function PlaceDetail({ place, itinerary, onBack, hideBack }: PlaceDetailProps) {
  const { status, detail } = usePlaceDetail(place.title);
  const position = positionInTrip(itinerary, place);

  // The lead image already travelled with the plan; the gallery may add more.
  const gallery = (detail?.images ?? []).filter((img) => img.src !== place.imageUrl);
  const hero = place.imageUrl;

  return (
    <div className="h-full overflow-y-auto">
      {!hideBack && (
        <header className="sticky top-0 z-10 bg-paper-raised/95 backdrop-blur border-b border-rule px-3 py-2">
          <button
            type="button"
            onClick={onBack}
            className="figure flex items-center gap-1.5 text-ink-soft hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3 h-3" aria-hidden />
            overview
          </button>
        </header>
      )}

      {hero && (
        <img
          src={hero}
          alt=""
          className="w-full h-40 object-cover border-b border-rule bg-paper-sunken"
        />
      )}

      <div className="px-3.5 py-3">
        {position && (
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="figure w-4 h-4 grid place-items-center rounded-full shrink-0"
              style={{ background: dayColour(position.day), color: "hsl(var(--paper))", fontSize: 9 }}
              aria-hidden
            >
              {position.day}
            </span>
            <span className="figure text-ink-faint">
              day {position.day} · stop {position.stop} of {position.total} · {position.title}
            </span>
          </div>
        )}

        <h2 className="display text-[26px] leading-tight">{place.title}</h2>
        {place.why && <p className="text-[13.5px] text-ink-soft mt-1.5">{place.why}</p>}

        {/* The provenance, stated as data. */}
        <div className="grid grid-cols-2 gap-px bg-rule border border-rule rounded-sm overflow-hidden mt-3">
          <Stat icon={MapPin} label="category" value={place.category} />
          <Stat
            icon={TrendingUp}
            label="pageviews"
            value={`${place.viewsPerDay.toLocaleString()}/day`}
          />
          <Stat
            icon={Ruler}
            label="from centre"
            value={`${(place.distanceM / 1000).toFixed(1)} km`}
          />
          <Stat
            icon={CalendarDays}
            label="coordinates"
            value={`${place.latitude.toFixed(3)}, ${place.longitude.toFixed(3)}`}
          />
        </div>

        <a
          href={place.url}
          target="_blank"
          rel="noopener noreferrer"
          className="figure flex items-center justify-center gap-1.5 mt-3 px-3 py-2 border border-rule rounded-sm text-ink-soft hover:border-accent hover:text-accent transition-colors"
        >
          Read on Wikipedia
          <ExternalLink className="w-3 h-3" aria-hidden />
        </a>

        {/* Prose: the full intro, not the two-sentence version the prompt gets. */}
        <div className="mt-4 pt-4 border-t border-rule">
          {status === "loading" && (
            <p className="figure text-ink-faint" aria-live="polite">
              loading detail from Wikipedia…
            </p>
          )}

          {status === "error" && (
            <p className="figure text-ink-faint">
              Couldn't load extra detail — the facts above still stand.
            </p>
          )}

          {detail?.extract ? (
            <p className="text-[13.5px] leading-relaxed whitespace-pre-line">{detail.extract}</p>
          ) : (
            status === "ready" &&
            place.summary && (
              <p className="text-[13.5px] leading-relaxed">{place.summary}</p>
            )
          )}
        </div>

        {gallery.length > 0 && (
          <div className="mt-4 pt-4 border-t border-rule">
            <span className="eyebrow">From the article</span>
            <ul className="mt-2 space-y-2.5">
              {gallery.map((img) => (
                <li key={img.src}>
                  <img
                    src={img.src}
                    alt={img.caption ?? img.title}
                    loading="lazy"
                    className="w-full rounded-sm border border-rule bg-paper-sunken"
                  />
                  {img.caption && (
                    <p className="figure text-ink-faint mt-1 leading-relaxed">{img.caption}</p>
                  )}
                </li>
              ))}
            </ul>
            <p className="figure text-ink-faint mt-3">images via Wikimedia Commons</p>
          </div>
        )}
      </div>
    </div>
  );
}

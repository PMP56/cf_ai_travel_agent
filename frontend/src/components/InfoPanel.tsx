import { PanelRightClose, PanelRightOpen, Info, Clock } from "lucide-react";
import type { CuratedPlace, Itinerary, PlanResult, ResolvedPlace } from "../types";
import { ClimatePanel, DestinationPanel } from "./Dossier";
import PlaceDetail from "./PlaceDetail";

/**
 * The middle column: context by default, a place dossier on demand.
 *
 * It sits between the plan and the map because that is the order you read in —
 * the itinerary says *what*, this says *about what*, the map says *where*. Both
 * of its modes were previously at the foot of the main column, where they were
 * only reached after scrolling past every day card.
 *
 * Collapsible because three columns is a lot at 1280px and the itinerary is the
 * thing people came for; collapsed it leaves a rail so the affordance survives.
 */

interface InfoPanelProps {
  result: PlanResult | null;
  itinerary: Itinerary | null;
  selectedPlace: CuratedPlace | null;
  place: ResolvedPlace | null;
  collapsed: boolean;
  onToggle: () => void;
  onClearSelection: () => void;
  /** Re-plans for a different month from the climate chart. */
  onPickMonth?: (month: string) => void;
}

/** Current wall-clock time at the destination, for the "is it open now" question. */
function localTimeIn(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
  } catch {
    return "—";
  }
}

export default function InfoPanel({
  result,
  itinerary,
  selectedPlace,
  place,
  collapsed,
  onToggle,
  onClearSelection,
  onPickMonth,
}: InfoPanelProps) {
  return (
    /* One element for both states rather than two returns, so the width can be
       transitioned. The panel inside keeps its full width while the aside
       narrows, which makes it slide out of frame instead of reflowing its
       contents on every frame of the animation. */
    <aside
      aria-label="Details"
      className={`relative hidden lg:flex flex-col min-h-0 shrink-0 overflow-hidden border-r border-rule transition-[width,background-color] duration-300 ease-out ${
        collapsed ? "w-10 bg-paper-sunken/40" : "w-[380px] xl:w-[420px] bg-paper-raised"
      }`}
    >
      <div
        aria-hidden={collapsed}
        /* inert, not just aria-hidden: the panel keeps a back button and a
           Wikipedia link, and Shift+Tab walked straight into them while it was
           hidden — focus landing on something removed from the a11y tree. */
        inert={collapsed}
        className={`flex flex-col min-h-0 h-full w-[380px] xl:w-[420px] shrink-0 transition-opacity duration-200 ${
          collapsed ? "opacity-0 pointer-events-none" : "opacity-100 delay-100"
        }`}
      >
        <header className="flex items-center gap-2 px-3 h-10 border-b border-rule shrink-0">
          <Info className="w-3.5 h-3.5 text-ink-faint shrink-0" strokeWidth={1.75} aria-hidden />
          <h2 className="eyebrow flex-1">{selectedPlace ? "Place" : "Context"}</h2>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded
            aria-label="Hide details panel"
            title="Hide details"
            tabIndex={collapsed ? -1 : 0}
            className="w-6 h-6 grid place-items-center rounded-xs text-ink-faint hover:text-ink hover:bg-paper-sunken transition-colors"
          >
            <PanelRightClose className="w-3.5 h-3.5" aria-hidden />
          </button>
        </header>

        {selectedPlace ? (
          <PlaceDetail place={selectedPlace} itinerary={itinerary} onBack={onClearSelection} />
        ) : (
          <div className="min-h-0 overflow-y-auto pb-2">
            {result?.destination && (
              <section>
                <div className="px-3.5 pb-4">
                  <DestinationPanel brief={result.destination} flat />
                </div>
              </section>
            )}

            {result?.climate && (
              <section>
                <div className="px-3.5 pb-4">
                  <ClimatePanel climate={result.climate} onPickMonth={onPickMonth} flat />
                </div>
              </section>
            )}

            {/* Small but genuinely useful, and we already know it. */}
            {place && (
              <div className="px-3.5 py-2.5 flex items-center gap-2 border-t border-rule">
                <Clock className="w-3 h-3 text-ink-faint shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="figure text-ink-faint">
                  {place.timezone.replace(/_/g, " ")} · {localTimeIn(place.timezone)} local
                </span>
              </div>
            )}

            {!result?.destination && !result?.climate && (
              <p className="figure text-ink-faint px-3.5 py-3">
                Context appears here once the plan is built. Click any place in the itinerary to see
                its detail.
              </p>
            )}
          </div>
        )}
      </div>

      {/* The collapsed rail, cross-faded against the panel so neither pops. */}
      <div
        aria-hidden={!collapsed}
        inert={!collapsed}
        className={`absolute inset-0 flex flex-col items-center transition-opacity duration-200 ${
          collapsed ? "opacity-100 delay-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={false}
          aria-label="Show details panel"
          title="Show details"
          tabIndex={collapsed ? 0 : -1}
          className="w-10 h-10 grid place-items-center text-ink-faint hover:text-ink hover:bg-paper-sunken transition-colors"
        >
          <PanelRightOpen className="w-4 h-4" aria-hidden />
        </button>
        {/* Vertical label so the collapsed rail still says what it is. */}
        <span className="eyebrow mt-2 whitespace-nowrap" style={{ writingMode: "vertical-rl" }}>
          {selectedPlace ? selectedPlace.title : "details"}
        </span>
      </div>
    </aside>
  );
}

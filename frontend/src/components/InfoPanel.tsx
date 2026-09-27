import { PanelRightClose, PanelRightOpen, Info } from "lucide-react";
import type { CuratedPlace, Itinerary, PlanResult } from "../types";
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
  collapsed: boolean;
  onToggle: () => void;
  onClearSelection: () => void;
  /** Re-plans for a different month from the climate chart. */
  onPickMonth?: (month: string) => void;
}

export default function InfoPanel({
  result,
  itinerary,
  selectedPlace,
  collapsed,
  onToggle,
  onClearSelection,
  onPickMonth,
}: InfoPanelProps) {
  if (collapsed) {
    return (
      <aside
        aria-label="Details"
        className="hidden lg:flex flex-col items-center w-10 shrink-0 border-r border-rule bg-paper-sunken/40"
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={false}
          aria-label="Show details panel"
          title="Show details"
          className="w-10 h-10 grid place-items-center text-ink-faint hover:text-ink hover:bg-paper-sunken transition-colors"
        >
          <PanelRightOpen className="w-4 h-4" aria-hidden />
        </button>
        {/* Vertical label so the collapsed rail still says what it is. */}
        <span
          className="eyebrow mt-2 whitespace-nowrap"
          style={{ writingMode: "vertical-rl" }}
        >
          {selectedPlace ? selectedPlace.title : "details"}
        </span>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Details"
      className="hidden lg:flex flex-col min-h-0 w-[340px] xl:w-[380px] shrink-0 border-r border-rule bg-paper-raised"
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
          className="w-6 h-6 grid place-items-center rounded-xs text-ink-faint hover:text-ink hover:bg-paper-sunken transition-colors"
        >
          <PanelRightClose className="w-3.5 h-3.5" aria-hidden />
        </button>
      </header>

      {selectedPlace ? (
        <PlaceDetail place={selectedPlace} itinerary={itinerary} onBack={onClearSelection} />
      ) : (
        <div className="min-h-0 overflow-y-auto p-3 space-y-3">
          {result?.destination && <DestinationPanel brief={result.destination} />}
          {result?.climate && (
            <ClimatePanel climate={result.climate} onPickMonth={onPickMonth} />
          )}
          {!result?.destination && !result?.climate && (
            <p className="figure text-ink-faint">
              Context appears here once the plan is built. Click any place in the itinerary to see
              its detail.
            </p>
          )}
        </div>
      )}
    </aside>
  );
}

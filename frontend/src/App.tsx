import { Suspense, lazy, useEffect, useState } from "react";
import { usePlanStream } from "./usePlanStream";
import type { CuratedPlace, Itinerary } from "./types";
import {
  moveToDay,
  removePlace,
  reorderWithinDay,
  swapPlace,
  unusedPlaces,
} from "./itineraryEdits";
import AgentRail from "./components/AgentRail";
import BriefBar from "./components/BriefBar";
import ItineraryView from "./components/ItineraryView";
// MapLibre is ~900kB of the bundle and the cold-start screen never shows a
// map, so it loads only once a destination has been resolved.
const MapView = lazy(() => import("./components/MapView"));
import PromptBar from "./components/PromptBar";
import {
  ClimatePanel,
  CritiquePanel,
  DestinationPanel,
  FoodPanel,
} from "./components/Dossier";

/**
 * Workspace shell.
 *
 * Three regions rather than a scrolling conversation: the dossier (left), the
 * map (right), and the pipeline telemetry that runs alongside both. The brief
 * stays on screen for the whole session because it is state, not a sent
 * message — that distinction is the entire reason this is not a chat app.
 */

function useTheme() {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
    } catch {
      // Private mode or blocked storage — fall through to the OS preference.
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      // Not being able to remember the choice is not worth breaking over.
    }
  }, [dark]);

  return [dark, setDark] as const;
}

export default function App() {
  const plan = usePlanStream();
  const [dark, setDark] = useTheme();
  const [hoveredPlace, setHoveredPlace] = useState<CuratedPlace | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);

  // Local rearrangements, tagged with the result they were made against.
  // Tying them to a base rather than clearing them in an effect means a new
  // plan supersedes them during render, with no extra pass.
  const [edit, setEdit] = useState<{ base: unknown; itinerary: Itinerary } | null>(null);

  const { result, brief, place, running } = plan;
  const started = running || brief !== null || result !== null;
  const places = result?.places ?? [];
  // Edits apply only to the result they were made against; a newer plan wins.
  const itinerary =
    (edit && edit.base === result ? edit.itinerary : null) ?? result?.itinerary ?? null;
  const unused = itinerary ? unusedPlaces(itinerary, places) : [];

  // Every edit recomputes distances, so the kilometre figures never go stale.
  const applyEdit = (next: Itinerary) => setEdit({ base: result, itinerary: next });

  return (
    <div className="h-dvh flex flex-col bg-paper text-ink overflow-hidden">
      {/* ---- Masthead ---- */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-rule-strong shrink-0">
        <div className="flex items-baseline gap-2.5">
          <span className="display text-[19px]">Field Guide</span>
          <span className="eyebrow hidden sm:inline">grounded trip planning</span>
        </div>

        <button
          type="button"
          onClick={() => setDark(!dark)}
          className="figure px-2 py-1 border border-rule rounded-xs text-ink-soft hover:border-ink-faint hover:text-ink transition-colors"
          aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
        >
          {dark ? "light" : "dark"}
        </button>
      </header>

      {!started ? (
        /* ---- Cold start: one question, centred ---- */
        <main className="flex-1 grid place-items-center px-6 overflow-y-auto">
          <div className="w-full max-w-[600px] py-12">
            <p className="eyebrow">Plan a trip</p>
            <h1 className="display text-[clamp(38px,7vw,68px)] mt-2 mb-3">
              Every place, verified.
            </h1>
            <p className="text-[14px] text-ink-soft leading-relaxed mb-7 max-w-[46ch]">
              Seven agents work in parallel over real sources — Wikipedia, Wikivoyage and
              the ERA5 climate archive. Nothing in your itinerary is invented, and you can
              watch each one report as it goes.
            </p>
            <PromptBar
              onSubmit={plan.submit}
              onCancel={plan.cancel}
              running={plan.running}
            />
          </div>
        </main>
      ) : (
        /* ---- Working view ---- */
        <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
          {/* Dossier column */}
          <div className="min-h-0 overflow-y-auto border-r border-rule">
            <div className="max-w-[760px] mx-auto px-4 py-4 space-y-4">
              <PromptBar
                onSubmit={plan.submit}
                onCancel={plan.cancel}
                running={plan.running}
                compact
              />

              {plan.error && (
                <p className="figure text-bad border border-bad/40 rounded-sm px-3 py-2">
                  {plan.error}
                </p>
              )}

              {brief && (
                <BriefBar
                  brief={brief}
                  place={place}
                  alternatives={plan.alternatives}
                  missing={result?.missing ?? []}
                  busy={plan.running}
                  onEdit={(next) => plan.replan(next, place)}
                />
              )}

              {/* Telemetry sits inline on narrow screens, in the rail on wide ones. */}
              <div className="lg:hidden">
                <AgentRail
                  agents={plan.agents}
                  running={plan.running}
                  elapsedMs={plan.elapsedMs}
                />
              </div>

              {itinerary && (
                <ItineraryView
                  itinerary={itinerary}
                  activeDay={activeDay}
                  unused={unused}
                  onHoverPlace={setHoveredPlace}
                  onFocusDay={setActiveDay}
                  onReorder={(d, i, dir) => applyEdit(reorderWithinDay(itinerary, d, i, dir))}
                  onMoveToDay={(d, i, to) => applyEdit(moveToDay(itinerary, d, i, to))}
                  onRemove={(d, i) => applyEdit(removePlace(itinerary, d, i))}
                  onSwap={(d, i, r) => applyEdit(swapPlace(itinerary, d, i, r))}
                />
              )}

              {result && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {result.destination && <DestinationPanel brief={result.destination} />}
                  {result.climate && <ClimatePanel climate={result.climate} />}
                  {result.food && <FoodPanel food={result.food} />}
                  {result.critique && <CritiquePanel critique={result.critique} />}
                </div>
              )}

              {running && !result && (
                <p className="figure text-ink-faint" aria-live="polite">
                  Working — the itinerary appears once every agent has reported.
                </p>
              )}
            </div>
          </div>

          {/* Map + telemetry rail */}
          <aside className="hidden lg:flex flex-col min-h-0">
            <div className="flex-1 min-h-0 relative">
              {place ? (
                <Suspense
                  fallback={
                    <div className="h-full grid place-items-center bg-paper-sunken">
                      <span className="figure text-ink-faint">loading map…</span>
                    </div>
                  }
                >
                  <MapView
                    place={place}
                    itinerary={itinerary}
                    places={places}
                    hoveredPlace={hoveredPlace}
                    activeDay={activeDay}
                  />
                </Suspense>
              ) : (
                <div className="h-full grid place-items-center bg-paper-sunken">
                  <span className="figure text-ink-faint">locating…</span>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-rule-strong p-3">
              <AgentRail
                agents={plan.agents}
                running={plan.running}
                elapsedMs={plan.elapsedMs}
              />
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}

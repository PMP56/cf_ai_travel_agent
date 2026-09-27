import { Suspense, lazy, useEffect, useState } from "react";
import { TriangleAlert, Eye, X } from "lucide-react";
import { useMediaQuery, DESKTOP_QUERY } from "./useMediaQuery";
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
const PlaceDetail = lazy(() => import("./components/PlaceDetail"));
import PromptBar from "./components/PromptBar";
import {
  CritiquePanel,
  FoodPanel,
  DestinationPanelInline,
  ClimatePanelInline,
} from "./components/Dossier";
import InfoPanel from "./components/InfoPanel";
import DepartureBoard from "./components/DepartureBoard";

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
  // Drives which layout is live, not merely which is visible — the map is a GL
  // context and must exist once, and place detail is a column on desktop but a
  // drawer on mobile.
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  // The board drives itself from state, so it has to be told to stop.
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [dark, setDark] = useTheme();
  const [hoveredPlace, setHoveredPlace] = useState<CuratedPlace | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);

  // Local rearrangements, tagged with the result they were made against.
  // Tying them to a base rather than clearing them in an effect means a new
  // plan supersedes them during render, with no extra pass.
  const [edit, setEdit] = useState<{ base: unknown; itinerary: Itinerary } | null>(null);

  /** Which place the detail panel is showing, if any. */
  const [selectedPlace, setSelectedPlace] = useState<CuratedPlace | null>(null);

  // Remembered, because three columns is a lot on a 1280px screen and the
  // preference is personal rather than per-trip.
  const [infoCollapsed, setInfoCollapsed] = useState(() => {
    try {
      return localStorage.getItem("infoPanel") === "collapsed";
    } catch {
      return false;
    }
  });

  const setCollapsed = (next: boolean) => {
    setInfoCollapsed(next);
    try {
      localStorage.setItem("infoPanel", next ? "collapsed" : "open");
    } catch {
      // Not remembering the preference is not worth breaking over.
    }
  };

  /** Clicking a place opens the panel if it was collapsed. */
  const selectPlace = (place: CuratedPlace) => {
    setSelectedPlace(place);
    if (infoCollapsed) setCollapsed(false);
  };

  const { result, brief, place, running } = plan;
  // `error` belongs here. Without it a failed run cleared `running` while brief
  // and result were still null, so the workspace unmounted and bounced back to
  // the cold-start screen — hiding the very message that explains what went
  // wrong, because it renders inside the workspace.
  const started = running || brief !== null || result !== null || plan.error !== null;
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
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="w-full max-w-[860px] mx-auto px-6 pt-[clamp(28px,6vh,64px)] pb-4">
            <p className="eyebrow">Plan a trip</p>
            <h1 className="display text-[clamp(40px,6.5vw,76px)] mt-2 mb-4">
              Every place, verified.
            </h1>
            <p className="text-[15px] text-ink-soft leading-relaxed mb-8 max-w-[52ch]">
              Seven agents work in parallel over real sources. Nothing in your itinerary is
              invented — every place carries its coordinates, its photograph and a link to
              where it came from.
            </p>

            <PromptBar onSubmit={plan.submit} onCancel={plan.cancel} running={plan.running} />

            <button
              type="button"
              onClick={plan.showSample}
              className="figure mt-3 inline-flex items-start gap-1.5 text-left px-2.5 py-1.5 border border-rule rounded-xs text-ink-soft hover:border-ink-faint hover:text-ink transition-colors"
            >
              {/* items-start, not items-center: on a narrow screen the label
                  wraps to two lines and a centred icon floats away from it. */}
              <Eye className="w-3 h-3 mt-0.5 shrink-0" aria-hidden />
              see a finished plan — no account, no waiting
            </button>

            {/* The sources are the product's argument, so they get stated up front. */}
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px mt-10 bg-rule border border-rule rounded-sm overflow-hidden">
              {[
                ["Wikipedia", "places, ranked by real pageviews"],
                ["Wikivoyage", "human-written local guides"],
                ["ERA5", "five-year climate normals"],
                ["OpenStreetMap", "the map beneath it all"],
              ].map(([name, what]) => (
                <div key={name} className="bg-paper-raised px-3 py-3">
                  <dt className="text-[13px] font-semibold tracking-tight">{name}</dt>
                  <dd className="figure text-ink-faint mt-1 leading-relaxed">{what}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Anchors the foot of the page, which was a large empty area. */}
          <div className="mt-auto pb-10 pt-8">
            <DepartureBoard reduced={reducedMotion} />
          </div>
        </main>
      ) : (
        /* ---- Working view ---- */
        <main className="flex-1 min-h-0 flex">
          {/* Dossier column */}
          <div className="flex-1 min-w-0 min-h-0 overflow-y-auto border-r border-rule">
            <div className="max-w-[900px] mx-auto px-5 py-4 space-y-5">
              <PromptBar
                onSubmit={plan.submit}
                onCancel={plan.cancel}
                running={plan.running}
                compact
              />

              {plan.error && (
                <div
                  role="alert"
                  className="border border-bad/40 bg-bad/5 rounded-sm px-4 py-3 flex gap-3"
                >
                  <TriangleAlert className="w-4 h-4 text-bad shrink-0 mt-0.5" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[13.5px] text-ink leading-relaxed">{plan.error}</p>
                    <button
                      type="button"
                      onClick={plan.reset}
                      className="figure mt-2 px-2 py-1 border border-rule-strong rounded-xs text-ink-soft hover:border-ink-faint hover:text-ink transition-colors"
                    >
                      start over
                    </button>
                  </div>
                </div>
              )}

              {plan.isSample && (
                <div className="flex items-center gap-2 border border-accent/40 bg-accent/5 rounded-sm px-3 py-2">
                  <Eye className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden />
                  <p className="figure text-ink-soft flex-1">
                    Sample plan — real places and real data, generated earlier. Nothing is running.
                  </p>
                  <button
                    type="button"
                    onClick={plan.reset}
                    className="figure px-2 py-1 border border-rule-strong rounded-xs hover:border-ink-faint transition-colors"
                  >
                    plan your own
                  </button>
                </div>
              )}

              {brief && (
                <BriefBar
                  brief={brief}
                  place={place}
                  alternatives={plan.alternatives}
                  busy={plan.running}
                  onEdit={(next) => plan.replan(next, place)}
                />
              )}

              {/* Telemetry sits inline on narrow screens, in the rail on wide
                  ones. Once the run finishes it collapses: seven completed rows
                  above the itinerary is a lot of scrolling on a phone. */}
              {(plan.running || !result) && (
                <div className="lg:hidden">
                  <AgentRail
                    agents={plan.agents}
                    running={plan.running}
                    elapsedMs={plan.elapsedMs}
                  />
                </div>
              )}

              {/* Below lg there is no map column, and a trip planner without a
                  map is missing half the point — so it renders inline here
                  instead, at a height that is usable without swallowing the
                  screen. Only one instance exists either way. */}
              {place && !isDesktop && (
                <div className="lg:hidden h-[260px] rounded-sm overflow-hidden border border-rule relative">
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
                </div>
              )}

              {itinerary && (
                <ItineraryView
                  itinerary={itinerary}
                  activeDay={activeDay}
                  unused={unused}
                  selectedPlace={selectedPlace}
                  onSelect={selectPlace}
                  onHoverPlace={setHoveredPlace}
                  onFocusDay={setActiveDay}
                  onReorder={(d, i, dir) => applyEdit(reorderWithinDay(itinerary, d, i, dir))}
                  onMoveToDay={(d, i, to) => applyEdit(moveToDay(itinerary, d, i, to))}
                  onRemove={(d, i) => applyEdit(removePlace(itinerary, d, i))}
                  onSwap={(d, i, r) => applyEdit(swapPlace(itinerary, d, i, r))}
                />
              )}

              <div className="lg:hidden space-y-3">
                {result?.destination && <DestinationPanelInline brief={result.destination} />}
                {result?.climate && <ClimatePanelInline climate={result.climate} />}
              </div>

              {result && !plan.running && (
                <details className="lg:hidden">
                  <summary className="figure text-ink-faint cursor-pointer py-1">
                    how this was built — 7 agents, real sources
                  </summary>
                  <div className="mt-2">
                    <AgentRail
                      agents={plan.agents}
                      running={plan.running}
                      elapsedMs={plan.elapsedMs}
                    />
                  </div>
                </details>
              )}

              {result && (result.food || result.critique) && (
                <div className="grid lg:grid-cols-2 gap-3">
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

          <InfoPanel
            result={result}
            itinerary={itinerary}
            selectedPlace={selectedPlace}
            place={place}
            collapsed={infoCollapsed}
            onToggle={() => setCollapsed(!infoCollapsed)}
            onClearSelection={() => setSelectedPlace(null)}
            onPickMonth={
              brief ? (month) => plan.replan({ ...brief, travelMonth: month }, place) : undefined
            }
          />

          {/* Map + telemetry rail */}
          <aside className="hidden lg:flex flex-col min-h-0 w-[380px] xl:w-[420px] shrink-0">
            <div className="flex-1 min-h-0 relative">
              {place && isDesktop ? (
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

      {/* Mobile place detail. On desktop this lives in the middle column; here
          there is no room for a third column, so it becomes a sheet. */}
      {selectedPlace && !isDesktop && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-paper flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label={`Details for ${selectedPlace.title}`}
        >
          <header className="flex items-center gap-2 px-4 h-12 border-b border-rule-strong shrink-0">
            <span className="eyebrow flex-1">Place</span>
            <button
              type="button"
              onClick={() => setSelectedPlace(null)}
              aria-label="Close details"
              className="w-8 h-8 grid place-items-center rounded-xs text-ink-soft hover:text-ink hover:bg-paper-sunken transition-colors"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </header>
          <div className="flex-1 min-h-0">
            <Suspense
              fallback={
                <p className="figure text-ink-faint p-4">loading…</p>
              }
            >
              <PlaceDetail
                place={selectedPlace}
                itinerary={itinerary}
                onBack={() => setSelectedPlace(null)}
                hideBack
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}

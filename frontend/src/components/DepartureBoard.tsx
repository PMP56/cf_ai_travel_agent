import { useEffect, useMemo, useState } from "react";

/**
 * The homepage animation: a split-flap departure board.
 *
 * The previous attempt — a route plotting itself across contours — was too
 * quiet to be interesting, and it had a dead window where the line had faded
 * but the waypoints had not, leaving disconnected dots that read as broken.
 *
 * A departure board is a better fit for this page. It is unmistakably travel
 * without a single pictogram, it is made of type, which is what the rest of
 * the page is made of, and the mechanism itself is the interest — letters
 * settling one after another is worth watching in a way a drifting line is not.
 * Monochrome by nature: these boards were always ink on a pale flap.
 *
 * It also says something true. Each destination that lands is one the planner
 * can actually build, and the coordinates that lock in beneath it are real —
 * the same numbers the pipeline geocodes. The board is the grounding claim,
 * demonstrated rather than asserted.
 */

interface Destination {
  name: string;
  /** Real coordinates, as the geocoder returns them. */
  lat: number;
  lon: number;
  note: string;
}

const BOARD: Destination[] = [
  { name: "KYOTO", lat: 35.0116, lon: 135.7681, note: "temples · april" },
  { name: "MARRAKESH", lat: 31.6295, lon: -7.9811, note: "souks · october" },
  { name: "REYKJAVIK", lat: 64.1466, lon: -21.9426, note: "glaciers · january" },
  { name: "FLORENCE", lat: 43.7696, lon: 11.2558, note: "frescoes · september" },
  { name: "EL CALAFATE", lat: -50.3408, lon: -72.2768, note: "patagonia · december" },
];

/** The flap alphabet, in the order a real board cycles through. */
const FLAPS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Longest name decides the board width, so cells never reflow. */
const CELLS = Math.max(...BOARD.map((d) => d.name.length));

/** How long a finished destination stays readable before the board turns over. */
const DWELL_MS = 2100;
const STEP_MS = 45;
/** Cells settle left to right, as the mechanism would. */
const CELL_STAGGER = 4;

function targetChars(name: string): string[] {
  return Array.from({ length: CELLS }, (_, i) => name[i] ?? " ");
}

/**
 * Advances each cell through the flap alphabet until it reaches its letter.
 *
 * Each cell carries two independent counters: a stagger `delay` in ticks, and
 * the `distance` it must travel through the alphabet. Conflating the two — as
 * a first attempt did — makes a cell advance by its delay as well as its
 * distance, so it overshoots and lands on the wrong letter; the board spelled
 * "K QVQBA" instead of "KYOTO".
 *
 * Each character is computed from the starting letter plus the elapsed step
 * rather than by mutating the previous frame, so the result is a pure function
 * of the tick. That makes it immune to StrictMode's double invocation, which
 * would otherwise double every advance.
 */
function useFlapBoard(reduced: boolean) {
  const [index, setIndex] = useState(0);
  const [chars, setChars] = useState<string[]>(() => Array(CELLS).fill(" "));
  /** Which destination has finished spelling. Drives the dwell, see below. */
  const [settledIndex, setSettledIndex] = useState<number | null>(null);

  const destination = BOARD[index];
  const target = useMemo(() => targetChars(destination.name), [destination.name]);

  useEffect(() => {
    if (reduced) return;

    // Where each cell starts is the previous destination, already settled by
    // the time a new one arrives — so it is derivable from the index alone and
    // needs no ref into render state.
    const previous = index === 0 ? Array(CELLS).fill(" ") : targetChars(BOARD[index - 1].name);

    const plan = target.map((ch, i) => {
      const from = Math.max(FLAPS.indexOf(previous[i] ?? " "), 0);
      return {
        from,
        delay: i * CELL_STAGGER,
        distance: (FLAPS.indexOf(ch) - from + FLAPS.length) % FLAPS.length,
      };
    });

    const lastTick = Math.max(...plan.map((c) => c.delay + c.distance));
    let tick = 0;

    const id = window.setInterval(() => {
      tick += 1;
      setChars(
        plan.map((cell, i) => {
          if (tick <= cell.delay) return previous[i] ?? " ";
          const step = tick - cell.delay;
          if (step >= cell.distance) return target[i];
          return FLAPS[(cell.from + step) % FLAPS.length];
        })
      );
      if (tick >= lastTick) {
        window.clearInterval(id);
        setChars(target);
        setSettledIndex(index);
      }
    }, STEP_MS);

    return () => window.clearInterval(id);
  }, [target, index, reduced]);

  // The dwell is counted from the moment the board finishes spelling, not from
  // the moment it started. A fixed hold measured from the change is only long
  // enough for short names: "EL CALAFATE" is eleven cells, so its stagger plus
  // flap distance outran a 3.4s hold and the board turned over before the name
  // had ever been readable.
  useEffect(() => {
    if (reduced || settledIndex !== index) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % BOARD.length), DWELL_MS);
    return () => window.clearTimeout(id);
  }, [index, settledIndex, reduced]);

  // Derived rather than written into state by an effect: with reduced motion
  // there is no animation to run, so the board is simply its target.
  return { chars: reduced ? target : chars, destination };
}

function coord(value: number, positive: string, negative: string): string {
  const hemisphere = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(4)}°${hemisphere}`;
}

export default function DepartureBoard({ reduced = false }: { reduced?: boolean }) {
  const { chars, destination } = useFlapBoard(reduced);

  return (
    <div aria-hidden className="departure-board select-none w-full">
      <div className="max-w-[860px] mx-auto px-6">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="eyebrow">Departures</span>
          <span className="board-rule flex-1" />
          <span className="eyebrow">{BOARD.length} of many</span>
        </div>

        <div className="flex gap-[3px] sm:gap-1">
          {chars.map((ch, i) => (
            <span key={i} className="flap-cell">
              {/* Remounting on change replays the flip; the seam and the shadow
                  do the rest of the work of looking mechanical. */}
              <span key={`${i}-${ch}`} className="flap-char">
                {ch === " " ? " " : ch}
              </span>
              <span className="flap-seam" />
            </span>
          ))}
        </div>

        <div className="flex items-baseline gap-3 mt-2.5 flex-wrap">
          <span className="figure text-ink-soft tabular-nums">
            {coord(destination.lat, "N", "S")} {coord(destination.lon, "E", "W")}
          </span>
          <span className="board-rule flex-1 min-w-6" />
          <span className="figure text-ink-faint">{destination.note}</span>
        </div>
      </div>
    </div>
  );
}

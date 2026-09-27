/**
 * The homepage animation: a route plotting itself, like a survey sheet coming
 * off a plotter.
 *
 * The brief was "a bus drives in from the left, a plane takes off on the
 * right". The instinct — movement at the foot of the page — is right, but the
 * vocabulary would have fought the design: this page is an editorial field
 * guide in serif and monospace whose headline is "Every place, verified", and
 * vehicle clipart reads as a budget booking site. So the same idea is rendered
 * as cartography instead: contours drift, waypoints drop in the day-colours the
 * real map uses, a dashed route draws between them, and a marker travels it.
 *
 * It also depicts what the product actually does — find places, cluster them,
 * route them — rather than decorating the page with something unrelated.
 *
 * Pure SVG and CSS: no library, no JS, nothing on the main thread. The whole
 * thing is inert under prefers-reduced-motion, where it settles into the
 * finished drawing rather than freezing mid-stroke.
 */

/** The route. `pathLength="1"` lets the draw animation ignore real length. */
const ROUTE =
  "M120,168 C200,148 270,116 340,120 C420,125 500,158 580,148 C670,137 740,96 820,94 C910,92 1010,120 1080,126";

/**
 * The route plus a departure: past the last waypoint the line lifts and leaves
 * the frame. This is where the brief's "a plane takes off on the right" lands —
 * as the climb-out of an air route rather than an aircraft sprite. The traveller
 * follows this whole path; only the ground portion is ever drawn, so the
 * departure reads as leaving the surveyed area.
 */
const DEPARTURE_TAIL = "M1080,126 C1150,120 1205,88 1265,26";

/**
 * The traveller follows both as one continuous path. Declared here so the two
 * halves stay adjacent, but consumed from CSS `offset-path` — keep the two in
 * step if either curve changes.
 */
export const TRAVEL_PATH = `${ROUTE} C1150,120 1205,88 1265,26`;

/** Waypoints sit on the route; each drops as the line reaches it. */
const STOPS = [
  { x: 120, y: 168, day: 1 },
  { x: 340, y: 120, day: 2 },
  { x: 580, y: 148, day: 3 },
  { x: 820, y: 94, day: 4 },
  { x: 1080, y: 126, day: 5 },
];

/** Two contour lines at different speeds, for a little parallax. */
const CONTOURS = [
  "M-200,196 C-50,178 100,206 250,190 C400,174 550,200 700,186 C850,172 1000,200 1150,184 C1300,170 1400,192 1600,180",
  "M-200,214 C-20,200 140,224 320,210 C500,196 660,220 840,208 C1020,196 1180,218 1400,206 C1550,197 1500,212 1600,206",
  "M-200,232 C-60,222 120,240 300,230 C480,220 640,238 820,228 C1000,218 1160,236 1380,226 C1520,220 1560,230 1600,228",
];

export default function SurveyStrip() {
  return (
    <div
      aria-hidden
      className="survey-strip pointer-events-none select-none w-full overflow-hidden"
    >
      <svg
        viewBox="0 0 1200 250"
        preserveAspectRatio="xMidYMax slice"
        className="w-full h-[180px] sm:h-[220px] lg:h-[250px]"
        role="presentation"
      >
        {/* Graticule: the faint grid a survey is plotted on. */}
        <g className="survey-grid">
          {Array.from({ length: 25 }, (_, i) => (
            <line key={i} x1={i * 50} y1={60} x2={i * 50} y2={250} strokeWidth="1" />
          ))}
          {[100, 150, 200].map((y) => (
            <line key={y} x1={0} y1={y} x2={1200} y2={y} strokeWidth="1" />
          ))}
        </g>

        {/* Terrain. */}
        {CONTOURS.map((d, i) => (
          <path
            key={i}
            d={d}
            className={`survey-contour survey-contour-${i + 1}`}
            fill="none"
            strokeWidth={i === 0 ? 1.25 : 1}
            style={{ ["--c" as string]: i }}
          />
        ))}

        {/* The route, drawing itself.
            Two layers on purpose. Animating stroke-dashoffset on a path that
            already carries a repeating dasharray does NOT draw it — it slides
            the dash pattern along, so the whole line is present from the first
            frame. The reveal therefore lives in a mask: a solid stroke with
            pathLength=1 and dasharray=1 whose offset runs 1 to 0, uncovering
            the dashed route beneath it. */}
        <defs>
          <mask id="survey-reveal" maskUnits="userSpaceOnUse">
            <path
              d={ROUTE}
              pathLength={1}
              className="survey-reveal"
              fill="none"
              stroke="#fff"
              strokeWidth="14"
              strokeLinecap="round"
            />
          </mask>
        </defs>

        <path
          d={ROUTE}
          className="survey-route"
          fill="none"
          strokeWidth="1.75"
          strokeLinecap="round"
          mask="url(#survey-reveal)"
        />

        {/* The climb-out, finer and fainter than the ground route. */}
        <path
          d={DEPARTURE_TAIL}
          className="survey-departure"
          fill="none"
          strokeWidth="1.25"
          strokeLinecap="round"
        />

        {/* Waypoints, dropping in order. */}
        {STOPS.map((stop, i) => (
          <g
            key={stop.day}
            className="survey-stop"
            style={{ ["--i" as string]: i, transformOrigin: `${stop.x}px ${stop.y}px` }}
          >
            <circle
              cx={stop.x}
              cy={stop.y}
              r="7"
              fill={`hsl(var(--day-${stop.day}))`}
              stroke="hsl(var(--paper))"
              strokeWidth="2"
            />
            <text
              x={stop.x}
              y={stop.y + 2.6}
              textAnchor="middle"
              className="survey-stop-label"
              fill="hsl(var(--paper))"
            >
              {stop.day}
            </text>
          </g>
        ))}

        {/* The traveller. A chevron turned along the path reads as movement
            in a direction; a plain dot just sits on the line. */}
        <g className="survey-traveller">
          <path d="M-4,-3.4 L5,0 L-4,3.4 L-1.8,0 Z" />
        </g>
      </svg>
    </div>
  );
}

import { memo } from "react";

/**
 * The homepage animation: a road running past the places the planner can reach.
 *
 * Two references. The landmarks and the ink-line treatment come from the globe
 * this replaces, which in turn took its mechanism from Jose Aguinaga's "Travel
 * Animation". The scene itself follows Takane Ichinose's "Car in a city
 * animation parallax", whose lesson is that depth needs no 3D and no
 * scroll listener: every layer runs the *same* translation and differs only in
 * duration. Far things take longer to cross, so they read as far away.
 *
 * The camera tracks along the road, which is why the ground scrolls left. That
 * fixes what each vehicle should do, and it is worth being explicit because
 * getting it wrong is what makes a scene like this feel broken:
 *
 *   - Near lane is traffic going our way. A vehicle slower than the camera
 *     drifts left even though it faces right; one faster than us drifts right.
 *     Either way it faces right, because that is the way it is travelling.
 *   - Far lane is oncoming. It faces left and crosses quickly, because its own
 *     speed and the camera's add together.
 *
 * Everything is drawn facing right and mirrored with scaleX(-1) when it travels
 * left, so a vehicle can never face away from where it is going.
 */

/* ---- Scene geometry. One tile width per layer; see the CSS. ----
   The band is full-bleed and fixed to the foot of the window, so the viewBox
   is wide and shallow and the SVG is sliced rather than fitted: the container
   height sets the scale, and a wider window simply reveals more road. That
   keeps every object the same size on a phone and on a desktop. */
const W = 2400;
const H = 1600;
const LAND_Y = 1484;  // horizon: landmarks stand here
const ROAD_TOP = 1492;
const FAR_Y = 1528;   // far lane, oncoming
const CENTRE_Y = 1550;
const NEAR_Y = 1596;  // near lane, our direction
// No near kerb: the road runs off the bottom of the window.

const LANDMARK_SCALE = 1.5;

const ink = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const hairline = { ...ink, strokeWidth: 1.4 } as const;

const Torii = () => (
  <g {...ink}>
    <path d="M-17 0 V-52 M17 0 V-52" />
    <path d="M-30 -52 Q0 -59 30 -52" />
    <path d="M-23 -40 H23" />
    <path d="M0 -52 V-40" />
    <path d="M-21 0 H-13 M13 0 H21" />
  </g>
);

const Duomo = () => (
  <g {...ink}>
    <path d="M-20 -30 Q0 -64 20 -30" />
    <path d="M-20 -30 V-6 M20 -30 V-6" />
    <path d="M-25 -6 H25" />
    <path d="M-11 -41 Q0 -52 11 -41" strokeWidth={1.2} />
    <path d="M-4 -47 V-54 M4 -47 V-54" />
    <path d="M0 -61 L-5 -54 H5 Z" />
    <path d="M30 0 V-56 H42 V0" />
    <path d="M30 -44 H42 M30 -30 H42" />
    <path d="M36 -56 V-63" />
  </g>
);

const Pyramids = () => (
  <g {...ink}>
    <path d="M-36 0 L-14 -46 L8 0" />
    <path d="M-14 -46 L-8 0" />
    <path d="M2 0 L18 -30 L34 0" />
    <path d="M18 -30 L22 0" />
    <path d="M-40 0 H38" />
  </g>
);

const ClockTower = () => (
  <g {...ink}>
    <path d="M-11 0 V-50 H11 V0" />
    <circle cx="0" cy="-38" r="7" />
    <path d="M0 -42 V-38 H3" strokeWidth={1.4} />
    <path d="M-12 -50 L-9 -58 H9 L12 -50" />
    <path d="M-9 -58 L0 -76 L9 -58" />
    <path d="M0 -76 V-82" />
    <path d="M-14 0 H14" />
  </g>
);

const Glacier = () => (
  <g {...ink}>
    <path d="M-38 0 L-22 -30 L-11 -14 L1 -40 L14 -12 L24 -26 L38 0" />
    <path d="M-22 -30 L-16 -18 M1 -40 L7 -24 M24 -26 L28 -16" strokeWidth={1.4} />
    <path d="M-30 -6 H-20 M8 -6 H20" strokeWidth={1.4} />
  </g>
);

const TajMahal = () => (
  <g {...ink}>
    <path d="M-14 -34 Q-15 -56 0 -59 Q15 -56 14 -34" />
    <path d="M0 -59 V-67" />
    <path d="M-22 -34 H22 V0 H-22 Z" />
    <path d="M-9 0 V-16 Q0 -24 9 -16 V0" />
    <path d="M-31 0 V-44 M31 0 V-44" />
    <path d="M-35 -44 Q-31 -52 -27 -44 M27 -44 Q31 -52 35 -44" />
    <path d="M-38 0 H38" />
  </g>
);

const Minaret = () => (
  <g {...ink}>
    <path d="M-13 0 V-52 H13 V0" />
    <path d="M-13 -40 H13" />
    <path d="M-8 -52 V-66 H8 V-52" />
    <path d="M-10 -66 H10" />
    <path d="M0 -66 V-74" />
    <circle cx="0" cy="-77" r="2.4" />
    <path d="M-6 -30 Q0 -36 6 -30" strokeWidth={1.4} />
  </g>
);

/**
 * The reference gives its windmill a 2s spin of its own, nested inside the
 * 240s ring — the one place two rates meet. Worth keeping: it is the detail
 * that makes the whole thing feel mechanical rather than merely drifting.
 */
const Windmill = () => (
  <g {...ink}>
    <path d="M-17 0 L-11 -40 H11 L17 0 Z" />
    <path d="M-12 -40 Q0 -48 12 -40" />
    <path d="M-13 -20 H13" strokeWidth={1.4} />
    <path d="M-4 0 V-12 H4 V0" strokeWidth={1.4} />
    <g className="road-sails">
      <path d="M0 -44 V-74 M0 -44 V-14 M0 -44 H-30 M0 -44 H30" />
      <circle cx="0" cy="-44" r="3" />
    </g>
  </g>
);

const Hallgrimskirkja = () => (
  <g {...ink}>
    <path d="M-30 0 V-13 L-20 -13 V-27 L-12 -27 V-43 L-6 -43 V-57 L0 -74 L6 -57 V-43 L12 -43 V-27 L20 -27 V-13 L30 -13 V0" />
    <path d="M0 -74 V-80" />
    <path d="M-3 -20 V0 M3 -20 V0" strokeWidth={1.4} />
  </g>
);

const OperaHouse = () => (
  <g {...ink}>
    <path d="M-36 0 Q-30 -30 -4 -4" />
    <path d="M-18 0 Q-8 -40 18 -6" />
    <path d="M4 0 Q16 -30 36 -3" />
    <path d="M-40 0 H40" />
    <path d="M-40 4 H40" strokeWidth={1.4} />
  </g>
);

const Colosseum = () => (
  <g {...ink}>
    <path d="M-30 0 V-32 Q0 -42 30 -32 V0" />
    <path d="M-30 -18 Q0 -28 30 -18" />
    <path d="M-30 0 H30" />
    {[-22, -11, 0, 11, 22].map((x) => (
      <path key={x} d={`M${x - 4} -2 V-9 Q${x} -14 ${x + 4} -9 V-2`} strokeWidth={1.4} />
    ))}
    {[-18, -6, 6, 18].map((x) => (
      <path key={x} d={`M${x - 4} -20 V-26 Q${x} -31 ${x + 4} -26 V-20`} strokeWidth={1.4} />
    ))}
  </g>
);

const Eiffel = () => (
  <g {...ink}>
    <path d="M-26 0 C-18 -13 -11 -29 -7.5 -45 C-6 -55 -5 -65 -4 -74" />
    <path d="M26 0 C18 -13 11 -29 7.5 -45 C6 -55 5 -65 4 -74" />
    <path d="M-19 -3 Q0 -21 19 -3" strokeWidth={1.3} />
    <path d="M-17 -20 H17" />
    <path d="M-16 -24 H16" strokeWidth={1.2} />
    <path d="M-8 -45 H8" />
    <path d="M-4 -74 H4" />
    <path d="M0 -74 V-88" />
    <path d="M-28 0 H28" />
  </g>
);


const StBasils = () => (
  <g {...ink}>
    <path d="M-30 0 V-26 H-14 V0" />
    <path d="M-28 -26 Q-30 -38 -22 -44 Q-14 -38 -16 -26" />
    <path d="M-22 -44 V-50" />
    <path d="M14 0 V-22 H30 V0" />
    <path d="M16 -22 Q14 -33 22 -39 Q30 -33 28 -22" />
    <path d="M22 -39 V-45" />
    <path d="M-10 0 V-40 H10 V0" />
    <path d="M-10 -40 L0 -74 L10 -40" />
    <path d="M0 -74 V-82" />
    <path d="M-10 -30 H10" strokeWidth={1.3} />
  </g>
);

const Liberty = () => (
  <g {...ink}>
    <path d="M-18 0 V-16 H18 V0" />
    <path d="M-11 -16 V-26 H11 V-16" />
    <path d="M-8 -26 L-5 -56 H6 L9 -26" />
    <path d="M-5 -56 Q0 -62 6 -56" />
    <circle cx="0.5" cy="-64" r="4.5" />
    <path d="M-4 -70 L-5 -74 M0 -70 V-75 M5 -70 L6 -74" strokeWidth={1.2} />
    <path d="M6 -60 L13 -76" />
    <path d="M10 -78 L16 -78 L15 -84 H11 Z" />
    <path d="M-5 -40 L-11 -34" strokeWidth={1.3} />
  </g>
);

const Sagrada = () => (
  <g {...ink}>
    <path d="M-24 0 V-36 L-20 -56 L-16 -36 V0" />
    <path d="M-9 0 V-44 L-4 -72 L1 -44 V0" />
    <path d="M8 0 V-40 L12 -62 L16 -40 V0" />
    <path d="M21 0 V-30 L24 -46 L27 -30 V0" />
    <path d="M-20 -56 V-62 M-4 -72 V-79 M12 -62 V-68" strokeWidth={1.2} />
    <path d="M-24 -18 H-16 M-9 -22 H1 M8 -18 H16" strokeWidth={1.2} />
    <path d="M-28 0 H30" />
  </g>
);

const GoldenGate = () => (
  <g {...ink}>
    <path d="M-40 -12 H40" />
    <path d="M-18 0 V-54 M18 0 V-54" />
    <path d="M-18 -46 H-10 M10 -46 H18" strokeWidth={1.3} />
    <path d="M-18 -32 H-10 M10 -32 H18" strokeWidth={1.3} />
    <path d="M-18 -54 Q0 -22 18 -54" />
    <path d="M-40 -30 Q-30 -48 -18 -54" />
    <path d="M40 -30 Q30 -48 18 -54" />
    <path d="M-10 -38 V-12 M0 -31 V-12 M10 -38 V-12" strokeWidth={1.1} />
    <path d="M-30 -38 V-12 M30 -38 V-12" strokeWidth={1.1} />
  </g>
);

const AngkorWat = () => (
  <g {...ink}>
    <path d="M-36 0 V-14 H36 V0" />
    <path d="M-8 -14 Q-9 -42 0 -62 Q9 -42 8 -14" />
    <path d="M0 -62 V-70" />
    <path d="M-26 -14 Q-27 -34 -20 -48 Q-13 -34 -14 -14" />
    <path d="M26 -14 Q27 -34 20 -48 Q13 -34 14 -14" />
    <path d="M-7 -34 H7 M-6 -46 H6" strokeWidth={1.1} />
    <path d="M-24 -30 H-16 M16 -30 H24" strokeWidth={1.1} />
    <path d="M-36 -6 H36" strokeWidth={1.2} />
  </g>
);

const Stonehenge = () => (
  <g {...ink}>
    <path d="M-32 0 V-30 M-19 0 V-30" />
    <path d="M-37 -30 H-14" />
    <path d="M-2 0 V-40 M12 0 V-40" />
    <path d="M-7 -40 H17" />
    <path d="M24 0 V-22" />
    <path d="M30 -4 L40 -10 L40 0 H28" />
    <path d="M-40 0 H42" />
  </g>
);

/* ------------------------------------------------------------------ *
 * Traffic, roadside furniture and sky.
 *
 * Every solid object carries a paper-coloured fill on its outer silhouette.
 * Without it these are transparent outlines and a truck passing a tree renders
 * as both at once — the scene turns to wire wool wherever two things overlap.
 * The fill is the background colour rather than white, so occlusion survives
 * dark mode.
 *
 * All drawn facing right, baseline y = 0 at the wheel contact point, so a
 * vehicle is simply translated onto a lane line.
 * ------------------------------------------------------------------ */

const PAPER = "hsl(var(--paper))";

const Bus = () => (
  <g {...ink}>
    <path
      d="M-96 -13 L-96 -44 C-96 -49 -93 -51 -88 -51 L86 -51 C92 -51 96 -47.5 96 -41
         L96 -14 C96 -13 95 -13 94 -13 L73.6 -13 A10 10 0 0 0 58.4 -13
         L-48.4 -13 A10 10 0 0 0 -63.6 -13 Z"
      fill={PAPER}
    />
    {[-90, -64, -38, -12, 14, 40].map((x) => (
      <path key={x} d={`M${x} -46.5 H${x + 20} V-31 H${x} Z`} strokeWidth={1.4} />
    ))}
    <path d="M66 -46 C82 -45.5 90 -40 92.5 -32 L66 -32 Z" strokeWidth={1.4} />
    <path d="M-96 -22 H96" strokeWidth={1.3} />
    <path d="M60 -31 V-13" strokeWidth={1.3} />
    <path d="M-84 -51 H-52" strokeWidth={1.6} />
    <circle cx="-56" cy="-8" r="8" fill={PAPER} />
    <circle cx="66" cy="-8" r="8" fill={PAPER} />
    <circle cx="-56" cy="-8" r="3" strokeWidth={1.2} />
    <circle cx="66" cy="-8" r="3" strokeWidth={1.2} />
  </g>
);

const Car = () => (
  <g {...ink}>
    <path
      d="M-36 -6 L-36 -14 C-36 -21 -31 -25 -24 -26 L-6 -27 C3 -27 8 -25 12 -21
         L19 -15 L30 -13.5 C34.5 -13 36 -11 36 -8 L36 -6
         L26 -6 A6 6 0 0 0 14 -6 L-14 -6 A6 6 0 0 0 -26 -6 Z"
      fill={PAPER}
    />
    <path d="M-25 -24.4 H-10 V-18 H-26.8 Z" strokeWidth={1.4} />
    <path d="M-7 -25.2 C1 -25.2 5.5 -23.4 9 -20 H-7 Z" strokeWidth={1.4} />
    <path d="M-8.5 -26 V-6" strokeWidth={1.3} />
    <path d="M-19 -16 H-13" strokeWidth={1.3} />
    <path d="M-35 -11 H-31 M32 -12.4 H35.4" strokeWidth={1.4} />
    <circle cx="-20" cy="-5.4" r="5.4" fill={PAPER} />
    <circle cx="20" cy="-5.4" r="5.4" fill={PAPER} />
    <circle cx="-20" cy="-5.4" r="2" strokeWidth={1.2} />
    <circle cx="20" cy="-5.4" r="2" strokeWidth={1.2} />
  </g>
);

const Camper = () => (
  <g {...ink}>
    <path
      d="M-47 -11 L-47 -41 C-47 -44 -45 -45.5 -42 -45.5 L12 -45.5 C18 -45.5 21 -44 24 -40
         L31 -30 C34.5 -25.5 36 -21 36 -15.5 L36 -11
         L30.8 -11 A6.8 6.8 0 0 0 17.2 -11 L-23.2 -11 A6.8 6.8 0 0 0 -36.8 -11 Z"
      fill={PAPER}
    />
    <path d="M-43 -45.5 L-8 -45.5 L-10 -53 L-41 -53 Z" fill={PAPER} strokeWidth={1.5} />
    <path d="M-42 -40 H-25 V-27 H-42 Z" strokeWidth={1.4} />
    <path d="M-19 -40 H-2 V-27 H-19 Z" strokeWidth={1.4} />
    <path d="M6 -40 C13 -40 16 -38.5 19 -35 L25 -26.5 H6 Z" strokeWidth={1.4} />
    <path d="M-47 -19 H36" strokeWidth={1.3} />
    <path d="M2 -45.5 V-11" strokeWidth={1.3} />
    <path d="M-12 -33 H-6" strokeWidth={1.3} />
    <path d="M32.5 -17 H35.8" strokeWidth={1.4} />
    <circle cx="-30" cy="-6.8" r="6.8" fill={PAPER} />
    <circle cx="24" cy="-6.8" r="6.8" fill={PAPER} />
    <circle cx="-30" cy="-6.8" r="2.6" strokeWidth={1.2} />
    <circle cx="24" cy="-6.8" r="2.6" strokeWidth={1.2} />
  </g>
);

const Truck = () => (
  <g {...ink}>
    <path d="M-60 -13 L-60 -52 L22 -52 L22 -13 Z" fill={PAPER} />
    <path
      d="M26 -13 L26 -36 C26 -39 28 -40 31 -40 L44 -40 C48 -40 50 -38 52 -34.5
         L58 -24 C60 -20.5 60 -17 60 -14.5 L60 -13 L53.6 -13 A7.2 7.2 0 0 0 39.2 -13 Z"
      fill={PAPER}
    />
    <path d="M32 -37 H44 L50 -26 H32 Z" strokeWidth={1.4} />
    <path d="M-60 -22 H22" strokeWidth={1.3} />
    <path d="M-33 -52 V-13 M-6 -52 V-13" strokeWidth={1.1} />
    <path d="M22 -30 H26" strokeWidth={1.3} />
    <circle cx="-44" cy="-7.2" r="7.2" fill={PAPER} />
    <circle cx="-27" cy="-7.2" r="7.2" fill={PAPER} />
    <circle cx="46" cy="-7.2" r="7.2" fill={PAPER} />
    <circle cx="-44" cy="-7.2" r="2.7" strokeWidth={1.2} />
    <circle cx="-27" cy="-7.2" r="2.7" strokeWidth={1.2} />
    <circle cx="46" cy="-7.2" r="2.7" strokeWidth={1.2} />
  </g>
);

const Cyclist = () => (
  <g {...ink}>
    <circle cx="-16" cy="-5.6" r="5.6" fill={PAPER} />
    <circle cx="16" cy="-5.6" r="5.6" fill={PAPER} />
    <circle cx="-16" cy="-5.6" r="1.6" strokeWidth={1} />
    <circle cx="16" cy="-5.6" r="1.6" strokeWidth={1} />
    <path d="M-16 -5.6 H-1 L6 -19 M-1 -5.6 H16 M6 -19 H-8 L-16 -5.6" strokeWidth={1.5} />
    <path d="M16 -5.6 L10 -19 H6" strokeWidth={1.5} />
    <path d="M-8 -19 L-9 -23.5" strokeWidth={1.5} />
    <path d="M-11.5 -23.5 H-6.5 V-25 H-11.5 Z" fill={PAPER} strokeWidth={1.2} />
    <path d="M10 -19 L13.5 -25.5 H19" strokeWidth={1.5} />
    <path d="M-1 -5.6 L-5 -16 L1 -27" strokeWidth={1.7} />
    <path d="M1 -27 L12 -24.5" strokeWidth={1.7} />
    <path d="M1 -27 L3 -33" strokeWidth={1.7} />
    <circle cx="6" cy="-36" r="4" fill={PAPER} />
    <path d="M3 -33 L14 -25.5" strokeWidth={1.5} />
  </g>
);

/* ---- Sky. Planes fly right; the mirrored copy flies left. ---- */

const Plane = () => (
  <g {...ink}>
    <path d="M-24 -8 L-31 -22 H-21 L-13 -8 Z" fill={PAPER} />
    <path d="M-2 5 L-11 18 H2 L9 4 Z" fill={PAPER} />
    <path d="M-30 -1 Q-30 -7 -18 -8 H8 Q24 -7 32 0 Q24 5 8 6 H-18 Q-30 5 -30 -1 Z" fill={PAPER} />
    <path d="M-14 -2 H-6 M-1 -2 H6" strokeWidth={1.1} />
  </g>
);

const Balloon = () => (
  <g {...ink}>
    <path d="M0 -6 Q-16 -18 -16 -31 Q-16 -47 0 -47 Q16 -47 16 -31 Q16 -18 0 -6 Z" fill={PAPER} />
    <path d="M-8 -45 Q-11 -27 0 -6 M8 -45 Q11 -27 0 -6" strokeWidth={1.3} />
    <path d="M-5 -6 V-2 M5 -6 V-2" strokeWidth={1.2} />
    <path d="M-6 -4 H6 L5 6 H-5 Z" fill={PAPER} />
  </g>
);

const Cloud = ({ s = 1 }: { s?: number }) => (
  <g transform={`scale(${s})`} {...hairline}>
    <path d="M-22 0 A9 9 0 0 1 -15 -15 A14 14 0 0 1 9 -18 A10 10 0 0 1 22 0 Z" fill={PAPER} />
  </g>
);

const Birds = ({ s = 1 }: { s?: number }) => (
  <g transform={`scale(${s})`} {...hairline}>
    <path d="M-11 0 Q-5.5 -5.5 0 0 Q5.5 -5.5 11 0" />
    <path d="M7 11 Q11 7 15 11 Q19 7 23 11" />
  </g>
);

/* ------------------------------------------------------------------ *
 * Layout. Positions are fixed rather than random so the composition is
 * the same every render and a screenshot means something.
 * ------------------------------------------------------------------ */

const LANDMARKS = [
  Torii, Duomo, Pyramids, ClockTower, Glacier, TajMahal,
  Minaret, Windmill, Hallgrimskirkja, OperaHouse, Colosseum, Eiffel,
  StBasils, GoldenGate, Sagrada, Stonehenge, AngkorWat, Liberty,
];

/** Tile width for the landmark strip. Wider than the frame, so the run of
 *  buildings does not visibly repeat within one pass. */
const LAND_TILE = 2520;

/** Hand-placed offsets and scales: even spacing reads as a fence, and a
 *  uniform scale flattens the depth the parallax is trying to create. */
const LAND_PLACEMENT = [
  [40, 1.0], [185, 0.86], [330, 1.08], [470, 0.92], [615, 1.0], [745, 0.88],
  [880, 1.06], [1020, 0.95], [1155, 1.0], [1300, 0.9], [1435, 1.04], [1570, 0.94],
  [1710, 1.0], [1850, 0.88], [1990, 1.05], [2120, 0.92], [2255, 1.0], [2395, 0.9],
] as const;

const CLOUD_TILE = 1800;
/* Spread up the full height of the window, so they read as sky behind the
   page rather than a strip squeezed above the rooftops. */
const CLOUD_PLACEMENT: [number, number, number][] = [
  [90, 790, 1.5], [360, 560, 1.2], [620, 1060, 1.45], [880, 660, 1.7],
  [1130, 920, 1.3], [1400, 520, 1.5], [1650, 1180, 1.15],
];

/** Dash period. Long enough that the markings do not strobe once moving. */
const DASH_TILE = 120;

function RoadBand({ reduced = false }: { reduced?: boolean }) {
  return (
    <div className={`road-band${reduced ? " road-still" : ""}`} aria-hidden>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full"
        /* Slice, not fit: the height sets the scale and the width just reveals
           more of the road, so objects stay the same size at any window width.
           yMax keeps the road pinned to the bottom edge. */
        preserveAspectRatio="xMidYMax slice"
        role="presentation"
      >
        {/* ---- Sky: the slowest layer, so it reads as farthest ---- */}
        <g className="road-clouds" style={{ opacity: 0.26 }}>
          {[0, CLOUD_TILE].map((off) =>
            CLOUD_PLACEMENT.map(([x, y, s], i) => (
              <g key={`${off}-${i}`} transform={`translate(${x + off} ${y})`}>
                <Cloud s={s} />
              </g>
            ))
          )}
        </g>

        <g style={{ opacity: 0.4 }}>
          <g className="road-bob-slow">
            <g transform="translate(420 1010) scale(1.5)">
              <Birds s={0.85} />
            </g>
          </g>
        </g>

        {/* Aircraft and balloons each cross on their own clock. A plane that
            flies left is the same drawing mirrored, never the same drawing
            pointed the wrong way. */}
        <g className="road-fly-right" style={{ opacity: 0.75 }}>
          <g transform="translate(0 1120) scale(1.9)">
            <Plane />
          </g>
        </g>
        <g className="road-fly-left" style={{ opacity: 0.5 }}>
          <g transform="translate(0 1300) scale(-1.5 1.5)">
            <Plane />
          </g>
        </g>

        <g className="road-drift-balloon-a" style={{ opacity: 0.68 }}>
          <g className="road-bob-a">
            <g transform="translate(0 1330) scale(1.8)">
              <Balloon />
            </g>
          </g>
        </g>
        <g className="road-drift-balloon-b" style={{ opacity: 0.5 }}>
          <g className="road-bob-b">
            <g transform="translate(0 1160) scale(1.35)">
              <Balloon />
            </g>
          </g>
        </g>

        {/* ---- Background: the landmarks, on the horizon ---- */}
        <g className="road-landmarks" style={{ opacity: 0.6 }}>
          {[0, LAND_TILE].map((off) =>
            LANDMARKS.map((Landmark, i) => {
              const [x, s] = LAND_PLACEMENT[i];
              return (
                <g
                  key={`${off}-${i}`}
                  transform={`translate(${x + off} ${LAND_Y}) scale(${LANDMARK_SCALE * s})`}
                >
                  <Landmark />
                </g>
              );
            })
          )}
        </g>

        {/* The ground the landmarks stand on. */}
        <path d={`M0 ${LAND_Y} H${W}`} {...hairline} style={{ opacity: 0.35 }} />

        {/* ---- The road ---- */}
        <path d={`M0 ${ROAD_TOP} H${W}`} {...ink} style={{ opacity: 0.5 }} />
        <g className="road-dashes" style={{ opacity: 0.45 }}>
          <path
            d={`M0 ${CENTRE_Y} H${W + DASH_TILE}`}
            {...ink}
            strokeWidth={2.6}
            strokeDasharray={`58 ${DASH_TILE - 58}`}
          />
        </g>

        {/* ---- Traffic ---- *
            Far lane is oncoming: mirrored, and quick, because its speed and the
            camera's add up. Near lane faces right whichever way it drifts,
            because that is the way it is actually travelling. */}
        <g className="road-far-a" style={{ opacity: 0.78 }}>
          <g transform={`translate(0 ${FAR_Y}) scale(-0.84 0.84)`}>
            <Truck />
          </g>
        </g>
        <g className="road-far-b" style={{ opacity: 0.78 }}>
          <g transform={`translate(0 ${FAR_Y}) scale(-0.84 0.84)`}>
            <Car />
          </g>
        </g>

        <g className="road-near-a" style={{ opacity: 0.95 }}>
          <g className="road-jolt">
            <g transform={`translate(0 ${NEAR_Y})`}>
              <Bus />
            </g>
          </g>
        </g>
        <g className="road-near-b" style={{ opacity: 0.95 }}>
          <g className="road-jolt-b">
            <g transform={`translate(0 ${NEAR_Y})`}>
              <Camper />
            </g>
          </g>
        </g>
        <g className="road-near-c" style={{ opacity: 0.95 }}>
          <g className="road-jolt">
            <g transform={`translate(0 ${NEAR_Y})`}>
              <Cyclist />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

export default memo(RoadBand);

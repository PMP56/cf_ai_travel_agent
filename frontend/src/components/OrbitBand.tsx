import { memo } from "react";

/**
 * The homepage animation: a slow globe of places the planner can reach.
 *
 * The technique is lifted from Jose Aguinaga's "Travel Animation" pen, which
 * Prashanna picked as the reference. It is worth stating plainly because it is
 * unusually economical: one SVG, no JavaScript, no library, and only two real
 * keyframes — rotate 0→360 and its mirror. Every layer shares a single
 * `transform-origin` at the circle's centre and spins about it at a different
 * speed and direction. All of the richness comes from that speed differential
 * rather than from any scripting.
 *
 * What is not lifted is the look. The reference is flat multicoloured
 * illustration; this is single-weight ink line, because the rest of the page is
 * an engraving and a rainbow carousel at the foot of it would read as a
 * different product. Same mechanism, our own hand.
 *
 * It sits as a shallow band, so what you see is the top arc of a large globe
 * with its landmarks standing off the curve — each tilted by its own angle,
 * which is what sells it as a sphere rather than a row of buildings.
 */

/** Centre of every rotation. The ring is mostly below the frame. */
const CX = 440;
const CY = 560;
const R = 420;

/** Landmarks are drawn at ~78 units and scaled here; the reference keeps them
 *  large against the globe, which is what stops it reading as a flat horizon. */
const LANDMARK_SCALE = 1.12;

/** One landmark every 20°. At twelve the dome was visibly half empty:
 *  only about a third of the ring is ever in frame. */
const STEP = 360 / 18;

const ink = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const hairline = { ...ink, strokeWidth: 1.4 } as const;

/* ------------------------------------------------------------------ *
 * The landmarks. Each is drawn standing on the origin — base at y = 0,
 * rising into negative y — so the ring transform alone puts it in place
 * and tilts it correctly.
 * ------------------------------------------------------------------ */

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
    <g className="orbit-sails">
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
    <path d="M-24 0 Q-11 -30 -5 -58 L-3 -72" />
    <path d="M24 0 Q11 -30 5 -58 L3 -72" />
    <path d="M-16 -22 H16" />
    <path d="M-7 -48 H7" />
    <path d="M-3.5 -72 H3.5" />
    <path d="M0 -72 V-84" />
    <path d="M-13 -22 L-8 -48 M13 -22 L8 -48" strokeWidth={1.2} />
    <path d="M-26 0 H26" />
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

/** Ring order alternates tall and squat so the skyline has rhythm. */
const LANDMARKS = [
  Torii,
  Duomo,
  Pyramids,
  ClockTower,
  Glacier,
  TajMahal,
  Minaret,
  Windmill,
  Hallgrimskirkja,
  OperaHouse,
  Colosseum,
  Eiffel,
  StBasils,
  GoldenGate,
  Sagrada,
  Stonehenge,
  AngkorWat,
  Liberty,
];

const Plane = () => (
  <g {...ink}>
    <path d="M-16 0 L10 0 Q20 0 20 -3 Q20 -6 10 -6 L-16 -6 Z" />
    <path d="M-6 -6 L-1 -18 L4 -18 L2 -6" />
    <path d="M-6 0 L-2 9 L3 9 L2 0" />
    <path d="M-16 -3 L-22 -3" />
  </g>
);

const Balloon = () => (
  <g {...ink}>
    <path d="M0 -4 Q-13 -14 -13 -25 Q-13 -38 0 -38 Q13 -38 13 -25 Q13 -14 0 -4 Z" />
    <path d="M-6.5 -36 Q-9 -22 0 -4 M6.5 -36 Q9 -22 0 -4" strokeWidth={1.4} />
    <path d="M-5 -3 H5 L4 5 H-4 Z" />
    <path d="M-4 -4 V-1 M4 -4 V-1" strokeWidth={1.2} />
  </g>
);

const Cloud = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} {...hairline}>
    <path d="M-20 0 A8 8 0 0 1 -14 -14 A13 13 0 0 1 8 -17 A9 9 0 0 1 20 0 Z" />
  </g>
);

const Birds = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} {...hairline}>
    <path d="M-10 0 Q-5 -5 0 0 Q5 -5 10 0" />
    <path d="M6 10 Q10 6 14 10 Q18 6 22 10" />
  </g>
);

function OrbitBand({ reduced = false }: { reduced?: boolean }) {
  return (
    <div className={`orbit-band mx-auto w-full max-w-[880px] px-4${reduced ? " orbit-still" : ""}`} aria-hidden>
      <svg viewBox="0 0 880 320" className="w-full h-auto" role="presentation">
        {/* Orbital tracks. Dashed, so their rotation is actually legible —
            a plain circle spinning about its own centre shows nothing. */}
        <g className="orbit-track" style={{ opacity: 0.5 }}>
          <circle cx={CX} cy={CY} r={366} {...ink} strokeWidth={1.5} strokeDasharray="4 20" />
        </g>
        <g className="orbit-route" style={{ opacity: 0.42 }}>
          <circle cx={CX} cy={CY} r={282} {...ink} strokeWidth={1.6} strokeDasharray="18 20" />
        </g>

        {/* The globe edge itself: the one fixed thing on the page. */}
        <circle cx={CX} cy={CY} r={R} {...ink} strokeWidth={2.2} style={{ opacity: 0.72 }} />

        {/* The landmark ring — slowest of the moving layers. */}
        <g className="orbit-ring">
          {LANDMARKS.map((Landmark, i) => (
            <g key={i} transform={`rotate(${i * STEP} ${CX} ${CY})`}>
              <g transform={`translate(${CX} ${CY - R}) scale(${LANDMARK_SCALE})`}>
                <Landmark />
              </g>
            </g>
          ))}
        </g>

        {/* Traffic, each on its own track and its own clock. */}
        <g className="orbit-plane" style={{ opacity: 0.8 }}>
          <g transform={`translate(${CX} ${CY - 532}) rotate(90)`}>
            <Plane />
          </g>
        </g>
        <g className="orbit-plane-far" style={{ opacity: 0.5 }}>
          <g transform={`rotate(148 ${CX} ${CY})`}>
            <g transform={`translate(${CX} ${CY - 556}) rotate(90) scale(0.78)`}>
              <Plane />
            </g>
          </g>
        </g>
        <g className="orbit-balloon" style={{ opacity: 0.6 }}>
          <g transform={`rotate(-28 ${CX} ${CY})`}>
            <g transform={`translate(${CX} ${CY - 528})`}>
              <Balloon />
            </g>
          </g>
        </g>

        {/* Weather sits in the frame, not on the globe, so it only bobs. */}
        <g style={{ opacity: 0.4 }}>
          <g className="orbit-bob-1">
            <Cloud x={104} y={54} s={1.1} />
          </g>
          <g className="orbit-bob-2">
            <Cloud x={766} y={36} s={0.92} />
          </g>
          <g className="orbit-bob-3">
            <Cloud x={636} y={22} s={0.7} />
          </g>
          <g className="orbit-bob-2">
            <Birds x={250} y={18} s={0.85} />
          </g>
        </g>
      </svg>
    </div>
  );
}

export default memo(OrbitBand);

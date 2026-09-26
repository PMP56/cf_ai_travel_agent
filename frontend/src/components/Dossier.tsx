import type { ClimateGuidance, Critique, DestinationBrief, FoodBrief } from "../types";

/**
 * The supporting facts: what the place is, what the weather does, what to eat,
 * and what the reviewer thought.
 *
 * Each panel names its source. Measured values are set in mono so they read as
 * data rather than prose — the climate figures in particular are five-year
 * averages from a real archive, and showing "19.5/8.7°C over 5 years" carries
 * more credibility than "pleasantly mild".
 */

function Panel({
  label,
  source,
  href,
  children,
}: {
  label: string;
  source?: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-rule bg-paper-raised rounded-sm">
      <header className="flex items-baseline justify-between px-3.5 py-2 border-b border-rule">
        <h3 className="eyebrow">{label}</h3>
        {source &&
          (href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="figure text-ink-faint hover:text-accent underline-offset-2 hover:underline"
            >
              {source}
            </a>
          ) : (
            <span className="figure text-ink-faint">{source}</span>
          ))}
      </header>
      <div className="px-3.5 py-3">{children}</div>
    </section>
  );
}

export function DestinationPanel({ brief }: { brief: DestinationBrief }) {
  return (
    <Panel label="The place" source={brief.source.title} href={brief.source.url}>
      <p className="text-[13.5px] leading-relaxed">{brief.overview}</p>

      {brief.gettingAround && (
        <div className="mt-3 pt-3 border-t border-rule">
          <span className="eyebrow">Getting around</span>
          <p className="text-[13px] text-ink-soft mt-1 leading-relaxed">{brief.gettingAround}</p>
        </div>
      )}

      {brief.safety && (
        <div className="mt-3 pt-3 border-t border-rule">
          <span className="eyebrow text-warn">Watch out</span>
          <p className="text-[13px] text-ink-soft mt-1 leading-relaxed">{brief.safety}</p>
        </div>
      )}

      {brief.etiquette && (
        <div className="mt-3 pt-3 border-t border-rule">
          <span className="eyebrow">Local custom</span>
          <p className="text-[13px] text-ink-soft mt-1 leading-relaxed">{brief.etiquette}</p>
        </div>
      )}
    </Panel>
  );
}

export function ClimatePanel({ climate }: { climate: ClimateGuidance }) {
  const n = climate.normals;
  const rows: [string, string][] = [
    ["high / low", `${n.avgHighC}° / ${n.avgLowC}°C`],
    ["wet days", `${Math.round(n.rainyDayFraction * 100)}%`],
    ["rainfall", `${n.avgPrecipitationMm}mm`],
    ["wind", `${n.avgWindKph} avg · ${n.peakWindKph} peak km/h`],
    ["record", `${n.recordHighC}° / ${n.recordLowC}°C`],
  ];

  return (
    <Panel label={`${n.month} weather`} source={`ERA5 · ${n.yearsSampled}yr mean`}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="figure text-ink-faint">{k}</dt>
            <dd className="figure text-right">{v}</dd>
          </div>
        ))}
      </dl>

      {climate.summary && (
        <p className="text-[13px] text-ink-soft mt-3 pt-3 border-t border-rule leading-relaxed">
          {climate.summary}
        </p>
      )}

      {climate.caution && (
        <p className="text-[13px] text-warn mt-2.5 leading-relaxed">{climate.caution}</p>
      )}

      {climate.packing.length > 0 && (
        <ul className="mt-3 pt-3 border-t border-rule space-y-1">
          {climate.packing.map((item) => (
            <li key={item} className="text-[12.5px] text-ink-soft flex gap-2">
              <span aria-hidden className="text-ink-faint">—</span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function FoodPanel({ food }: { food: FoodBrief }) {
  return (
    <Panel label="Eating" source={food.source.title} href={food.source.url}>
      {food.dishes.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {food.dishes.map((d) => (
            <li
              key={d}
              className="figure px-1.5 py-0.5 border border-rule rounded-xs text-ink-soft"
            >
              {d}
            </li>
          ))}
        </ul>
      )}

      {food.advice && (
        <p className="text-[13px] text-ink-soft mt-3 leading-relaxed">{food.advice}</p>
      )}

      {food.dietaryNote && (
        <p className="text-[13px] text-accent mt-2.5 leading-relaxed">{food.dietaryNote}</p>
      )}
    </Panel>
  );
}

export function CritiquePanel({ critique }: { critique: Critique }) {
  if (critique.defects.length === 0) {
    return (
      <Panel label="Review" source="critic">
        <p className="figure text-live">✓ No issues found.</p>
      </Panel>
    );
  }

  return (
    <Panel label="Review" source={critique.approved ? "notes" : "needs work"}>
      <ul className="space-y-2">
        {critique.defects.map((d, i) => (
          <li key={i} className="flex gap-2">
            <span
              aria-hidden
              className={`figure shrink-0 ${
                d.severity === "blocking" ? "text-bad" : "text-warn"
              }`}
            >
              {d.severity === "blocking" ? "✕" : "!"}
            </span>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              {d.day !== null && <span className="figure text-ink-faint">day {d.day} · </span>}
              {d.issue}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

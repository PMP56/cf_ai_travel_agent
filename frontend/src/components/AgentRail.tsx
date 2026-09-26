import { AGENT_ORDER, AGENT_SOURCE } from "../types";
import type { AgentName, AgentState } from "../types";

/**
 * Live telemetry for the agent pipeline.
 *
 * Current practice for agentic UX is to expose tool execution rather than hide
 * it: each call, its elapsed time, and what it returned. A 20-60 second wait
 * behind a spinner feels broken; the same wait with seven named agents
 * reporting in feels like work being done. It doubles as the product's
 * argument — every row names the real source it is grounded in.
 *
 * Presented as a log, not a progress bar, because the stages are not a simple
 * linear percentage: four of them run at once.
 */

interface AgentRailProps {
  agents: Record<AgentName, AgentState>;
  running: boolean;
  elapsedMs: number;
}

const GLYPH: Record<AgentState["status"], string> = {
  idle: "·",
  running: "▶",
  done: "✓",
  failed: "✕",
  skipped: "–",
};

function statusColour(status: AgentState["status"]): string {
  switch (status) {
    case "running":
      return "text-accent";
    case "done":
      return "text-live";
    case "failed":
      return "text-bad";
    case "skipped":
      return "text-ink-faint";
    default:
      return "text-ink-faint";
  }
}

function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export default function AgentRail({ agents, running, elapsedMs }: AgentRailProps) {
  const done = AGENT_ORDER.filter((a) => agents[a].status === "done").length;
  const settled = AGENT_ORDER.filter((a) =>
    ["done", "failed", "skipped"].includes(agents[a].status)
  ).length;

  return (
    <section
      aria-label="Agent activity"
      className="border border-rule bg-paper-raised rounded-sm"
    >
      <header className="flex items-baseline justify-between px-3 py-2 border-b border-rule">
        <h2 className="eyebrow">Pipeline</h2>
        <span className="figure text-ink-faint" aria-live="polite">
          {running ? (
            <>
              {formatMs(elapsedMs)} · {settled}/{AGENT_ORDER.length}
            </>
          ) : (
            <>{done}/{AGENT_ORDER.length} complete</>
          )}
        </span>
      </header>

      <ol className="divide-y divide-rule">
        {AGENT_ORDER.map((name) => {
          const state = agents[name];
          const isRunning = state.status === "running";

          return (
            <li
              key={name}
              className={`grid grid-cols-[14px_1fr_auto] gap-x-2 items-baseline px-3 py-[7px] ${
                state.status === "idle" ? "opacity-45" : ""
              }`}
            >
              <span
                aria-hidden
                className={`figure ${statusColour(state.status)} ${isRunning ? "pulse" : ""}`}
              >
                {GLYPH[state.status]}
              </span>

              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[12px] font-medium tracking-tight">{name}</span>
                  <span className="figure text-ink-faint truncate">
                    {AGENT_SOURCE[name]}
                  </span>
                </div>
                {state.detail && (
                  <p
                    className={`figure mt-0.5 truncate ${
                      state.status === "failed" ? "text-bad" : "text-ink-soft"
                    }`}
                    title={state.detail}
                  >
                    {state.detail}
                  </p>
                )}
              </div>

              <span className="figure text-ink-faint tabular-nums">
                {state.ms !== null ? formatMs(state.ms) : isRunning ? "…" : ""}
              </span>

              {/* Screen readers get the status in words, not glyphs. */}
              <span className="sr-only">
                {name}: {state.status}
                {state.detail ? `, ${state.detail}` : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

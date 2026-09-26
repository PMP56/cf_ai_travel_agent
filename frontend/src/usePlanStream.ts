import { useCallback, useRef, useState } from "react";
import { AGENT_ORDER } from "./types";
import type {
  AgentName,
  AgentState,
  PipelineEvent,
  PlanResult,
  TripBrief,
  ResolvedPlace,
} from "./types";

const API = import.meta.env.VITE_API_ENDPOINT || "http://localhost:8787";

function idleAgents(): Record<AgentName, AgentState> {
  return Object.fromEntries(
    AGENT_ORDER.map((a) => [a, { status: "idle", ms: null, detail: null }])
  ) as Record<AgentName, AgentState>;
}

export interface PlanStreamState {
  /** True from submit until the stream closes. */
  running: boolean;
  agents: Record<AgentName, AgentState>;
  /** Arrives partway through, before the full result — lets the UI fill in early. */
  brief: TripBrief | null;
  place: ResolvedPlace | null;
  alternatives: ResolvedPlace[];
  result: PlanResult | null;
  error: string | null;
  /** Milliseconds since the run started; drives the live clock. */
  elapsedMs: number;
}

/**
 * Drives a plan from POST /api/v2/stream.
 *
 * Uses fetch + a reader rather than EventSource, because EventSource cannot
 * issue a POST and the prompt does not belong in a query string. The SSE wire
 * format is simple enough to parse directly: events separated by a blank line,
 * payload on a `data:` line.
 */
export function usePlanStream() {
  const [state, setState] = useState<PlanStreamState>({
    running: false,
    agents: idleAgents(),
    brief: null,
    place: null,
    alternatives: [],
    result: null,
    error: null,
    elapsedMs: 0,
  });

  const abortRef = useRef<AbortController | null>(null);
  const tickRef = useRef<number | null>(null);

  const stopClock = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const apply = useCallback((event: PipelineEvent) => {
    setState((prev) => {
      switch (event.type) {
        case "agent:start":
          return {
            ...prev,
            agents: {
              ...prev.agents,
              [event.agent]: { status: "running", ms: null, detail: null },
            },
          };
        case "agent:done":
          return {
            ...prev,
            agents: {
              ...prev.agents,
              [event.agent]: { status: "done", ms: event.ms, detail: event.summary },
            },
          };
        case "agent:failed":
          return {
            ...prev,
            agents: {
              ...prev.agents,
              [event.agent]: { status: "failed", ms: event.ms, detail: event.reason },
            },
          };
        case "agent:skipped":
          return {
            ...prev,
            agents: {
              ...prev.agents,
              [event.agent]: { status: "skipped", ms: null, detail: event.reason },
            },
          };
        case "brief":
          return {
            ...prev,
            brief: event.brief,
            place: event.place,
            alternatives: event.alternatives,
          };
        case "complete":
          return {
            ...prev,
            result: event.result,
            brief: event.result.brief,
            place: event.result.place,
          };
        case "error":
          return { ...prev, error: event.message };
        default:
          return prev;
      }
    });
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    stopClock();
    setState((prev) => ({ ...prev, running: false }));
  }, [stopClock]);

  const submit = useCallback(
    async (message: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const startedAt = Date.now();
      setState({
        running: true,
        agents: idleAgents(),
        brief: null,
        place: null,
        alternatives: [],
        result: null,
        error: null,
        elapsedMs: 0,
      });

      stopClock();
      tickRef.current = window.setInterval(() => {
        setState((prev) => (prev.running ? { ...prev, elapsedMs: Date.now() - startedAt } : prev));
      }, 100);

      try {
        const res = await fetch(`${API}/api/v2/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Server responded ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line. Keep the trailing
          // partial frame in the buffer for the next chunk.
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const line = frame.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            try {
              apply(JSON.parse(line.slice(6)) as PipelineEvent);
            } catch {
              // A malformed frame is not worth failing the run over.
            }
          }
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setState((prev) => ({
            ...prev,
            error: err instanceof Error ? err.message : "Could not reach the planner",
          }));
        }
      } finally {
        stopClock();
        setState((prev) => ({ ...prev, running: false }));
        abortRef.current = null;
      }
    },
    [apply, stopClock]
  );

  return { ...state, submit, cancel };
}

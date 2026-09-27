import { useState, type KeyboardEvent } from "react";
import { ArrowRight, Square } from "lucide-react";

/**
 * A single command line, not a chat log.
 *
 * There is no transcript because there is no conversation: a request produces a
 * dossier, and changing the request revises that dossier in place. Keeping this
 * as one persistent input rather than a scrolling thread is the clearest signal
 * that this is a workspace and not a messaging app.
 */

interface PromptBarProps {
  onSubmit: (message: string) => void;
  onCancel: () => void;
  running: boolean;
  compact?: boolean;
}

/**
 * Examples as destination cards rather than long text chips. As chips each one
 * wrapped onto its own line and read as three paragraphs of grey text; as a row
 * of cards they give the cold-start screen something to look at and make the
 * shape of a good request obvious at a glance.
 */
const EXAMPLES = [
  { place: "Kyoto", when: "April · 5 days", hook: "temples and street food",
    prompt: "A relaxed 5 days in Kyoto in April, temples and street food" },
  { place: "Marrakesh", when: "October · 5 days", hook: "souks and food",
    prompt: "5 days in Marrakesh in October, souks and food" },
  { place: "Florence", when: "September · 3 days", hook: "art and architecture",
    prompt: "A long weekend in Florence in September, art and architecture" },
];

export default function PromptBar({ onSubmit, onCancel, running, compact }: PromptBarProps) {
  const [value, setValue] = useState("");

  const send = () => {
    const text = value.trim();
    if (!text || running) return;
    onSubmit(text);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-end gap-2 border border-rule-strong bg-paper-raised rounded-sm px-3 py-2.5 focus-within:border-accent transition-colors">
        <label htmlFor="trip-prompt" className="sr-only">
          Describe your trip
        </label>
        <textarea
          id="trip-prompt"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={compact ? 1 : 2}
          disabled={running}
          placeholder={compact ? "Change the trip…" : "Where are you going, and when?"}
          className="flex-1 bg-transparent resize-none text-[14px] leading-relaxed placeholder:text-ink-faint focus:outline-none disabled:opacity-50"
        />

        {running ? (
          <button
            type="button"
            onClick={onCancel}
            className="figure shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 border border-rule-strong rounded-xs hover:border-bad hover:text-bad transition-colors"
          >
            <Square className="w-3 h-3" aria-hidden /> stop
          </button>
        ) : (
          <button
            type="button"
            onClick={send}
            disabled={!value.trim()}
            className="figure shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-ink text-paper rounded-xs disabled:opacity-25 hover:bg-accent transition-colors"
          >
            plan <ArrowRight className="w-3 h-3" aria-hidden />
          </button>
        )}
      </div>

      {!compact && !running && (
        <div className="grid sm:grid-cols-3 gap-2 mt-3">
          {EXAMPLES.map((example) => (
            <button
              key={example.place}
              type="button"
              onClick={() => {
                setValue(example.prompt);
                onSubmit(example.prompt);
              }}
              className="group text-left p-3 border border-rule rounded-sm bg-paper-raised hover:border-ink-faint hover:bg-paper-sunken/50 transition-colors"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="display text-[19px] leading-none">{example.place}</span>
                <ArrowRight
                  className="w-3.5 h-3.5 text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  aria-hidden
                />
              </div>
              <span className="figure text-ink-faint block mt-1.5">{example.when}</span>
              <span className="text-[12.5px] text-ink-soft block mt-0.5">{example.hook}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

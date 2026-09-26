import { useState, type KeyboardEvent } from "react";

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

const EXAMPLES = [
  "A relaxed week in Kyoto in April, temples and street food",
  "5 days in Marrakesh in October, souks and food",
  "A long weekend in Florence in September, art and architecture",
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
          placeholder="Where are you going, when, and for how long?"
          className="flex-1 bg-transparent resize-none text-[14px] leading-relaxed placeholder:text-ink-faint focus:outline-none disabled:opacity-50"
        />

        {running ? (
          <button
            type="button"
            onClick={onCancel}
            className="figure shrink-0 px-2.5 py-1.5 border border-rule-strong rounded-xs hover:border-bad hover:text-bad transition-colors"
          >
            stop
          </button>
        ) : (
          <button
            type="button"
            onClick={send}
            disabled={!value.trim()}
            className="figure shrink-0 px-2.5 py-1.5 bg-ink text-paper rounded-xs disabled:opacity-30 hover:bg-accent transition-colors"
          >
            plan ⏎
          </button>
        )}
      </div>

      {!compact && !running && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setValue(example);
                onSubmit(example);
              }}
              className="figure text-left px-2 py-1 border border-rule rounded-xs text-ink-soft hover:border-ink-faint hover:text-ink transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

/**
 * One editable field in the trip brief.
 *
 * Click or focus-and-Enter to edit, Enter to commit, Escape to abandon. Reads
 * as text until you engage with it, so the brief stays a document rather than
 * becoming a form — but every value is reachable by keyboard, which a
 * click-only affordance would not be.
 */

interface EditableFactProps {
  label: string;
  /** Rendered when set. */
  value: string | null;
  /** Shown greyed when value is null. */
  placeholder: string;
  /** Raw text to edit; defaults to `value`. */
  editValue?: string;
  onCommit: (raw: string) => void;
  /** Offer these as one-click choices instead of free text. */
  options?: string[];
  inputMode?: "text" | "numeric";
}

export default function EditableFact({
  label,
  value,
  placeholder,
  editValue,
  onCommit,
  options,
  inputMode = "text",
}: EditableFactProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const begin = () => {
    setDraft(editValue ?? value ?? "");
    setEditing(true);
  };

  const commit = (raw: string) => {
    setEditing(false);
    const next = raw.trim();
    if (next !== (editValue ?? value ?? "")) onCommit(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="eyebrow">{label}</span>
        {options ? (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => commit(option)}
                className="figure px-1.5 py-0.5 border border-rule-strong rounded-xs hover:border-accent hover:text-accent transition-colors"
              >
                {option}
              </button>
            ))}
            <button
              type="button"
              onClick={() => commit("")}
              className="figure px-1.5 py-0.5 border border-rule rounded-xs text-ink-faint hover:text-bad transition-colors"
            >
              clear
            </button>
          </div>
        ) : (
          <input
            ref={inputRef}
            value={draft}
            inputMode={inputMode}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => commit(draft)}
            aria-label={label}
            className="text-[13px] bg-transparent border-b border-accent focus:outline-none w-full py-px"
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="eyebrow">{label}</span>
      <button
        type="button"
        onClick={begin}
        className="text-[13px] leading-tight text-left truncate border-b border-dashed border-transparent hover:border-rule-strong transition-colors"
        aria-label={`${label}: ${value ?? placeholder}. Activate to edit.`}
      >
        <span className={value ? "text-ink" : "text-ink-faint italic"}>
          {value ?? placeholder}
        </span>
      </button>
    </div>
  );
}

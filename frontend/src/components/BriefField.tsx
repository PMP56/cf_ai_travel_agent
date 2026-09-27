import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, Plus, Pencil } from "lucide-react";

/**
 * One editable field in the trip brief.
 *
 * The previous version showed a bare value with a dashed underline that only
 * appeared on hover, which made the brief read as a dashboard — indistinguishable
 * from the coordinates line above it — and needed a sentence underneath
 * explaining that the values were clickable. A control that has to be captioned
 * is not a control.
 *
 * So the affordance is now permanent and the *kind* of control is visible
 * before you touch it: a set of options renders as a real `<select>` with a
 * chevron, which also gets keyboard behaviour and native pickers on mobile for
 * free; free text renders as a chip that opens an input. An unset field is an
 * invitation ("+ add budget") rather than the words "not specified".
 */

interface BaseProps {
  label: string;
  /** Rendered when set; null shows the empty-state invitation. */
  value: string | null;
  /** What to call the thing when it is unset, e.g. "budget". */
  noun: string;
  disabled?: boolean;
}

interface ChoiceProps extends BaseProps {
  kind: "choice";
  options: string[];
  onCommit: (value: string) => void;
}

interface TextProps extends BaseProps {
  kind: "text";
  /** Raw text to edit; defaults to `value`. */
  editValue?: string;
  /** Shown after the number, e.g. "days". */
  suffix?: string;
  inputMode?: "text" | "numeric";
  onCommit: (raw: string) => void;
}

type BriefFieldProps = ChoiceProps | TextProps;

const CHIP =
  "w-full flex items-center gap-1.5 px-2 py-1 rounded-xs border text-[13px] leading-tight transition-colors";

function Label({ children }: { children: React.ReactNode }) {
  return <span className="eyebrow block mb-1">{children}</span>;
}

export default function BriefField(props: BriefFieldProps) {
  const { label, value, noun, disabled } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const isSet = value !== null && value !== "";

  // A real select: keyboard operable, native picker on touch, chevron included.
  if (props.kind === "choice") {
    return (
      <div className="min-w-0">
        <Label>{label}</Label>
        <div className="relative">
          <select
            value={value ?? ""}
            disabled={disabled}
            aria-label={label}
            onChange={(e) => props.onCommit(e.target.value)}
            className={`${CHIP} appearance-none pr-6 cursor-pointer disabled:opacity-40 ${
              isSet
                ? "border-rule bg-paper-sunken/60 text-ink hover:border-ink-faint"
                : "border-dashed border-rule-strong bg-transparent text-accent hover:border-accent"
            }`}
          >
            <option value="">{`add ${noun}`}</option>
            {props.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown
            className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-faint"
            aria-hidden
          />
        </div>
      </div>
    );
  }

  const commit = (raw: string) => {
    setEditing(false);
    const next = raw.trim();
    if (next !== (props.editValue ?? value ?? "")) props.onCommit(next);
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
      <div className="min-w-0">
        <Label>{label}</Label>
        <input
          ref={inputRef}
          value={draft}
          inputMode={props.inputMode ?? "text"}
          aria-label={label}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => commit(draft)}
          className={`${CHIP} border-accent bg-paper text-ink focus:outline-none`}
        />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <Label>{label}</Label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setDraft(props.editValue ?? value ?? "");
          setEditing(true);
        }}
        aria-label={isSet ? `${label}: ${value}. Change it.` : `Add ${noun}`}
        className={`${CHIP} text-left disabled:opacity-40 group/f ${
          isSet
            ? "border-rule bg-paper-sunken/60 text-ink hover:border-ink-faint"
            : "border-dashed border-rule-strong bg-transparent text-accent hover:border-accent"
        }`}
      >
        {isSet ? (
          <>
            <span className="flex-1 truncate">
              {value}
              {props.suffix && <span className="text-ink-faint"> {props.suffix}</span>}
            </span>
            <Pencil
              className="w-2.5 h-2.5 shrink-0 text-ink-faint opacity-0 group-hover/f:opacity-100 transition-opacity"
              aria-hidden
            />
          </>
        ) : (
          <>
            <Plus className="w-3 h-3 shrink-0" aria-hidden />
            <span className="flex-1 truncate">add {noun}</span>
          </>
        )}
      </button>
    </div>
  );
}

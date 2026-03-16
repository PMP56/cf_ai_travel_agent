import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Send } from "lucide-react";

interface InputBoxProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function InputBox({ onSend, disabled }: InputBoxProps) {
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="absolute bottom-6 left-0 right-0 flex justify-center px-4 pointer-events-none z-50">
      <div className="w-full max-w-2xl pointer-events-auto">
        <div className="bg-card border border-[rgba(0,0,0,0.08)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] px-4 py-3">
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your dream trip…"
              disabled={disabled}
              rows={1}
              className="flex-1 px-2 py-1.5 bg-transparent focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed text-sm text-foreground placeholder:text-muted-foreground"
              style={{ minHeight: "36px", maxHeight: "120px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 120) + "px";
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={disabled || !input.trim()}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium flex-shrink-0 shadow-sm"
              style={{ minHeight: "36px" }}
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Send</span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1 hidden sm:block">
            Press Enter to send · Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

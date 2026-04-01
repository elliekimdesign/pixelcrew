"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  onSubmit: (message: string) => void;
  disabled: boolean;
  variant?: "global" | "local" | "rail";
  placeholder?: string;
  buttonLabel?: string;
}

export default function CommandInput({
  onSubmit,
  disabled,
  variant = "global",
  placeholder,
  buttonLabel,
}: Props) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (variant === "global" || variant === "rail") ref.current?.focus();
  }, [variant]);

  useEffect(() => {
    if (variant !== "global" && variant !== "rail") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== ref.current) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [variant]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSubmit(input.trim());
    setInput("");
    ref.current?.focus();
  };

  const rowClass =
    variant === "rail"
      ? "flex items-center gap-4 py-3 min-h-[3.25rem] pl-[4.5rem] pr-12"
      : "flex items-stretch gap-4";

  const inputClass =
    variant === "rail"
      ? "flex-1 min-w-0 bg-transparent text-[14px] leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--text-mid)] caret-[var(--accent)] pl-8 pr-4 py-2 border-0"
      : "flex-1 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] caret-[var(--accent)] py-3 pl-6";

  const btnClass =
    variant === "rail"
      ? "text-[11px] text-white font-bold uppercase tracking-wider bg-[var(--accent)] px-5 py-2.5 border border-[var(--accent)] hover:opacity-90 transition-all cursor-pointer shrink-0 self-center"
      : "text-[11px] text-white font-bold uppercase tracking-wider bg-[var(--accent)] px-6 py-3 hover:opacity-90 transition-all cursor-pointer";

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={rowClass}>
        <input
          ref={ref}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder || "What should your crew work on?"}
          className={inputClass}
        />
        {input.trim() ? (
          <button type="submit" className={btnClass}>
            {buttonLabel || "Deploy"}
          </button>
        ) : (
          <kbd
            className={
              variant === "rail"
                ? "text-[10px] text-[var(--accent)] bg-white/60 px-2 py-1 shrink-0 self-center font-semibold"
                : "text-[10px] text-[var(--text-dim)] bg-[var(--bg)] px-2 py-1 self-center"
            }
          >
            /
          </kbd>
        )}
      </div>
    </form>
  );
}

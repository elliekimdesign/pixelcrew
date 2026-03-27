"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  onSubmit: (message: string) => void;
  disabled: boolean;
  variant?: "global" | "local";
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
    if (variant === "global") ref.current?.focus();
  }, [variant]);

  useEffect(() => {
    if (variant !== "global") return;
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

  const isLocal = variant === "local";

  // Local variant (inside task detail footer)
  if (isLocal) {
    return (
      <form onSubmit={handleSubmit} className="w-full">
        <div className={`cmd-input-local flex items-center gap-4 px-6 py-4 transition-all duration-150 ${focused ? "cmd-focus-local" : ""}`}>
          <span className="text-[14px] text-[var(--accent)] shrink-0 opacity-50">{">_"}</span>
          <input
            ref={ref}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder || "Send follow-up orders..."}
            className="flex-1 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] caret-[var(--accent)]"
          />
          {input.trim() && (
            <button
              type="submit"
              className="text-[14px] text-white uppercase bg-[var(--accent)] px-5 py-2.5 rounded-lg hover:brightness-110 transition-all font-semibold"
            >
              {buttonLabel || "Send"}
            </button>
          )}
        </div>
      </form>
    );
  }

  // Global variant (big floating prompt)
  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={`flex items-center gap-5 px-8 py-6 transition-all duration-200 bg-white rounded-xl border-2 ${focused ? "border-[var(--accent)] shadow-md" : "border-[var(--crew-border)]"}`}>
        <span className="text-[16px] text-emerald-600/40 shrink-0">{">_"}</span>
        <input
          ref={ref}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder || "Describe a mission for your crew..."}
          className="flex-1 bg-transparent text-[16px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] caret-emerald-500"
        />
        {input.trim() ? (
          <button
            type="submit"
            className="text-[14px] text-white uppercase bg-emerald-600 px-7 py-3.5 rounded-lg border-2 border-emerald-700 hover:bg-emerald-700 transition-all shadow-sm font-semibold"
          >
            {buttonLabel || "Deploy"}
          </button>
        ) : (
          <kbd className="text-[12px] text-[var(--text-dim)] border-2 border-[var(--border)] rounded-lg px-3 py-1.5 bg-[var(--bg-panel)]">
            /
          </kbd>
        )}
      </div>
    </form>
  );
}

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
        <div className={`cmd-input-local flex items-center gap-4 px-5 py-3.5 transition-all duration-150 ${focused ? "cmd-focus-local" : ""}`}>
          <span className="font-pixel text-[14px] text-[var(--accent)] shrink-0 opacity-50">{">_"}</span>
          <input
            ref={ref}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder || "Send follow-up orders..."}
            className="flex-1 bg-transparent text-[15px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] caret-[var(--accent)]"
          />
          {input.trim() && (
            <button
              type="submit"
              className="font-pixel text-[14px] text-white uppercase bg-[var(--accent)] px-4 py-2 rounded-lg hover:brightness-110 transition-all"
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
      <div className={`cmd-input flex items-center gap-5 px-7 py-5 transition-all duration-200 ${focused ? "cmd-focus" : ""}`}>
        <span className="font-pixel text-[18px] text-white/20 shrink-0">{">_"}</span>
        <input
          ref={ref}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder || "Describe a mission for your crew..."}
          className="flex-1 bg-transparent text-[18px] text-white/90 outline-none placeholder:text-white/25 caret-sky-400"
        />
        {input.trim() ? (
          <button
            type="submit"
            className="font-pixel text-[16px] text-white/90 uppercase bg-white/10 px-6 py-3 rounded-lg border border-white/10 hover:bg-white/15 transition-all"
          >
            {buttonLabel || "Deploy"}
          </button>
        ) : (
          <kbd className="font-mono text-[13px] text-white/25 border border-white/10 rounded-lg px-2.5 py-1 bg-white/[0.04]">
            /
          </kbd>
        )}
      </div>
    </form>
  );
}

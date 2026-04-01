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

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-center gap-4">
        <input
          ref={ref}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder || "What should your crew work on?"}
          className="flex-1 bg-transparent text-[15px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] caret-[var(--accent)]"
        />
        {input.trim() ? (
          <button
            type="submit"
            className="text-[13px] text-white font-medium bg-[var(--accent)] px-5 py-2 rounded-full hover:opacity-90 transition-all shadow-sm cursor-pointer"
          >
            {buttonLabel || "Send"}
          </button>
        ) : (
          <kbd className="text-[11px] text-[var(--text-dim)] bg-[var(--bg)] rounded-lg px-2.5 py-1">
            /
          </kbd>
        )}
      </div>
    </form>
  );
}

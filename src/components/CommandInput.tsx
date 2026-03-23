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

  const defaultPlaceholder = isLocal
    ? "What should the team do next?"
    : 'Give a task... e.g. "build a landing page"';

  const defaultButtonLabel = isLocal ? "Continue" : "New Task";

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className={
          isLocal
            ? "flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-white/40"
            : "panel-solid flex items-center gap-3 px-4 py-3"
        }
      >
        <span
          className={
            isLocal
              ? "font-mono text-[13px] text-[var(--text-light)] shrink-0"
              : "font-mono text-indigo-500 text-[14px] font-semibold shrink-0"
          }
        >
          {isLocal ? "↩" : ">_"}
        </span>
        <input
          ref={ref}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder || defaultPlaceholder}
          className={
            isLocal
              ? "flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-light)] caret-indigo-400"
              : "flex-1 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--border-strong)] caret-indigo-500"
          }
        />
        {input.trim() ? (
          <button
            type="submit"
            className={
              isLocal
                ? "text-[11px] text-indigo-500 bg-transparent px-3 py-1 rounded-lg border border-indigo-400 hover:bg-indigo-50 transition-colors font-semibold"
                : "text-[12px] text-white bg-indigo-500 px-4 py-1.5 rounded-lg border border-indigo-600 hover:bg-indigo-600 transition-colors font-semibold shadow-sm"
            }
          >
            {buttonLabel || defaultButtonLabel}
          </button>
        ) : (
          !isLocal && (
            <kbd className="font-mono text-[11px] text-[var(--text-light)] font-medium border border-[var(--border)] rounded-md px-2 py-0.5 bg-[var(--bg)]">
              /
            </kbd>
          )
        )}
      </div>
    </form>
  );
}

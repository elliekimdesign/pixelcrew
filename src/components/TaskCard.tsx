"use client";

import { capitalizeLeadingLetter } from "@/lib/format";

import { Task } from "@/lib/types";

interface Props {
  task: Task;
  isSelected: boolean;
  onClick: () => void;
}

const statusBadge = {
  running: { label: "IN PROGRESS", text: "text-[var(--accent)]", barColor: "bg-[var(--accent)]" },
  done: { label: "COMPLETE", text: "text-[var(--text-dim)]", barColor: "bg-[var(--text-dim)]" },
  stuck: { label: "FAILED", text: "text-red-500", barColor: "bg-red-400" },
} as const;

export default function TaskCard({ task, isSelected, onClick }: Props) {
  const status = statusBadge[task.status] || statusBadge.running;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left cursor-pointer transition-all duration-150 border-l-[6px] border-b border-b-[var(--border)]/30 last:border-b-0 ${
        isSelected
          ? "border-l-[var(--accent)] bg-white/50"
          : "border-l-[var(--border-strong)] bg-white/20 hover:border-l-[var(--accent)]/60 hover:bg-white/40"
      }`}
    >
      <div className="pl-5 pr-6 py-3.5 ml-3">
        <p
          className={`text-[13px] truncate leading-tight mb-2 ${isSelected ? "text-[var(--text)] font-semibold" : "text-[var(--text-mid)]"}`}
        >
          {capitalizeLeadingLetter(task.title)}
        </p>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold tracking-wider uppercase ${status.text}`}>
            {status.label}
          </span>
          {task.status === "running" && (
            <div className="flex-1 h-1 bg-[var(--border)] rounded-full overflow-hidden max-w-[80px]">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-500"
                style={{ width: `${Math.max(task.progress, 3)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

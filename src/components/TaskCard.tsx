"use client";

import { Task } from "@/lib/types";

interface Props {
  task: Task;
  isSelected: boolean;
  onClick: () => void;
}

export default function TaskCard({ task, isSelected, onClick }: Props) {
  const badgeClass = task.status === "done" ? "badge-done" : task.status === "stuck" ? "badge-stuck" : "badge-run";
  const statusLabel = task.status === "done" ? "Done" : task.status === "stuck" ? "Stuck" : "Running";
  const barClass = task.status === "done" ? "bar-done" : task.status === "stuck" ? "bar-stuck" : "bar-run";

  return (
    <button
      onClick={onClick}
      className={`card w-full text-left px-4 py-3.5 cursor-pointer transition-all duration-150 ${
        isSelected ? "border-[var(--accent)] shadow-[0_0_0_1px_var(--accent-glow)]" : ""
      }`}
    >
      {/* Title row with badge */}
      <div className="flex items-center gap-3 mb-2">
        <p className="text-[14px] text-[var(--text)] leading-snug truncate flex-1">{task.title}</p>
        <span className={`font-mono text-[10px] px-2 py-0.5 rounded-lg shrink-0 ${badgeClass}`}>{statusLabel}</span>
      </div>

      {/* Progress bar with % */}
      <div className="flex items-center gap-3">
        <div className="px-bar flex-1">
          <div
            className={`px-bar-fill ${barClass} ${task.status === "running" ? "loading-bar-subtle" : ""}`}
            style={{ width: `${Math.max(task.progress, task.status === "running" ? 3 : 0)}%` }}
          />
        </div>
        <span className="font-mono text-[11px] text-[var(--text-dim)] shrink-0 w-8 text-right">{task.progress}%</span>
      </div>
    </button>
  );
}

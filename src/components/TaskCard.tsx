"use client";

import { Task } from "@/lib/types";

interface Props {
  task: Task;
  isSelected: boolean;
  onClick: () => void;
}

export default function TaskCard({ task, isSelected, onClick }: Props) {
  const barClass = task.status === "done" ? "bar-done" : task.status === "stuck" ? "bar-stuck" : "bar-run";

  const statusLine = task.status === "done"
    ? "Done"
    : task.status === "stuck"
    ? task.currentStep ? `Stuck at ${task.currentStep.agent}` : "Stuck"
    : task.currentStep ? `${task.currentStep.agent}` : "Starting...";

  const statusColor = task.status === "done"
    ? "text-emerald-600"
    : task.status === "stuck"
    ? "text-red-500"
    : "text-sky-600";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3.5 py-3 rounded-lg cursor-pointer transition-all duration-150 border ${
        isSelected
          ? "border-[var(--accent)] bg-[var(--bg-card)]"
          : "border-transparent hover:bg-[var(--bg-card)]/50"
      }`}
    >
      <p className="text-[13px] text-[var(--text)] truncate mb-1.5">{task.title}</p>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-[12px] font-medium ${statusColor}`}>{statusLine}</span>
        {task.status !== "done" && (
          <span className="text-[11px] text-[var(--text-dim)] ml-auto">{task.progress}%</span>
        )}
      </div>
      {task.status !== "done" && (
        <div className="px-bar">
          <div
            className={`px-bar-fill ${barClass} ${task.status === "running" ? "loading-bar-subtle" : ""}`}
            style={{ width: `${Math.max(task.progress, task.status === "running" ? 3 : 0)}%` }}
          />
        </div>
      )}
    </button>
  );
}

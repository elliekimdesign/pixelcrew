"use client";

import { Task } from "@/lib/types";
import PixelSprite from "./PixelSprite";

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
  const leadAgent = task.agents[0];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg cursor-pointer transition-all duration-150 overflow-hidden ${
        isSelected
          ? "bg-white ring-1 ring-emerald-400/40 shadow-sm"
          : "bg-white/40 hover:bg-white/70"
      }`}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {/* Lead agent sprite */}
        <div
          className="shrink-0 rounded-md p-1 bg-[var(--bg)]"
          style={{ imageRendering: "pixelated" }}
        >
          <PixelSprite character={leadAgent} size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-[13px] truncate leading-tight ${isSelected ? "text-[var(--text)] font-medium" : "text-[var(--text-mid)]"}`}>
            {task.title}
          </p>
          <span className={`text-[10px] font-semibold tracking-wider ${status.text}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* XP bar */}
      <div className="h-[3px] bg-[var(--border)]">
        <div
          className={`h-full ${status.barColor} transition-all duration-500 ${task.status === "running" ? "loading-bar-subtle" : ""}`}
          style={{ width: `${task.status === "done" ? 100 : Math.max(task.progress, 3)}%` }}
        />
      </div>
    </button>
  );
}

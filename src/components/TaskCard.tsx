"use client";

import { Task } from "@/lib/types";
import PixelSprite from "./PixelSprite";

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
    : "text-emerald-600";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-5 py-3.5 rounded-lg cursor-pointer transition-all duration-150 border ${
        isSelected
          ? "border-[var(--accent)] bg-[var(--bg-card)] shadow-sm"
          : "border-transparent hover:bg-[var(--bg-card)]/50"
      }`}
    >
      <p className="text-[14px] text-[var(--text)] font-medium truncate mb-2">{task.title}</p>
      
      {/* Agent badges */}
      <div className="flex items-center gap-1 mb-2.5 flex-wrap">
        {task.agents.map((char) => (
          <div 
            key={char} 
            className="rounded-md p-0.5 border border-[var(--border)] bg-[var(--bg-panel)]" 
            style={{ imageRendering: "pixelated" }}
            title={char.charAt(0).toUpperCase() + char.slice(1)}
          >
            <PixelSprite character={char} size={14} />
          </div>
        ))}
        <span className={`text-[12px] font-medium ml-1 ${statusColor}`}>{statusLine}</span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        {task.status !== "done" && (
          <span className="text-[12px] text-[var(--text-dim)] ml-auto">{task.progress}%</span>
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

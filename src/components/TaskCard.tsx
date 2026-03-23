"use client";

import { Task } from "@/lib/types";
import PixelSprite from "./PixelSprite";

interface Props {
  task: Task;
  isSelected: boolean;
  onClick: () => void;
}

export default function TaskCard({ task, isSelected, onClick }: Props) {
  const statusColor =
    task.status === "done"
      ? "bg-green-50 text-green-600 border-green-200"
      : task.status === "stuck"
      ? "bg-red-50 text-red-500 border-red-200"
      : "bg-cyan-50 text-cyan-600 border-cyan-200";

  const statusLabel =
    task.status === "done" ? "Done" : task.status === "stuck" ? "Stuck" : "Running";

  const barColor =
    task.status === "done" ? "bg-green-400" : task.status === "stuck" ? "bg-red-400" : "bg-cyan-400";

  return (
    <button
      onClick={onClick}
      className={`card w-full text-left px-3.5 py-3.5 cursor-pointer transition-all duration-150 ${
        isSelected
          ? "border-indigo-400 shadow-[0_0_0_1px_rgba(99,102,241,0.2)] bg-indigo-50/30"
          : ""
      }`}
    >
      {/* Title + status */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <span className="text-[9px] text-[var(--text)] font-pixel leading-relaxed line-clamp-2">
          {task.title}
        </span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-bar mb-2.5">
        <div
          className={`px-bar-fill ${barColor}`}
          style={{ width: `${task.progress}%` }}
        />
      </div>

      {/* Agents + progress % */}
      <div className="flex items-center justify-between">
        <div className="flex -space-x-0.5">
          {task.agents.map((char) => (
            <div key={char} className="bg-white rounded-md p-0.5 border border-[var(--border)]" style={{ imageRendering: "pixelated" }}>
              <PixelSprite character={char} size={20} />
            </div>
          ))}
        </div>
        <span className="text-[11px] text-[var(--text-light)] font-medium">{task.progress}%</span>
      </div>
    </button>
  );
}

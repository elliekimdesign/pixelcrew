"use client";

import { capitalizeLeadingLetter } from "@/lib/format";
import { Task, CharacterName } from "@/lib/types";
import PixelSprite from "./PixelSprite";

interface Props {
  task: Task;
  isSelected: boolean;
  onClick: () => void;
  tintColor?: string;
  selectedAgentChars?: CharacterName[];
  onAgentClick?: (char: CharacterName) => void;
}

const statusBadge = {
  running: { label: "IN PROGRESS", text: "text-[var(--accent)]" },
  done:    { label: "COMPLETE",    text: "text-[var(--text-dim)]" },
  stuck:   { label: "FAILED",      text: "text-red-500" },
} as const;

export default function TaskCard({ task, isSelected, onClick, tintColor, selectedAgentChars = [], onAgentClick }: Props) {
  const status = statusBadge[task.status] || statusBadge.running;

  return (
    <div className="border-b border-b-[var(--border)]/30 last:border-b-0">
      {/* Main task row */}
      <button
        onClick={onClick}
        className={`w-full text-left cursor-pointer transition-all duration-150 border-l-[6px] ${
          isSelected
            ? "bg-white/50"
            : "border-l-[var(--border-strong)] bg-white/20 hover:bg-white/40"
        }`}
        style={{ borderLeftColor: isSelected ? "#1a1a1a" : undefined }}
        style={{ padding: "4px 14px" }}
      >
        <p className={`text-[14px] truncate leading-snug mb-1.5 ${
          isSelected ? "text-[var(--text)]" : "text-[var(--text-mid)]"
        }`}>
          {capitalizeLeadingLetter(task.title)}
        </p>
        <div className="flex items-center gap-2">
          {task.status === "stuck" && (
            <span className="text-[11px] tracking-[0.14em] uppercase text-red-500">FAILED</span>
          )}
          {task.status === "running" && (
            <>
              <span className="text-[11px] tracking-[0.14em] uppercase text-[var(--accent)]">IN PROGRESS</span>
              <div className="flex-1 h-1 bg-[var(--border)] rounded-full overflow-hidden max-w-[80px]">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-500"
                  style={{ width: `${Math.max(task.progress, 3)}%` }}
                />
              </div>
            </>
          )}
        </div>
      </button>

      {/* Agent sub-items */}
      {isSelected && task.agents.length > 0 && (
        <div className="border-t border-[var(--border)]/30">
          {task.agents.map((char) => {
            const agentDone = task.log.some((e) => e.type === "agent" && e.character === char);
            const isCurrent = task.status === "running" && task.currentStep?.agent?.toLowerCase().includes(char);
            const agentName = char.charAt(0).toUpperCase() + char.slice(1);
            const isAgentSelected = selectedAgentChars.includes(char);

            const subLabel = isCurrent ? "IN PROGRESS" : agentDone ? "COMPLETE" : "PENDING";
            const subTextColor = isCurrent
              ? "text-[var(--accent)]"
              : agentDone
              ? "text-[var(--text-dim)]"
              : "text-[var(--text-dim)] opacity-40";

            return (
              <button
                key={char}
                onClick={() => onAgentClick?.(char)}
                className={`text-left cursor-pointer transition-all duration-150 border-l-[6px] border-b border-b-[var(--border)]/20 last:border-b-0 ${
                  isAgentSelected
                    ? "bg-white/50"
                    : "border-l-[var(--border-strong)]/50 bg-white/10 hover:bg-white/30"
                }`}
                style={{ padding: "4px 14px", marginLeft: "1.25rem", width: "calc(100% - 1.25rem)", borderLeftColor: isAgentSelected ? "#1a1a1a" : undefined }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div style={{ imageRendering: "pixelated" }}>
                    <PixelSprite character={char} size={16} />
                  </div>
                  <p className={`text-[14px] truncate leading-snug flex-1 ${
                    isAgentSelected ? "text-[var(--text)]" : "text-[var(--text-mid)]"
                  }`}>
                    {agentName}
                  </p>
                </div>
                {isCurrent && (
                  <span className="text-[11px] tracking-[0.14em] uppercase text-[var(--accent)]">IN PROGRESS</span>
                )}
                {!agentDone && !isCurrent && task.status === "stuck" && (
                  <span className="text-[11px] tracking-[0.14em] uppercase text-red-500">FAILED</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

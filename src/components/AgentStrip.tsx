"use client";

import { Agent, AgentState } from "@/lib/types";
import PixelSprite from "./PixelSprite";

interface Props {
  agents: Agent[];
}

const dotClass: Record<AgentState, string> = {
  working: "dot-working blink",
  idle: "dot-idle",
  done: "dot-done",
  stuck: "dot-stuck blink",
};

const stateLabel: Record<AgentState, { text: string; color: string }> = {
  working: { text: "Working", color: "text-green-600" },
  idle: { text: "Idle", color: "text-yellow-600" },
  done: { text: "Done", color: "text-stone-400" },
  stuck: { text: "Stuck", color: "text-red-500" },
};

export default function AgentSidebar({ agents }: Props) {
  const working = agents.filter((a) => a.state === "working");
  const others = agents.filter((a) => a.state !== "working");
  const sorted = [...working, ...others];

  return (
    <aside className="w-64 shrink-0 flex flex-col h-full border-r border-[var(--border)]">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-[var(--border)] bg-white/40">
        <div className="flex items-center justify-between">
          <span className="section-label bg-indigo-50 text-indigo-600">
            Crew
          </span>
          <span className="text-[12px] text-[var(--text-light)] font-medium">
            {working.length}/{agents.length} active
          </span>
        </div>
      </div>

      {/* Agent cards */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {sorted.map((agent) => {
          const state = stateLabel[agent.state];
          return (
            <div key={agent.id} className="card px-3 py-3 cursor-default">
              <div className="flex items-center gap-3">
                <div className="shrink-0 relative">
                  <div className="bg-[var(--bg)] rounded-lg p-1 border border-[var(--border)]" style={{ imageRendering: "pixelated" }}>
                    <PixelSprite character={agent.character} size={36} />
                  </div>
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-[9px] h-[9px] rounded-full border-2 border-white ${dotClass[agent.state]}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px] text-[var(--text)] font-semibold leading-none">
                      {agent.name}
                    </span>
                    <span className="text-[12px] text-[var(--text-light)] leading-none">
                      {agent.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className={`text-[11px] font-semibold ${state.color} leading-none inline-block`}>
                      {state.text}
                    </span>
                    <span className={`inline-flex gap-[2px] ${agent.state === "working" ? "" : "invisible"}`}>
                      <span className="typing-dot w-[3px] h-[3px] rounded-full bg-green-500 inline-block" />
                      <span className="typing-dot w-[3px] h-[3px] rounded-full bg-green-500 inline-block" />
                      <span className="typing-dot w-[3px] h-[3px] rounded-full bg-green-500 inline-block" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Task label */}
              {agent.taskLabel && (
                <p className="text-[12px] text-[var(--text-mid)] truncate mt-2 pl-[52px]">
                  {agent.taskLabel}
                </p>
              )}

              {/* Progress */}
              {agent.state === "working" && agent.progress !== undefined && (
                <div className="mt-2 pl-[52px]">
                  <div className="px-bar" style={{ height: 6 }}>
                    <div
                      className={`px-bar-fill bg-green-400 ${agent.state === "working" ? "loading-bar-subtle" : ""}`}
                      style={{ width: `${agent.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

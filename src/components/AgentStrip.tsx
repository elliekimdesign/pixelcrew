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

const stateText: Record<AgentState, string> = {
  working: "Active",
  idle: "Standby",
  done: "Done",
  stuck: "Error",
};

const stateColor: Record<AgentState, string> = {
  working: "#059669",
  idle: "#6b7280",
  done: "#22c55e",
  stuck: "#dc2626",
};

export default function AgentSidebar({ agents }: Props) {
  const working = agents.filter((a) => a.state === "working");
  const idle = agents.filter((a) => a.state !== "working");

  return (
    <aside className="flex flex-col h-full crew-sidebar">
      {/* Header */}
      <div className="px-6 py-6 border-b-2 border-[var(--crew-border)] bg-gradient-to-b from-emerald-50 to-[var(--crew-bg)]">
        <div className="flex items-center justify-between">
          <span className="font-pixel text-[16px] text-emerald-600 uppercase drop-shadow-sm">Crew</span>
          <span className="text-[12px] text-[var(--crew-dim)] font-semibold">
            {working.length}/{agents.length} active
          </span>
        </div>
      </div>

      {/* Agent cards */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
        {[...working, ...idle].map((agent) => {
          const isWorking = agent.state === "working";

          return (
            <div
              key={agent.id}
              className="rounded-lg px-4 py-4 cursor-default transition-all duration-150"
              style={{
                background: "var(--crew-card)",
                border: "2px solid var(--crew-border)",
                boxShadow: isWorking ? "0 0 12px rgba(16, 185, 129, 0.25)" : "none",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="shrink-0 relative">
                  <div
                    className="rounded-lg p-1.5"
                    style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid var(--crew-border)", imageRendering: "pixelated" }}
                  >
                    <PixelSprite character={agent.character} size={36} />
                  </div>
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-[9px] h-[9px] rounded-full border-2 ${dotClass[agent.state]}`}
                    style={{ borderColor: "var(--crew-card)" }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[14px] text-[var(--crew-text)] font-semibold block">{agent.name}</span>
                  <span className="text-[12px] text-[var(--crew-dim)] block mt-0.5">{agent.title}</span>
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="text-[12px]" style={{ color: stateColor[agent.state] }}>
                      {stateText[agent.state]}
                    </span>
                    <span className={`inline-flex gap-[2px] ${isWorking ? "" : "invisible"}`}>
                      <span className="typing-dot w-[3px] h-[3px] rounded-full bg-emerald-500 inline-block" />
                      <span className="typing-dot w-[3px] h-[3px] rounded-full bg-emerald-500 inline-block" />
                      <span className="typing-dot w-[3px] h-[3px] rounded-full bg-emerald-500 inline-block" />
                    </span>
                  </div>
                </div>
              </div>

              {agent.taskLabel && (
                <p className="text-[12px] text-[var(--crew-dim)] truncate mt-3 pl-[56px]">{agent.taskLabel}</p>
              )}

              {isWorking && agent.progress !== undefined && (
                <div className="mt-3 pl-[56px]">
                  <div className="px-bar" style={{ height: 4 }}>
                    <div className="px-bar-fill bar-run loading-bar-subtle" style={{ width: `${agent.progress}%` }} />
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

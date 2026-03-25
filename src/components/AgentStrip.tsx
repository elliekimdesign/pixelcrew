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
  working: "#7dd3fc",
  idle: "var(--crew-dim)",
  done: "#86efac",
  stuck: "#fda4af",
};

export default function AgentSidebar({ agents }: Props) {
  const working = agents.filter((a) => a.state === "working");
  const idle = agents.filter((a) => a.state !== "working");

  return (
    <aside className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <span className="font-pixel text-[18px] text-sky-400 uppercase">Crew</span>
          <span className="font-mono text-[12px] text-[var(--crew-dim)]">
            {working.length}/{agents.length} active
          </span>
        </div>
      </div>

      {/* Agent cards */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {[...working, ...idle].map((agent) => {
          const isWorking = agent.state === "working";

          return (
            <div
              key={agent.id}
              className="rounded-lg px-4 py-4 cursor-default transition-all duration-150"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: isWorking ? "0 0 12px rgba(56,189,248,0.12)" : "none",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="shrink-0 relative">
                  <div
                    className="rounded-lg p-1.5"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", imageRendering: "pixelated" }}
                  >
                    <PixelSprite character={agent.character} size={48} />
                  </div>
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-[9px] h-[9px] rounded-full border-2 ${dotClass[agent.state]}`}
                    style={{ borderColor: "var(--crew-bg)" }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-[14px] text-white/90 block">{agent.name}</span>
                  <span className="font-mono text-[12px] text-[var(--crew-dim)] block mt-0.5">{agent.title}</span>
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="font-mono text-[12px]" style={{ color: stateColor[agent.state] }}>
                      {stateText[agent.state]}
                    </span>
                    <span className={`inline-flex gap-[2px] ${isWorking ? "" : "invisible"}`}>
                      <span className="typing-dot w-[3px] h-[3px] rounded-full bg-sky-400 inline-block" />
                      <span className="typing-dot w-[3px] h-[3px] rounded-full bg-sky-400 inline-block" />
                      <span className="typing-dot w-[3px] h-[3px] rounded-full bg-sky-400 inline-block" />
                    </span>
                  </div>
                </div>
              </div>

              {agent.taskLabel && (
                <p className="font-mono text-[12px] text-[var(--crew-dim)] truncate mt-2 pl-[67px]">{agent.taskLabel}</p>
              )}

              {isWorking && agent.progress !== undefined && (
                <div className="mt-2 pl-[67px]">
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

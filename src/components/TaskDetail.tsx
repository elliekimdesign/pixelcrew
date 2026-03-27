"use client";

import { useState, useRef, useEffect } from "react";
import { Task, LogEntry, CharacterName, PlannerSection } from "@/lib/types";
import PixelSprite from "./PixelSprite";
import ReactMarkdown from "react-markdown";

export interface StreamingEntry {
  taskId: string;
  text: string;
  agent: CharacterName;
  group?: string;
}

interface Props {
  task: Task;
  streamingEntries?: Record<string, StreamingEntry>;
  onFollowUp?: (taskId: string, message: string) => void;
}

// ── Summarize helper ────────────────────────────────────────────────

const SUMMARY_THRESHOLD = 200;

function summarize(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return text;

  const bullets = lines.filter((l) => /^[-•*]/.test(l) || /^\d+\./.test(l));
  if (bullets.length >= 2) return bullets.slice(0, 2).join("\n");

  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 1) return sentences.slice(0, 2).join("").trim();

  if (text.length > SUMMARY_THRESHOLD) return text.slice(0, SUMMARY_THRESHOLD).replace(/\s+\S*$/, "") + "...";

  return text;
}

// ── Plan diagram ────────────────────────────────────────────────────

interface PlanGroup {
  agents: { name: string; character: CharacterName; subtask: string }[];
  isParallel: boolean;
}

function buildPlanGroups(sections: PlannerSection[], taskAgents: CharacterName[]): PlanGroup[] {
  const groups: PlanGroup[] = [];

  if (taskAgents.includes("mayor")) {
    groups.push({ agents: [{ name: "Mayor", character: "mayor", subtask: "Coordinate team" }], isParallel: false });
  }
  if (taskAgents.includes("planner")) {
    groups.push({ agents: [{ name: "Planner", character: "planner", subtask: "Create plan" }], isParallel: false });
  }

  const byGroup: Record<number, PlannerSection[]> = {};
  for (const s of sections) {
    if (!byGroup[s.group]) byGroup[s.group] = [];
    byGroup[s.group].push(s);
  }

  for (const key of Object.keys(byGroup).map(Number).sort((a, b) => a - b)) {
    const secs = byGroup[key];
    // Deduplicate agents within the same group
    const seen = new Set<string>();
    const unique = secs.filter((s) => {
      if (seen.has(s.agent)) return false;
      seen.add(s.agent);
      return true;
    });
    groups.push({
      agents: unique.map((s) => ({
        name: s.agent.charAt(0).toUpperCase() + s.agent.slice(1),
        character: s.agent,
        subtask: s.subtask.length > 40 ? s.subtask.slice(0, 40) + "..." : s.subtask,
      })),
      isParallel: unique.length > 1,
    });
  }

  if (!sections.some((s) => s.agent === "reviewer") && taskAgents.includes("reviewer")) {
    groups.push({ agents: [{ name: "Reviewer", character: "reviewer", subtask: "Quality check" }], isParallel: false });
  }

  return groups;
}

function PlanDiagram({ sections, taskAgents, currentStepIndex }: { sections: PlannerSection[]; taskAgents: CharacterName[]; currentStepIndex: number }) {
  const groups = buildPlanGroups(sections, taskAgents);

  return (
    <div className="flex items-start gap-2 overflow-x-auto pb-2">
      {groups.map((group, i) => {
        const isDone = i < currentStepIndex;
        const isCurrent = i === currentStepIndex;

        return (
          <div key={i} className="flex items-start gap-2 shrink-0">
            {i > 0 && <div className="text-[var(--border-strong)] text-[20px] mt-3">→</div>}
            
            {/* Show parallel agents stacked or single agent */}
            {group.isParallel ? (
              <div className={`rounded-lg border-2 transition-all p-3 ${
                isCurrent
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-md"
                  : isDone
                  ? "border-[var(--border)] bg-[var(--bg)] opacity-50"
                  : "border-[var(--border)] bg-[var(--bg-panel)]"
              }`}>
                <div className="text-center mb-2">
                  <span className={`text-[10px] uppercase tracking-wider font-bold ${
                    isCurrent ? "text-[var(--accent)]" : "text-[var(--text-dim)]"
                  }`}>
                    Parallel
                  </span>
                </div>
                <div className="space-y-1.5">
                  {group.agents.map((agent, j) => (
                    <div key={j} className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${
                      isCurrent ? "bg-white/60" : "bg-white/20"
                    }`}>
                      <div style={{ imageRendering: "pixelated" }}>
                        <PixelSprite character={agent.character} size={18} />
                      </div>
                      <span className={`text-[12px] whitespace-nowrap ${
                        isCurrent ? "text-[var(--accent)] font-semibold" : isDone ? "text-[var(--text-dim)] line-through" : "text-[var(--text-mid)]"
                      }`}>
                        {agent.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`rounded-lg border-2 px-4 py-2.5 transition-all ${
                isCurrent
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-sm"
                  : isDone
                  ? "border-[var(--border)] bg-[var(--bg)] opacity-50"
                  : "border-[var(--border)] bg-[var(--bg-panel)]"
              }`}>
                {group.agents.map((agent, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div style={{ imageRendering: "pixelated" }}>
                      <PixelSprite character={agent.character} size={20} />
                    </div>
                    <span className={`text-[14px] whitespace-nowrap ${
                      isCurrent ? "text-[var(--accent)] font-semibold" : isDone ? "text-[var(--text-dim)] line-through" : "text-[var(--text-mid)]"
                    }`}>
                      {agent.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Summary row (left panel) ────────────────────────────────────────

function SummaryRow({ entry, isSelected, onClick }: { entry: LogEntry; isSelected: boolean; onClick: () => void }) {
  if (entry.type === "system" && entry.text.startsWith("---")) {
    const label = entry.text.replace(/^-+\s*/, "").replace(/\s*-+$/, "");
    return (
      <div className="flex items-center gap-2 py-2 px-2">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-[12px] text-[var(--text-dim)]">{label}</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
    );
  }

  if (entry.type === "system") {
    return (
      <div className="px-4 py-2">
        <p className="text-[14px] text-[var(--text-dim)] italic">{entry.text}</p>
      </div>
    );
  }

  if (entry.type === "user") {
    return (
      <button onClick={onClick} className={`w-full text-left rounded-lg transition-all cursor-pointer border mt-2 mb-1 ${
        isSelected
          ? "border-[var(--border-strong)] bg-[var(--bg-card)]"
          : "border-[var(--border)] bg-[var(--bg-card)]/60 hover:bg-[var(--bg-card)]"
      }`}>
        <div className="px-4 py-1.5 border-b border-[var(--border)]">
          <span className="text-[12px] text-[var(--text-dim)] uppercase tracking-wide">You</span>
        </div>
        <div className="px-4 py-3">
          <p className="text-[14px] text-[var(--text)] line-clamp-3 leading-relaxed">{entry.text}</p>
        </div>
      </button>
    );
  }

  if (entry.type === "result") {
    return (
      <div className="px-4 py-2.5">
        <p className="text-[14px] text-emerald-600 font-semibold">{entry.text}</p>
      </div>
    );
  }

  // Agent entry
  const summary = entry.text.length > SUMMARY_THRESHOLD ? summarize(entry.text) : entry.text;
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-3 rounded-lg transition-all cursor-pointer border ${
      isSelected
        ? "bg-[var(--bg-card)] border-[var(--border-strong)]"
        : "border-transparent hover:bg-[var(--bg-panel)]"
    }`}>
      <div className="flex items-center gap-2.5 mb-2">
        {entry.character && (
          <>
            <div className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: (agentTheme[entry.character] || agentTheme.mayor).bg }} />
            <div style={{ imageRendering: "pixelated" }}>
              <PixelSprite character={entry.character} size={22} />
            </div>
          </>
        )}
        <span className="font-semibold text-[14px] text-[var(--text)]">
          {entry.character ? entry.character.charAt(0).toUpperCase() + entry.character.slice(1) : "Agent"}
        </span>
      </div>
      <p className="text-[14px] text-[var(--text-mid)] line-clamp-2 whitespace-pre-wrap leading-relaxed">{summary}</p>
    </button>
  );
}

// ── Inline reply input ───────────────────────────────────────────────

function InlineReply({ placeholder, onSubmit, compact }: { placeholder: string; onSubmit: (msg: string) => void; compact?: boolean }) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} className={compact ? "" : "mt-8 pt-5 border-t border-[var(--border)]"}>
      <div className="flex items-center gap-3 rounded-lg border-2 border-[var(--border-strong)] bg-[var(--bg-card)] px-6 py-5 shadow-sm">
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)]"
        />
        {value.trim() && (
          <button type="submit" className="text-[14px] text-[var(--accent)] uppercase hover:opacity-80 shrink-0 font-semibold">
            Send
          </button>
        )}
      </div>
    </form>
  );
}

// ── Agent color map ──────────────────────────────────────────────────

const agentTheme: Record<string, { bg: string; light: string; text: string; role: string }> = {
  mayor:      { bg: "#5b6cf0", light: "#eef0ff", text: "#3730a3", role: "The Boss" },
  planner:    { bg: "#8b5cf6", light: "#f3f0ff", text: "#5b21b6", role: "The Strategist" },
  researcher: { bg: "#f59e0b", light: "#fefce8", text: "#92400e", role: "The Scout" },
  coder:      { bg: "#06b6d4", light: "#ecfeff", text: "#155e75", role: "The Engineer" },
  fixer:      { bg: "#f97316", light: "#fff7ed", text: "#9a3412", role: "The Mechanic" },
  reviewer:   { bg: "#a855f7", light: "#faf5ff", text: "#6b21a8", role: "The Inspector" },
  monitor:    { bg: "#22c55e", light: "#f0fdf4", text: "#166534", role: "The Watchdog" },
};

// ── Detail view (right panel) ───────────────────────────────────────

function DetailView({ entry, onReply }: { entry: LogEntry | null; onReply?: (msg: string) => void }) {
  if (!entry) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[14px] text-[var(--text-dim)]">Select a message to view full detail</p>
      </div>
    );
  }

  if (entry.type === "user") {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-5 bg-[var(--accent)] flex items-center gap-3">
          <span className="text-[14px] text-white uppercase font-semibold">Your Prompt</span>
        </div>
        <div className="px-8 py-6">
          <p className="text-[16px] leading-[1.8] whitespace-pre-wrap text-[var(--text)]">{entry.text}</p>
        </div>
      </div>
    );
  }

  if (entry.type === "agent" && entry.character) {
    const agentName = entry.character.charAt(0).toUpperCase() + entry.character.slice(1);
    const theme = agentTheme[entry.character] || agentTheme.mayor;
    return (
      <div className="flex-1 overflow-y-auto">
        {/* Colored agent banner */}
        <div className="px-8 py-5 flex items-center gap-4" style={{ background: theme.bg }}>
          <div className="rounded-lg p-1.5 bg-white/20" style={{ imageRendering: "pixelated" }}>
            <PixelSprite character={entry.character} size={44} />
          </div>
          <div>
            <span className="text-[16px] text-white block uppercase font-semibold">{agentName}</span>
            <span className="text-[13px] text-white/60">{theme.role}</span>
          </div>
        </div>
        {/* Response content */}
        <div className="px-8 py-6">
          <div className="prose-detail text-[var(--text-mid)]">
            <ReactMarkdown>{entry.text}</ReactMarkdown>
          </div>

          {onReply && entry.text.includes("?") && (
            <InlineReply placeholder={`Reply to ${agentName}...`} onSubmit={onReply} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className={`prose-detail ${entry.type === "result" ? "text-emerald-600" : "text-[var(--text-dim)]"}`}>
        <ReactMarkdown>{entry.text}</ReactMarkdown>
      </div>
    </div>
  );
}

// ── Streaming bubble (left panel) ───────────────────────────────────

function StreamingSummary({ entry }: { entry: StreamingEntry }) {
  return (
    <div className="px-4 py-3 rounded-lg border border-[var(--clr-run)]/20 bg-[var(--bg-card)]">
      <div className="flex items-center gap-2.5 pb-2 mb-2 border-b border-[var(--border)]">
        <div style={{ imageRendering: "pixelated" }}>
          <PixelSprite character={entry.agent} size={22} />
        </div>
        <span className="font-semibold text-[14px] text-[var(--text)]">
          {entry.agent.charAt(0).toUpperCase() + entry.agent.slice(1)}
        </span>
        <span className="cursor-blink" />
      </div>
      <p className="text-[14px] text-[var(--text-mid)] line-clamp-2 whitespace-pre-wrap leading-relaxed">{entry.text}</p>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────

export default function TaskDetail({ task, streamingEntries, onFollowUp }: Props) {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeEntries = streamingEntries
    ? Object.values(streamingEntries).filter((e) => e.taskId === task.id) : [];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [task.log, activeEntries]);

  useEffect(() => {
    const agentEntries = task.log.filter((e) => e.type === "agent" || e.type === "user");
    if (agentEntries.length > 0) {
      setSelectedEntryId(agentEntries[agentEntries.length - 1].id);
    }
  }, [task.log]);

  const isStreaming = activeEntries.length > 0;
  const step = task.currentStep;
  let displayProgress = task.progress;
  if (isStreaming && step) {
    displayProgress = Math.max(task.progress, Math.round(step.progressBefore + (step.progressAfter - step.progressBefore) * 0.6));
  }
  if (task.status === "running" && displayProgress < 3) displayProgress = 3;

  const badgeClass = task.status === "done" ? "badge-done" : task.status === "stuck" ? "badge-stuck" : "badge-run";
  const barClass = task.status === "done" ? "bar-done" : task.status === "stuck" ? "bar-stuck" : "bar-run";

  const selectedEntry = task.log.find((e) => e.id === selectedEntryId) || null;

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      {/* Header */}
      <div className="px-16 py-6 border-b-2 border-[var(--border-strong)] bg-[var(--bg-panel)] flex items-center gap-4">
        <span className="text-[16px] text-[var(--text)] font-semibold truncate flex-1">{task.title}</span>
        <div className="flex items-center gap-2 shrink-0">
          {task.agents.map((char) => (
            <div key={char} className="rounded-lg p-1.5 border border-[var(--border)] bg-[var(--bg-card)]" style={{ imageRendering: "pixelated" }}>
              <PixelSprite character={char} size={20} />
            </div>
          ))}
          <span className={`text-[12px] px-3 py-2 rounded-lg ml-1 font-semibold ${badgeClass}`}>
            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Pipeline diagram + Progress */}
      {/* Pipeline section */}
      <div className="px-16 py-6 border-b-2 border-[var(--border-strong)] bg-[var(--bg-panel)]">
        <div className="rounded-lg border-2 border-[var(--border-strong)] p-5 mb-4 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-pixel text-[16px] text-[var(--text)] uppercase">Pipeline</span>
            {task.currentStep && (
              <span className="text-[12px] text-white bg-[var(--accent)] px-2.5 py-1 rounded-md font-semibold">
                Step {task.currentStep.index + 1}/{task.currentStep.total}
              </span>
            )}
          </div>
          {task.planSections ? (
            <PlanDiagram
              sections={task.planSections}
              taskAgents={task.agents}
              currentStepIndex={task.currentStep?.index ?? (task.status === "done" ? 999 : -1)}
            />
          ) : (
            <div className="flex items-start gap-2 overflow-x-auto pb-2">
              {task.agents.map((char, i) => {
                const agentName = char.charAt(0).toUpperCase() + char.slice(1);
                const isDone = task.status === "done" || (task.currentStep && task.currentStep.index > i);
                const isCurrent = task.currentStep && task.currentStep.index === i;
                
                return (
                  <div key={char} className="flex items-start gap-2 shrink-0">
                    {i > 0 && <div className="text-[var(--border-strong)] text-[20px] mt-2">→</div>}
                    <div className={`rounded-lg border-2 px-4 py-2.5 transition-all ${
                      isCurrent
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-sm"
                        : isDone
                        ? "border-[var(--border)] bg-[var(--bg)] opacity-50"
                        : "border-[var(--border)] bg-[var(--bg-panel)]"
                    }`}>
                      <div className="flex items-center gap-2">
                        <div style={{ imageRendering: "pixelated" }}>
                          <PixelSprite character={char} size={20} />
                        </div>
                        <span className={`text-[14px] whitespace-nowrap ${
                          isCurrent ? "text-[var(--accent)] font-semibold" : isDone ? "text-[var(--text-dim)] line-through" : "text-[var(--text-mid)]"
                        }`}>
                          {agentName}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-bar">
          <div className={`px-bar-fill ${barClass} ${task.status === "running" ? "loading-bar" : ""}`} style={{ width: `${displayProgress}%` }} />
        </div>
      </div>

      {/* Conversation + Crew Index */}
      <div className="flex-1 flex min-h-0 bg-white border-t-2 border-[var(--border-strong)]">
        {/* Main conversation */}
        <div className="flex-1 overflow-y-auto" id="conversation-scroll">
          <div className="py-8 px-16 space-y-5">
          {task.log.map((entry) => {
            // System dividers
            if (entry.type === "system" && entry.text.startsWith("---")) {
              const label = entry.text.replace(/^-+\s*/, "").replace(/\s*-+$/, "");
              return (
                <div key={entry.id} className="flex items-center gap-2 py-4">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-[12px] text-[var(--text-dim)]">{label}</span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>
              );
            }

            // System messages
            if (entry.type === "system") {
              return (
                <div key={entry.id} className="px-4 py-2">
                  <p className="text-[14px] text-[var(--text-dim)] italic">{entry.text}</p>
                </div>
              );
            }

            // User prompts
            if (entry.type === "user") {
              return (
                <div key={entry.id} id={`entry-${entry.id}`} className="rounded-xl overflow-hidden border-2 border-[var(--accent)] my-5 shadow-md">
                  <div className="px-8 py-4 bg-[var(--accent)]">
                    <span className="text-[14px] text-white uppercase font-semibold">Your Prompt</span>
                  </div>
                  <div className="px-12 py-6 bg-[var(--accent-soft)]">
                    <p className="text-[14px] leading-[1.8] text-[var(--text)]">{entry.text}</p>
                  </div>
                </div>
              );
            }

            // Result
            if (entry.type === "result") {
              return (
                <div key={entry.id} className="px-4 py-3">
                  <p className="text-[14px] text-emerald-600 font-semibold">{entry.text}</p>
                </div>
              );
            }

            // Agent entries — accordion
            const isExpanded = entry.id === selectedEntryId;
            const theme = entry.character ? (agentTheme[entry.character] || agentTheme.mayor) : agentTheme.mayor;
            const agentName = entry.character ? entry.character.charAt(0).toUpperCase() + entry.character.slice(1) : "Agent";
            const summary = entry.text.length > SUMMARY_THRESHOLD ? summarize(entry.text) : entry.text;

            return (
              <div key={entry.id} id={`entry-${entry.id}`} className="rounded-xl overflow-hidden border-2 border-[var(--border-strong)] shadow-sm">
                {/* Agent header — always visible, clickable */}
                <button
                  onClick={() => setSelectedEntryId(isExpanded ? null : entry.id)}
                  className="w-full flex items-center gap-4 px-8 py-5 cursor-pointer transition-all"
                  style={{ background: isExpanded ? theme.bg : theme.light }}
                >
                  {entry.character && (
                    <div className="rounded-lg p-2" style={{ background: isExpanded ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.06)", imageRendering: "pixelated" }}>
                      <PixelSprite character={entry.character} size={isExpanded ? 40 : 28} />
                    </div>
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <span className={`font-semibold text-[14px] block ${isExpanded ? "text-white" : ""}`} style={!isExpanded ? { color: theme.text } : undefined}>
                      {agentName}
                    </span>
                    {!isExpanded && (
                      <p className="text-[12px] text-[var(--text-mid)] truncate mt-1">{summary}</p>
                    )}
                    {isExpanded && (
                      <span className="text-[12px] text-white/70">{theme.role}</span>
                    )}
                  </div>
                  <span className={`text-[14px] shrink-0 ${isExpanded ? "text-white/40" : "text-[var(--text-dim)]"}`}>
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-16 py-8 border-t border-[var(--border)]">
                    <div className="prose-detail text-[var(--text-mid)]">
                      <ReactMarkdown>{entry.text}</ReactMarkdown>
                    </div>
                    {onFollowUp && entry.text.includes("?") && (
                      <InlineReply placeholder={`Reply to ${agentName}...`} onSubmit={(msg) => onFollowUp(task.id, msg)} />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Streaming entries */}
          {activeEntries.map((entry) => {
            const theme = agentTheme[entry.agent] || agentTheme.mayor;
            const agentName = entry.agent.charAt(0).toUpperCase() + entry.agent.slice(1);
            return (
              <div key={`streaming-${entry.agent}`} className="rounded-xl overflow-hidden border-2 border-[var(--accent)] shadow-md">
                <div className="flex items-center gap-3 px-8 py-5" style={{ background: theme.bg }}>
                  <div className="rounded-lg p-2 bg-white/25" style={{ imageRendering: "pixelated" }}>
                    <PixelSprite character={entry.agent} size={40} />
                  </div>
                  <div>
                    <span className="font-semibold text-[14px] text-white block uppercase">{agentName}</span>
                    <span className="text-[12px] text-white/70">{theme.role}</span>
                  </div>
                  <span className="cursor-blink ml-auto" />
                </div>
                <div className="px-16 py-8 border-t border-[var(--border)]">
                  <div className="prose-detail text-[var(--text-mid)]">
                    <ReactMarkdown>{entry.text}</ReactMarkdown>
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Crew Index (sticky TOC) */}
      {task.log.some((e) => e.type === "agent") && (
        <div className="w-[200px] shrink-0 border-l-2 border-[var(--border-strong)] bg-[var(--bg-panel)] overflow-y-auto">
          <div className="sticky top-0 py-5 px-4">
            <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider block mb-4 px-2 font-bold">Index</span>
            <div className="space-y-1">
              {task.log.filter((e) => e.type === "agent" || e.type === "user").map((entry) => {
                const isActive = entry.id === selectedEntryId;

                if (entry.type === "user") {
                  return (
                    <button
                      key={entry.id}
                      onClick={() => {
                        setSelectedEntryId(entry.id);
                        document.getElementById(`entry-${entry.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-[12px] transition-all cursor-pointer ${
                        isActive ? "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold" : "text-[var(--text-dim)] hover:bg-[var(--bg-card)]"
                      }`}
                    >
                      You
                    </button>
                  );
                }

                const theme = entry.character ? (agentTheme[entry.character] || agentTheme.mayor) : agentTheme.mayor;
                return (
                  <button
                    key={entry.id}
                    onClick={() => {
                      setSelectedEntryId(isActive ? null : entry.id);
                      document.getElementById(`entry-${entry.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 transition-all cursor-pointer ${
                      isActive ? "bg-[var(--bg-card)]" : "hover:bg-[var(--bg-card)]"
                    }`}
                  >
                    {entry.character && (
                      <div style={{ imageRendering: "pixelated" }}>
                        <PixelSprite character={entry.character} size={14} />
                      </div>
                    )}
                    <span className={`text-[12px] truncate ${isActive ? "font-semibold" : ""}`} style={{ color: isActive ? theme.bg : "var(--text-mid)" }}>
                      {entry.character ? entry.character.charAt(0).toUpperCase() + entry.character.slice(1) : "Agent"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Follow-up input */}
      {onFollowUp && (task.status === "done" || task.status === "stuck") && (
        <div className="shrink-0 px-16 py-6 border-t-2 border-[var(--border-strong)] bg-[var(--bg-panel)]">
          <InlineReply compact placeholder="Send a follow-up..." onSubmit={(msg) => onFollowUp(task.id, msg)} />
        </div>
      )}
    </div>
  );
}

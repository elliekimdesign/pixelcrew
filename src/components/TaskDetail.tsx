"use client";

import { useState, useRef, useEffect } from "react";
import { capitalizeLeadingLetter } from "@/lib/format";

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
  focusAgentChars?: CharacterName[];
  tintColor?: string;
  onAgentFocus?: (char: CharacterName | null) => void;
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
                      <span className={`text-[14px] whitespace-nowrap ${
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
    <form onSubmit={handleSubmit} className={compact ? "mt-4" : "mt-6 pt-4 border-t border-[var(--border)]"}>
      <div className="flex items-center gap-3 border border-[var(--border-strong)] bg-[var(--bg-card)] px-5 py-3">
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] leading-relaxed"
        />
        {value.trim() && (
          <button type="submit" className="text-[11px] text-[var(--accent)] uppercase hover:opacity-80 shrink-0 font-bold tracking-wider">
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
        <div className="pl-[4.5rem] pr-10 py-5 bg-[var(--accent)] flex items-center gap-3">
          <span className="text-[14px] text-white uppercase font-semibold">Your Prompt</span>
        </div>
        <div className="pl-[4.5rem] pr-12 py-6 bg-white">
          <p className="text-[16px] leading-[1.8] whitespace-pre-wrap text-[var(--text)] pl-1">{entry.text}</p>
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

export default function TaskDetail({ task, streamingEntries, onFollowUp, focusAgentChars = [], tintColor, onAgentFocus }: Props) {
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

  // When an agent tab is toggled, scroll to that agent's last log entry (only if single focus)
  useEffect(() => {
    if (focusAgentChars.length !== 1) return;
    const char = focusAgentChars[0];
    const agentEntries = task.log.filter((e) => e.type === "agent" && e.character === char);
    if (agentEntries.length > 0) {
      const last = agentEntries[agentEntries.length - 1];
      setSelectedEntryId(last.id);
      setTimeout(() => {
        document.getElementById(`entry-${last.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  }, [focusAgentChars, task.log]);

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
      {/* Header — agent tabs + inline progress */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-panel)]">
        <div className="flex items-stretch">
          {task.agents.map((char, i) => {
            const isActive = focusAgentChars.includes(char);
            const isCurrent = task.status === "running" && task.currentStep?.agent?.toLowerCase().includes(char);
            const isDone = task.status === "done" || (!isCurrent && task.log.some((e) => e.type === "agent" && e.character === char));
            const theme = agentTheme[char] || agentTheme.mayor;

            let bg = "var(--bg-panel)";
            if (isActive) bg = theme.bg;
            else if (isCurrent) bg = "var(--accent-soft)";
            else if (isDone) bg = "var(--bg)";

            let textColor = "var(--text-mid)";
            if (isActive) textColor = "#ffffff";
            else if (isCurrent) textColor = "var(--accent)";
            else if (isDone) textColor = "var(--text-dim)";

            return (
              <button
                key={char}
                onClick={() => onAgentFocus?.(char)}
                style={{
                  position: "relative",
                  zIndex: isActive ? task.agents.length + 1 : isCurrent ? task.agents.length : task.agents.length - i,
                  marginRight: "-10px",
                  padding: "6px 28px 6px 20px",
                  background: bg,
                  color: textColor,
                  clipPath: "polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  transition: "background 0.15s",
                  opacity: isDone && !isActive && !isCurrent ? 0.6 : 1,
                }}
              >
                <div className="flex items-center gap-2">
                  <div style={{ imageRendering: "pixelated" }}>
                    <PixelSprite character={char} size={16} />
                  </div>
                  <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: isActive || isCurrent ? 600 : 400 }}>
                    {char.charAt(0).toUpperCase() + char.slice(1)}
                  </span>
                  {isCurrent && <span className="w-1.5 h-1.5 rounded-full blink shrink-0" style={{ background: "var(--accent)" }} />}
                </div>
              </button>
            );
          })}

          {/* Spacer + right-side progress */}
          <div className="flex-1" />
          <div className="flex items-center gap-3 px-5 shrink-0">
            {task.status === "running" && step && (
              <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wide whitespace-nowrap">
                {step.index + 1} / {step.total}
              </span>
            )}
            <div style={{ width: 80 }}>
              <div className="px-bar">
                <div
                  className={`px-bar-fill ${barClass} ${task.status === "running" ? "loading-bar" : ""}`}
                  style={{ width: `${displayProgress}%` }}
                />
              </div>
            </div>
            <span className={`text-[11px] px-3 py-1.5 font-semibold uppercase ${badgeClass}`}>
              {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Conversation */}
      {focusAgentChars.length > 0 ? (
        /* ── Multi-pane split view ── */
        <div className="flex-1 flex flex-row min-h-0 bg-white/50 border-t border-[var(--border)]">
          {focusAgentChars.map((char, paneIdx) => {
            const agentEntries = task.log.filter((e) => e.type === "agent" && e.character === char);
            const theme = agentTheme[char] || agentTheme.mayor;
            const agentName = char.charAt(0).toUpperCase() + char.slice(1);
            return (
              <div
                key={char}
                className="flex-1 flex flex-col min-h-0"
                style={paneIdx < focusAgentChars.length - 1 ? { borderRight: "1px dashed var(--border)" } : {}}
              >
                {/* Pane content */}
                <div className="flex-1 overflow-y-auto">
                  <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 40px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    {agentEntries.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-[14px] text-[var(--text-dim)] italic">No output yet.</p>
                      </div>
                    ) : (
                      agentEntries.map((entry, i) => (
                        <div key={entry.id} className={`flex gap-4 py-4 ${i < agentEntries.length - 1 ? "border-b border-[var(--border)]" : ""}`}>
                          <div className="shrink-0 pt-1" style={{ imageRendering: "pixelated" }}>
                            <PixelSprite character={char} size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            {agentEntries.length > 1 && (
                              <span className="text-[12px] text-[var(--text-dim)] uppercase tracking-wider block mb-2">Run {i + 1}</span>
                            )}
                            <div className="prose-detail text-[var(--text-mid)]">
                              <ReactMarkdown>{entry.text}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
      /* ── Full log view ── */
      <div className="flex-1 flex min-h-0 bg-white/50 border-t border-[var(--border)]">
        <div className="flex-1 overflow-y-auto" id="conversation-scroll">
          <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 56px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {task.log.map((entry) => {
            // System dividers
            if (entry.type === "system" && entry.text.startsWith("---")) {
              const label = entry.text.replace(/^-+\s*/, "").replace(/\s*-+$/, "");
              return (
                <div key={entry.id} className="flex items-center gap-3 py-4">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-[11px] text-[var(--text-dim)] font-semibold uppercase">{label}</span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>
              );
            }

            // System messages
            if (entry.type === "system") {
              return (
                <div key={entry.id} className="py-2">
                  <p className="text-[15px] text-[var(--text-dim)] italic leading-relaxed">{entry.text}</p>
                </div>
              );
            }

            // User prompts
            if (entry.type === "user") {
              return (
                <div key={entry.id} id={`entry-${entry.id}`} className="overflow-hidden border-2 border-[var(--accent)] my-5">
                  <div className="px-6 py-3 bg-[var(--accent)]">
                    <span className="text-[11px] text-white uppercase font-bold tracking-wider">Your Prompt</span>
                  </div>
                  <div className="px-6 py-5 bg-white border-t border-[var(--accent)]/25">
                    <p className="text-[15px] leading-relaxed text-[var(--text)] pl-1">{entry.text}</p>
                  </div>
                </div>
              );
            }

            // Result
            if (entry.type === "result") {
              return (
                <div key={entry.id} className="py-3">
                  <p className="text-[15px] text-emerald-600 font-semibold leading-relaxed">{entry.text}</p>
                </div>
              );
            }

            // Agent entries — accordion
            const isExpanded = entry.id === selectedEntryId;
            const theme = entry.character ? (agentTheme[entry.character] || agentTheme.mayor) : agentTheme.mayor;
            const agentName = entry.character ? entry.character.charAt(0).toUpperCase() + entry.character.slice(1) : "Agent";
            const summary = entry.text.length > SUMMARY_THRESHOLD ? summarize(entry.text) : entry.text;

            return (
              <div key={entry.id} id={`entry-${entry.id}`} className="overflow-hidden border border-[var(--border-strong)]">
                {/* Agent header — always visible, clickable */}
                <button
                  onClick={() => setSelectedEntryId(isExpanded ? null : entry.id)}
                  className="w-full flex items-center gap-3 px-6 py-4 cursor-pointer transition-all"
                  style={{ background: isExpanded ? theme.bg : theme.light }}
                >
                  {entry.character && (
                    <div className="p-1.5" style={{ background: isExpanded ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.06)", imageRendering: "pixelated" }}>
                      <PixelSprite character={entry.character} size={isExpanded ? 32 : 24} />
                    </div>
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <span className={`font-semibold text-[15px] block ${isExpanded ? "text-white" : ""}`} style={!isExpanded ? { color: theme.text } : undefined}>
                      {agentName}
                    </span>
                    {!isExpanded && (
                      <p className="text-[14px] text-[var(--text-mid)] truncate mt-1">{summary}</p>
                    )}
                    {isExpanded && (
                      <span className="text-[13px] text-white/70">{theme.role}</span>
                    )}
                  </div>
                  <span className={`text-[14px] shrink-0 ${isExpanded ? "text-white/40" : "text-[var(--text-dim)]"}`}>
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-6 py-6 border-t border-[var(--border)]">
                    <div className="prose-detail text-[var(--text-mid)]">
                      <ReactMarkdown>{entry.text}</ReactMarkdown>
                    </div>
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
              <div key={`streaming-${entry.agent}`} className="overflow-hidden border-2 border-[var(--accent)]">
                <div className="flex items-center gap-3 px-6 py-4" style={{ background: theme.bg }}>
                  <div className="p-1.5 bg-white/25" style={{ imageRendering: "pixelated" }}>
                    <PixelSprite character={entry.agent} size={32} />
                  </div>
                  <div>
                    <span className="font-semibold text-[15px] text-white block uppercase">{agentName}</span>
                    <span className="text-[13px] text-white/70">{theme.role}</span>
                  </div>
                  <span className="cursor-blink ml-auto" />
                </div>
                <div className="px-6 py-6 border-t border-[var(--border)]">
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
      </div>
      )}

    </div>
  );
}

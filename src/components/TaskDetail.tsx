"use client";

import { useState, useRef, useEffect } from "react";
import { Task, LogEntry, CharacterName, PlannerSection } from "@/lib/types";
import PixelSprite from "./PixelSprite";

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
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {groups.map((group, i) => {
        const isDone = i < currentStepIndex;
        const isCurrent = i === currentStepIndex;

        return (
          <div key={i} className="flex items-center gap-1.5 shrink-0">
            {i > 0 && <div className="text-[var(--border-strong)] text-[14px]">&rarr;</div>}
            <div className={`rounded-lg border px-3 py-2 transition-all ${
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
                  <span className={`font-mono text-[13px] whitespace-nowrap ${
                    isCurrent ? "text-[var(--accent)] font-semibold" : isDone ? "text-[var(--text-dim)] line-through" : "text-[var(--text-mid)]"
                  }`}>
                    {agent.name}
                  </span>
                </div>
              ))}
            </div>
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
        <span className="font-mono text-[11px] text-[var(--text-dim)]">{label}</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
    );
  }

  if (entry.type === "system") {
    return (
      <div className="px-4 py-2">
        <p className="text-[13px] text-[var(--text-dim)] italic">{entry.text}</p>
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
          <span className="font-mono text-[11px] text-[var(--text-dim)] uppercase tracking-wide">You</span>
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
        <p className="text-[13px] text-emerald-600 font-semibold">{entry.text}</p>
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
          <div style={{ imageRendering: "pixelated" }}>
            <PixelSprite character={entry.character} size={22} />
          </div>
        )}
        <span className="font-mono font-semibold text-[14px] text-[var(--text)]">
          {entry.character ? entry.character.charAt(0).toUpperCase() + entry.character.slice(1) : "Agent"}
        </span>
      </div>
      <p className="text-[13px] text-[var(--text-mid)] line-clamp-2 whitespace-pre-wrap leading-relaxed">{summary}</p>
    </button>
  );
}

// ── Inline reply input ───────────────────────────────────────────────

function InlineReply({ placeholder, onSubmit }: { placeholder: string; onSubmit: (msg: string) => void }) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 pt-4 border-t border-[var(--border)]">
      <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3">
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)]"
        />
        {value.trim() && (
          <button type="submit" className="font-mono text-[12px] text-[var(--accent)] hover:underline shrink-0">
            Send
          </button>
        )}
      </div>
    </form>
  );
}

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
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-[var(--border)]">
          <span className="font-mono font-semibold text-[15px] text-[var(--accent)]">Your Prompt</span>
        </div>
        <p className="text-[15px] leading-[1.8] whitespace-pre-wrap text-[var(--text)]">{entry.text}</p>
      </div>
    );
  }

  if (entry.type === "agent" && entry.character) {
    const agentName = entry.character.charAt(0).toUpperCase() + entry.character.slice(1);
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[var(--border)]">
          <div className="rounded-lg p-1 bg-[var(--bg-panel)] border border-[var(--border)]" style={{ imageRendering: "pixelated" }}>
            <PixelSprite character={entry.character} size={40} />
          </div>
          <div>
            <span className="font-mono font-semibold text-[16px] text-[var(--text)] block">{agentName}</span>
            <span className="font-mono text-[12px] text-[var(--text-dim)]">Full response</span>
          </div>
        </div>
        <p className="text-[15px] leading-[1.8] whitespace-pre-wrap text-[var(--text-mid)]">{entry.text}</p>

        {onReply && entry.text.includes("?") && (
          <InlineReply placeholder={`Reply to ${agentName}...`} onSubmit={onReply} />
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <p className={`text-[15px] leading-[1.8] whitespace-pre-wrap ${
        entry.type === "result" ? "text-emerald-600" : "text-[var(--text-dim)]"
      }`}>{entry.text}</p>
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
        <span className="font-mono font-semibold text-[14px] text-[var(--text)]">
          {entry.agent.charAt(0).toUpperCase() + entry.agent.slice(1)}
        </span>
        <span className="cursor-blink" />
      </div>
      <p className="text-[13px] text-[var(--text-mid)] line-clamp-2 whitespace-pre-wrap leading-relaxed">{entry.text}</p>
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
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-8 py-4 border-b border-[var(--border)] bg-[var(--bg-panel)] flex items-center gap-4">
        <span className="font-mono font-semibold text-[16px] text-[var(--text)] truncate flex-1">{task.title}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {task.agents.map((char) => (
            <div key={char} className="rounded-lg p-1 border border-[var(--border)] bg-[var(--bg-card)]" style={{ imageRendering: "pixelated" }}>
              <PixelSprite character={char} size={20} />
            </div>
          ))}
          <span className={`font-mono text-[12px] px-2.5 py-1.5 rounded-lg ml-1 ${badgeClass}`}>
            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Pipeline diagram + Progress */}
      {/* Pipeline section */}
      <div className="px-8 py-4 border-b border-[var(--border)]">
        {task.planSections && (
          <div className="rounded-lg border border-[var(--border)] p-4 mb-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-pixel text-[16px] text-[var(--text)] uppercase">Pipeline</span>
              {task.currentStep && (
                <span className="font-mono text-[12px] text-[var(--accent)]">
                  Step {task.currentStep.index + 1}/{task.currentStep.total}
                </span>
              )}
            </div>
            <PlanDiagram
              sections={task.planSections}
              taskAgents={task.agents}
              currentStepIndex={task.currentStep?.index ?? (task.status === "done" ? 999 : -1)}
            />
          </div>
        )}
        <div className="px-bar">
          <div className={`px-bar-fill ${barClass} ${task.status === "running" ? "loading-bar" : ""}`} style={{ width: `${displayProgress}%` }} />
        </div>
      </div>

      {/* Split view */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Summary timeline */}
        <div className="w-[340px] shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-card)]">
          <div className="py-5 px-4 space-y-3">
            {task.log.map((entry) => (
              <SummaryRow
                key={entry.id}
                entry={entry}
                isSelected={entry.id === selectedEntryId}
                onClick={() => setSelectedEntryId(entry.id)}
              />
            ))}
            {activeEntries.map((entry) => (
              <StreamingSummary key={`streaming-${entry.agent}`} entry={entry} />
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Right: Full detail */}
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-card)]">
          <DetailView
            entry={selectedEntry}
            onReply={onFollowUp ? (msg) => onFollowUp(task.id, msg) : undefined}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Task, LogEntry, CharacterName } from "@/lib/types";
import PixelSprite from "./PixelSprite";
import CommandInput from "./CommandInput";

export interface StreamingEntry {
  taskId: string;
  text: string;
  agent: CharacterName;
  group?: string;
}

interface Props {
  task: Task;
  streamingEntries?: Record<string, StreamingEntry>; // keyed by agent name, multiple agents can stream at once
  onFollowUp?: (taskId: string, message: string) => void;
}

// ── Grouping logic ──────────────────────────────────────────────────

type RenderRow =
  | { type: "single"; entry: LogEntry }
  | { type: "parallel"; group: string; entries: LogEntry[] };

/** Walk through log entries linearly, collecting consecutive entries with the same `group` into parallel rows. */
function buildRenderRows(log: LogEntry[]): RenderRow[] {
  const rows: RenderRow[] = [];

  for (const entry of log) {
    if (!entry.group) {
      rows.push({ type: "single", entry });
      continue;
    }

    const last = rows[rows.length - 1];
    if (last && last.type === "parallel" && last.group === entry.group) {
      last.entries.push(entry);
    } else {
      rows.push({ type: "parallel", group: entry.group, entries: [entry] });
    }
  }

  return rows;
}

// ── Connector components ────────────────────────────────────────────

function VerticalLine() {
  return (
    <div className="flex justify-center">
      <div className="w-[1.5px] h-4 bg-[var(--border-strong)] rounded-full" />
    </div>
  );
}

function ForkConnector({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-center">
      {/* Single line down */}
      <div className="w-[1.5px] h-3 bg-[var(--border-strong)] rounded-full" />
      {/* Horizontal bar */}
      <div className="w-full h-[1.5px] bg-[var(--border-strong)] rounded-full" />
      {/* Per-column lines */}
      <div className="w-full" style={{ display: "grid", gridTemplateColumns: `repeat(${count}, 1fr)`, gap: "12px" }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex justify-center">
            <div className="w-[1.5px] h-3 bg-[var(--border-strong)] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MergeConnector({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-center">
      {/* Per-column lines */}
      <div className="w-full" style={{ display: "grid", gridTemplateColumns: `repeat(${count}, 1fr)`, gap: "12px" }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex justify-center">
            <div className="w-[1.5px] h-3 bg-[var(--border-strong)] rounded-full" />
          </div>
        ))}
      </div>
      {/* Horizontal bar */}
      <div className="w-full h-[1.5px] bg-[var(--border-strong)] rounded-full" />
      {/* Single line down */}
      <div className="w-[1.5px] h-3 bg-[var(--border-strong)] rounded-full" />
    </div>
  );
}

// ── Single entry renderer ───────────────────────────────────────────

const logTypeStyle: Record<string, { label: string; color: string }> = {
  user: { label: "YOU", color: "text-orange-500" },
  system: { label: "SYS", color: "text-indigo-500" },
  agent: { label: "", color: "text-[var(--text)]" },
  result: { label: "DONE", color: "text-green-600" },
};

function LogEntryBubble({ entry }: { entry: LogEntry }) {
  // Render divider lines (entries starting with "---") as centered muted separator
  if (entry.type === "system" && entry.text.startsWith("---")) {
    const label = entry.text.replace(/^-+\s*/, "").replace(/\s*-+$/, "");
    return (
      <div className="fade-up flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-[11px] text-[var(--text-light)] font-medium whitespace-nowrap">{label}</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
    );
  }

  const style = logTypeStyle[entry.type] || logTypeStyle.system;
  return (
    <div className="fade-up flex items-start gap-2.5">
      {entry.type === "agent" && entry.character ? (
        <div className="bg-white rounded-lg p-0.5 border border-[var(--border)] shrink-0 mt-0.5" style={{ imageRendering: "pixelated" }}>
          <PixelSprite character={entry.character} size={20} />
        </div>
      ) : (
        <span className={`font-mono text-[11px] font-semibold shrink-0 mt-px ${style.color}`}>
          {style.label}&gt;
        </span>
      )}
      <p className={`text-[13px] leading-relaxed whitespace-pre-wrap ${
        entry.type === "result"
          ? "text-green-600 font-semibold"
          : entry.type === "user"
          ? "text-[var(--text)]"
          : entry.type === "system"
          ? "text-[var(--text-light)] italic"
          : "text-[var(--text-mid)]"
      }`}>
        {entry.type === "agent" && entry.character && (
          <span className="font-semibold text-[var(--text)] mr-1">
            {entry.character.charAt(0).toUpperCase() + entry.character.slice(1)}:
          </span>
        )}
        {entry.text}
      </p>
    </div>
  );
}

function StreamingBubble({ entry }: { entry: StreamingEntry }) {
  return (
    <div className="fade-in flex items-start gap-2.5">
      <div className="bg-white rounded-lg p-0.5 border border-[var(--border)] shrink-0 mt-0.5" style={{ imageRendering: "pixelated" }}>
        <PixelSprite character={entry.agent} size={20} />
      </div>
      <p className="text-[13px] leading-relaxed text-[var(--text-mid)] whitespace-pre-wrap">
        <span className="font-semibold text-[var(--text)] mr-1">
          {entry.agent.charAt(0).toUpperCase() + entry.agent.slice(1)}:
        </span>
        {entry.text}
        <span className="cursor-blink" />
      </p>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────

export default function TaskDetail({ task, streamingEntries, onFollowUp }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Filter entries relevant to this task
  const activeEntries = streamingEntries
    ? Object.values(streamingEntries).filter((e) => e.taskId === task.id)
    : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [task.log, activeEntries]);

  const renderRows = buildRenderRows(task.log);

  // Compute interpolated progress while streaming
  const isStreaming = activeEntries.length > 0;
  const step = task.currentStep;
  let displayProgress = task.progress;
  if (isStreaming && step) {
    const midpoint = step.progressBefore + (step.progressAfter - step.progressBefore) * 0.6;
    displayProgress = Math.max(task.progress, Math.round(midpoint));
  }
  // Ensure at least a sliver of bar is visible when running
  if (task.status === "running" && displayProgress < 3) displayProgress = 3;

  // Split active streaming entries into grouped vs ungrouped
  const groupedStreaming: Record<string, StreamingEntry[]> = {};
  const ungroupedStreaming: StreamingEntry[] = [];
  for (const entry of activeEntries) {
    if (entry.group) {
      if (!groupedStreaming[entry.group]) groupedStreaming[entry.group] = [];
      groupedStreaming[entry.group].push(entry);
    } else {
      ungroupedStreaming.push(entry);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-3.5 border-b border-[var(--border)] bg-white/40">
        <div className="flex -space-x-1">
          {task.agents.map((char) => (
            <div key={char} className="bg-white rounded-lg p-0.5 border border-[var(--border)]" style={{ imageRendering: "pixelated" }}>
              <PixelSprite character={char} size={26} />
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] text-[var(--text)] font-pixel truncate block">{task.title}</span>
          <span className="text-[12px] text-[var(--text-light)]">{Math.round(displayProgress)}% complete</span>
        </div>
        <span className={`text-[11px] font-semibold px-3 py-1 rounded-md ${
          task.status === "done"
            ? "bg-green-50 text-green-600"
            : task.status === "stuck"
            ? "bg-red-50 text-red-500"
            : "bg-cyan-50 text-cyan-600"
        }`}>
          {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
        </span>
      </div>

      {/* Step indicator */}
      {task.status === "running" && task.currentStep && (
        <div className="px-5 pt-3 pb-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-pixel text-[var(--text-light)] uppercase">
              Step {task.currentStep.index + 1}/{task.currentStep.total}
            </span>
            <span className="text-[12px] text-[var(--text-mid)]">
              {task.currentStep.label}
            </span>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="px-5 pt-2 pb-2">
        <div className="px-bar">
          <div
            className={`px-bar-fill ${
              task.status === "done" ? "bg-green-400" : task.status === "stuck" ? "bg-red-400" : "bg-cyan-400"
            } ${task.status === "running" ? "loading-bar" : ""}`}
            style={{ width: `${displayProgress}%` }}
          />
        </div>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-0">
        {renderRows.map((row, rowIndex) => {
          const prevRow = renderRows[rowIndex - 1];
          const nextRow = renderRows[rowIndex + 1];

          if (row.type === "single") {
            return (
              <div key={row.entry.id}>
                {/* Vertical connector between rows */}
                {rowIndex > 0 && (
                  prevRow?.type === "parallel"
                    ? <MergeConnector count={prevRow.entries.length} />
                    : <VerticalLine />
                )}
                <LogEntryBubble entry={row.entry} />
              </div>
            );
          }

          // Parallel row
          const colCount = row.entries.length;
          return (
            <div key={row.group}>
              {/* Fork connector before parallel row */}
              {rowIndex > 0 ? <ForkConnector count={colCount} /> : <ForkConnector count={colCount} />}

              {/* Side-by-side grid */}
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}>
                {row.entries.map((entry) => (
                  <div key={entry.id} className="card p-3 min-w-0">
                    <LogEntryBubble entry={entry} />
                  </div>
                ))}
              </div>

              {/* Merge connector after parallel row if next is single */}
              {nextRow && nextRow.type === "single" ? null : null}
            </div>
          );
        })}

        {/* Live streaming — grouped entries in grid columns */}
        {Object.entries(groupedStreaming).map(([group, entries]) => {
          const colCount = entries.length;
          // Show fork connector if there are committed rows above
          const lastRow = renderRows[renderRows.length - 1];
          return (
            <div key={`streaming-${group}`}>
              {renderRows.length > 0 && (
                lastRow?.type === "parallel" && lastRow.group === group
                  ? null  // already inside the parallel section visually
                  : <ForkConnector count={colCount} />
              )}
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}>
                {entries.map((entry) => (
                  <div key={entry.agent} className="card p-3 min-w-0">
                    <StreamingBubble entry={entry} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Live streaming — ungrouped entries (full-width, as before) */}
        {ungroupedStreaming.map((entry) => (
          <div key={entry.agent}>
            {renderRows.length > 0 && <VerticalLine />}
            <StreamingBubble entry={entry} />
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Local prompt — pinned at bottom, visible when task is done or stuck */}
      {onFollowUp && (task.status === "done" || task.status === "stuck") && (
        <div className="shrink-0 px-4 py-3 border-t border-[var(--border)]">
          <CommandInput
            variant="local"
            placeholder="What should the team do next?"
            buttonLabel="Continue"
            onSubmit={(message) => onFollowUp(task.id, message)}
            disabled={false}
          />
        </div>
      )}
    </div>
  );
}

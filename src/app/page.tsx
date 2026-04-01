"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Agent, Task, LogEntry, CharacterName, CurrentStep } from "@/lib/types";
import { initialAgents } from "@/lib/mockData";
import { capitalizeLeadingLetter } from "@/lib/format";
import { createTask, getAgentPipeline, callAgent, parsePlannerSections, buildParallelPipeline, getTaskCounter, setTaskCounter } from "@/lib/taskEngine";
import { StreamingEntry } from "@/components/TaskDetail";
import CommandInput from "@/components/CommandInput";
import AgentSidebar from "@/components/AgentStrip";
import TaskCard from "@/components/TaskCard";
import TaskDetail from "@/components/TaskDetail";
import PixelSprite from "@/components/PixelSprite";

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  // Track multiple concurrent streaming agents (keyed by agent name)
  const [streamingEntries, setStreamingEntries] = useState<Record<string, StreamingEntry>>({});

  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load state on mount
  useEffect(() => {
    fetch("/api/state")
      .then((r) => r.json())
      .then((state) => {
        if (state && state.tasks) {
          // Restore any running tasks to "stuck" since the pipeline was interrupted
          const restoredTasks = state.tasks.map((t: Task) =>
            t.status === "running" ? { ...t, status: "stuck" as const } : t
          );
          setTasks(restoredTasks);
          setSelectedTaskId(state.selectedTaskId || null);

          // Restore agents — release any that were "working" back to idle
          if (state.agents) {
            const restoredAgents = state.agents.map((a: Agent) =>
              a.state === "working"
                ? { ...a, state: "idle" as const, taskId: undefined, taskLabel: undefined, progress: undefined }
                : a
            );
            setAgents(restoredAgents);
          }

          if (state.taskCounter) {
            setTaskCounter(state.taskCounter);
          }
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Save state when tasks, agents, or selection change (debounced)
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agents,
          tasks,
          selectedTaskId,
          taskCounter: getTaskCounter(),
        }),
      }).catch(() => {});
    }, 500);
  }, [agents, tasks, selectedTaskId, loaded]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;
  const workingAgents = agents.filter((a) => a.state === "working").length;

  // Helper: run a single agent step (used by both sequential and parallel paths)
  const runSingleStep = useCallback(async (
    taskId: string,
    step: { agent: CharacterName; progressAfter: number; label: string; subtask?: string },
    taskMessage: string,
    context: { agent: string; text: string }[],
    group?: string,
  ): Promise<{ agent: string; text: string } | null> => {
    // Update agent label
    setAgents((prev) =>
      prev.map((a) =>
        a.character === step.agent && a.taskId === taskId
          ? { ...a, state: "working" as const, taskLabel: step.label, progress: Math.max(a.progress || 0, 10) }
          : a
      )
    );

    // Add "thinking" log entry
    const thinkingLogId = `log-${Date.now()}-thinking-${step.agent}`;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const thinkingLog: LogEntry = {
          id: thinkingLogId,
          type: "system",
          text: `${capitalize(step.agent)} is working...`,
          timestamp: Date.now(),
          ...(group ? { group } : {}),
        };
        return { ...t, log: [...t.log, thinkingLog] };
      })
    );

    // Set up streaming entry for this agent
    setStreamingEntries((prev) => ({
      ...prev,
      [step.agent]: { taskId, text: "", agent: step.agent, ...(group ? { group } : {}) },
    }));

    try {
      const fullText = await callAgent(
        taskMessage,
        step.agent,
        context,
        (text) => {
          setStreamingEntries((prev) => ({
            ...prev,
            [step.agent]: { taskId, text, agent: step.agent, ...(group ? { group } : {}) },
          }));
        },
        step.subtask,
      );

      // Clear streaming entry for this agent
      setStreamingEntries((prev) => {
        const next = { ...prev };
        delete next[step.agent];
        return next;
      });

      // Replace thinking log with actual result
      const resultLog: LogEntry = {
        id: `log-${Date.now()}-result-${step.agent}`,
        type: "agent",
        character: step.agent,
        text: fullText,
        timestamp: Date.now(),
        ...(group ? { group } : {}),
      };

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            progress: step.progressAfter,
            log: t.log.filter((l) => l.id !== thinkingLogId).concat(resultLog),
          };
        })
      );

      // Update agent progress
      setAgents((prev) =>
        prev.map((a) =>
          a.character === step.agent && a.taskId === taskId
            ? { ...a, progress: step.progressAfter, taskLabel: "Done with part" }
            : a
        )
      );

      return { agent: capitalize(step.agent), text: fullText };
    } catch (error) {
      // Mark agent as stuck on failure
      setStreamingEntries((prev) => {
        const next = { ...prev };
        delete next[step.agent];
        return next;
      });

      setAgents((prev) =>
        prev.map((a) =>
          a.character === step.agent && a.taskId === taskId
            ? { ...a, state: "stuck" as const, taskLabel: "Failed" }
            : a
        )
      );

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            log: t.log.filter((l) => l.id !== thinkingLogId).concat({
              id: `log-${Date.now()}-error-${step.agent}`,
              type: "system",
              text: `${capitalize(step.agent)} encountered an error.`,
              timestamp: Date.now(),
              ...(group ? { group } : {}),
            }),
          };
        })
      );

      return null;
    }
  }, []);

  // Build context from previous agent log entries
  const buildPreviousContext = useCallback((task: Task): { agent: string; text: string }[] => {
    return task.log
      .filter((entry) => entry.type === "agent" && entry.character)
      .map((entry) => ({
        agent: capitalize(entry.character!),
        text: entry.text,
      }));
  }, []);

  // Helper: update currentStep on a task
  const setCurrentStep = useCallback((taskId: string, step: CurrentStep | undefined) => {
    setTasks((prev) =>
      prev.map((t) => t.id === taskId ? { ...t, currentStep: step } : t)
    );
  }, []);

  // Run the agent pipeline for a task
  const runPipeline = useCallback(async (
    task: Task,
    taskMessage: string,
    previousContext?: { agent: string; text: string }[],
  ) => {
    const context: { agent: string; text: string }[] = previousContext ? [...previousContext] : [];

    // Step 1: Run Mayor sequentially
    const mayorStep = { agent: "mayor" as CharacterName, progressAfter: 10, label: "Coordinating..." };
    const hasMayor = task.agents.includes("mayor");
    const hasPlanner = task.agents.includes("planner");

    // We'll compute totalSteps after we know the pipeline shape.
    // For now, start with mayor + planner, then add remaining steps.
    let stepIndex = 0;

    if (hasMayor) {
      // We don't know total yet, so set a preliminary value (updated below)
      setCurrentStep(task.id, { index: 0, total: 2, agent: "Mayor", label: "Coordinating...", progressBefore: 0, progressAfter: 10 });
      const result = await runSingleStep(task.id, mayorStep, taskMessage, context);
      if (result) context.push(result);
      stepIndex = 1;
    }

    // Step 2: Run Planner sequentially, capture output
    let plannerOutput = "";
    const plannerStep = { agent: "planner" as CharacterName, progressAfter: 20, label: "Planning..." };
    if (hasPlanner) {
      setCurrentStep(task.id, { index: stepIndex, total: stepIndex + 1, agent: "Planner", label: "Planning...", progressBefore: hasMayor ? 10 : 0, progressAfter: 20 });
      const result = await runSingleStep(task.id, plannerStep, taskMessage, context);
      if (result) {
        context.push(result);
        plannerOutput = result.text;
      }
      stepIndex++;
    }

    // Step 3: Try to parse structured sections from Planner
    const sections = parsePlannerSections(plannerOutput);

    if (sections) {
      // Store plan sections on the task for visual diagram
      setTasks((prev) =>
        prev.map((t) => t.id === task.id ? { ...t, planSections: sections } : t)
      );

      // Parallel path: use structured sections
      const pipeline = buildParallelPipeline(task, sections);
      const remainingGroups = pipeline.filter((g) => {
        const agents = g.steps.map((s) => s.agent);
        return !agents.includes("mayor") && !agents.includes("planner");
      });

      // Count total steps: mayor + planner + remaining groups
      const totalSteps = stepIndex + remainingGroups.length;

      for (const group of remainingGroups) {
        // Build step label for this group
        const groupLabel = group.steps.length > 1
          ? group.steps.map((s) => s.agent.charAt(0).toUpperCase() + s.agent.slice(1)).join(" + ") + " (parallel)"
          : group.steps[0].label;
        const groupAgentName = group.steps.length > 1
          ? group.steps.map((s) => s.agent.charAt(0).toUpperCase() + s.agent.slice(1)).join(" + ")
          : group.steps[0].agent.charAt(0).toUpperCase() + group.steps[0].agent.slice(1);

        // Find the progress value of the previous completed step
        const progressBefore = stepIndex > 0
          ? (stepIndex === 1 && hasMayor && !hasPlanner ? 10 : stepIndex === 1 && !hasMayor && hasPlanner ? 20 : 20)
          : 0;

        setCurrentStep(task.id, {
          index: stepIndex,
          total: totalSteps,
          agent: groupAgentName,
          label: groupLabel,
          progressBefore: task.progress || progressBefore,
          progressAfter: group.progressAfter,
        });

        if (group.type === "parallel" && group.steps.length > 1) {
          setAgents((prev) =>
            prev.map((a) => {
              const step = group.steps.find((s) => s.agent === a.character);
              if (step && a.taskId === task.id) {
                return { ...a, state: "working" as const, taskLabel: step.label };
              }
              return a;
            })
          );

          const groupId = `parallel-${Date.now()}`;
          const results = await Promise.allSettled(
            group.steps.map((step) => runSingleStep(task.id, step, taskMessage, [...context], groupId))
          );

          for (const result of results) {
            if (result.status === "fulfilled" && result.value) {
              context.push(result.value);
            }
          }

          setTasks((prev) =>
            prev.map((t) => t.id === task.id ? { ...t, progress: group.progressAfter } : t)
          );
        } else {
          for (const step of group.steps) {
            const result = await runSingleStep(task.id, step, taskMessage, context);
            if (result) context.push(result);
          }
        }

        stepIndex++;
      }
    } else {
      // Fallback: sequential pipeline (old behavior)
      const fallbackPipeline = getAgentPipeline(task);
      const remaining = fallbackPipeline.filter(
        (s) => s.agent !== "mayor" && s.agent !== "planner"
      );

      const totalSteps = stepIndex + remaining.length;
      let prevProgress = hasPlanner ? 20 : hasMayor ? 10 : 0;

      for (const step of remaining) {
        setCurrentStep(task.id, {
          index: stepIndex,
          total: totalSteps,
          agent: step.agent.charAt(0).toUpperCase() + step.agent.slice(1),
          label: step.label,
          progressBefore: prevProgress,
          progressAfter: step.progressAfter,
        });

        const result = await runSingleStep(task.id, step, taskMessage, context);
        if (result) context.push(result);
        prevProgress = step.progressAfter;
        stepIndex++;
      }
    }

    // Mark task as done, release agents
    const doneLog: LogEntry = {
      id: `log-${Date.now()}-done`,
      type: "result",
      text: "Task complete! All agents returning to idle.",
      timestamp: Date.now(),
    };

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== task.id) return t;
        return { ...t, status: "done", progress: 100, currentStep: undefined, log: [...t.log, doneLog] };
      })
    );

    setAgents((prev) =>
      prev.map((a) => {
        if (a.taskId !== task.id) return a;
        return { ...a, state: "idle" as const, taskId: undefined, taskLabel: undefined, progress: undefined };
      })
    );
  }, [runSingleStep, setCurrentStep]);

  const handleNewTask = useCallback((message: string) => {
    const { task, updatedAgents } = createTask(message, agents);

    setAgents(updatedAgents);
    setTasks((prev) => [task, ...prev]);
    setSelectedTaskId(task.id);

    // Create sandbox directory for this task
    fetch("/api/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id }),
    }).catch(() => {});

    // Start the agent pipeline (runs async, doesn't block)
    runPipeline(task, message);
  }, [agents, runPipeline]);

  const handleFollowUp = useCallback((taskId: string, message: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Guard: skip if task is running or agents are busy
    if (task.status === "running") return;
    const busyAgents = agents.filter((a) => a.state === "working");
    const taskAgentsBusy = busyAgents.some((a) => task.agents.includes(a.character));
    if (taskAgentsBusy) return;

    const newRunCount = task.runCount + 1;

    // Build previous context before modifying the task
    const previousContext = buildPreviousContext(task);

    // Add divider + user message to log, reopen the task
    const dividerLog: LogEntry = {
      id: `log-${Date.now()}-divider`,
      type: "system",
      text: `--- Follow-up #${newRunCount - 1} ---`,
      timestamp: Date.now(),
    };

    const userLog: LogEntry = {
      id: `log-${Date.now()}-followup`,
      type: "user",
      text: message,
      timestamp: Date.now(),
    };

    const updatedTask: Task = {
      ...task,
      status: "running",
      progress: 0,
      runCount: newRunCount,
      log: [...task.log, dividerLog, userLog],
    };

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));

    // Reset original agents to "working"
    setAgents((prev) =>
      prev.map((a) => {
        if (task.agents.includes(a.character)) {
          return {
            ...a,
            state: "working" as const,
            taskId: taskId,
            taskLabel: `Working on: ${capitalizeLeadingLetter(task.title)}`,
            progress: 0,
          };
        }
        return a;
      })
    );

    // Re-run the pipeline with previous context
    runPipeline(updatedTask, message, previousContext);
  }, [tasks, agents, runPipeline, buildPreviousContext]);

  return (
    <>
      <div className="bg-pixel" />

      <div className="h-screen flex flex-col gap-2" style={{ padding: '12px' }}>
        <div className="flex-1 grid min-h-0 gap-4" style={{ gridTemplateColumns: "16rem 1fr", gridTemplateRows: "auto 1fr" }}>
          {/* Top-left: Logo */}
          <div className="flex items-start">
            <AgentSidebar />
          </div>

          {/* Top-right: Crew team section */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-[11px] text-[var(--text-mid)] uppercase tracking-wider">Crew</span>
              <span className="text-[11px] text-[var(--text-dim)]">
                {agents.filter((a) => a.state === "working").length} active
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {agents.map((agent) => {
                const isWorking = agent.state === "working";
                return (
                  <div
                    key={agent.id}
                    className={`flex items-center gap-2 px-3 py-2 transition-all duration-200 border ${
                      isWorking ? "bg-[var(--accent-soft)] border-[var(--accent)]" : "bg-[var(--bg)] border-[var(--border)] hover:bg-[var(--bg-panel)]"
                    }`}
                  >
                    <div className="shrink-0" style={{ imageRendering: "pixelated" }}>
                      <PixelSprite character={agent.character} size={20} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] text-[var(--text)] font-medium block leading-tight">{agent.name}</span>
                      <span className={`text-[10px] ${isWorking ? "text-[var(--accent)]" : "text-[var(--text-dim)]"} mt-0.5 block`}>
                        {agent.state === "working" ? "Active" : agent.state === "done" ? "Done" : agent.state === "stuck" ? "Error" : "Idle"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom-left: Task list */}
          <div className="flex flex-col min-h-0">
            <div className="mb-3 px-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-[var(--text-mid)] uppercase tracking-widest">Tasks</span>
                <span className="text-[11px] text-[var(--text-dim)] font-medium">{tasks.length}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isSelected={task.id === selectedTaskId}
                  onClick={() => setSelectedTaskId(task.id)}
                />
              ))}
            </div>
          </div>

          {/* Bottom-right: Task detail / chat */}
          <div className="flex flex-col min-h-0 bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden">
            {tasks.length > 0 ? (
              selectedTask ? (
                <div className="flex-1 min-h-0 overflow-hidden">
                  <TaskDetail
                    task={selectedTask}
                    streamingEntries={streamingEntries}
                    onFollowUp={handleFollowUp}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-[13px] text-[var(--text-dim)]">Select a task to see details</p>
                </div>
              )
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="flex justify-center gap-2 mb-3">
                    {(["mayor", "planner", "researcher", "coder", "fixer", "reviewer", "monitor"] as const).map((char) => (
                      <div key={char} className="bg-[var(--bg)] p-2" style={{ imageRendering: "pixelated" }}>
                        <PixelSprite character={char} size={32} />
                      </div>
                    ))}
                  </div>
                  <p className="text-[14px] font-semibold text-[var(--text)]">Your crew is ready</p>
                  <p className="text-[13px] text-[var(--text-dim)]">Type a mission below to get started</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-3 max-w-md mx-auto">
                    {["build a landing page", "fix the login bug", "design a dashboard", "review the API"].map((example) => (
                      <button
                        key={example}
                        onClick={() => handleNewTask(example)}
                        className="text-[12px] text-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 hover:opacity-80 transition-all cursor-pointer"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom prompt — same rail as chat; no full-width white panel (show page bg) */}
        <div className="grid shrink-0 gap-4 min-w-0" style={{ gridTemplateColumns: "16rem 1fr" }}>
          <div className="min-w-0" aria-hidden />
          <div className="min-w-0">
            <div className="w-full max-w-[1000px] mx-auto pl-16 pr-14 py-1">
              <div className="overflow-hidden border-2 border-[var(--accent)]">
                <div className="pl-[4.5rem] pr-10 py-3 bg-[var(--accent)]">
                  <span className="text-[11px] text-white uppercase font-bold tracking-wider">Your Prompt</span>
                </div>
                <div className="bg-white border-t border-[var(--accent)]/25">
                  <CommandInput onSubmit={handleNewTask} disabled={false} variant="rail" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function capitalize(s: CharacterName): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

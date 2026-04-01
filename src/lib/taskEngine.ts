import { capitalizeLeadingLetter } from "./format";
import { Agent, Task, LogEntry, CharacterName, PlannerSection, PipelineGroup, AgentStep } from "./types";

let taskCounter = 0;

export function getTaskCounter(): number {
  return taskCounter;
}

export function setTaskCounter(n: number): void {
  taskCounter = n;
}

// Pick which agents to assign based on the task
function pickAgents(message: string, allAgents: Agent[]): CharacterName[] {
  const lower = message.toLowerCase();
  const idle = allAgents.filter((a) => a.state === "idle" && a.character !== "monitor").map((a) => a.character);

  const team: CharacterName[] = [];
  // Mayor always coordinates
  if (idle.includes("mayor")) team.push("mayor");
  // Planner always plans
  if (idle.includes("planner")) team.push("planner");

  if (lower.includes("build") || lower.includes("create") || lower.includes("make") || lower.includes("code")) {
    if (idle.includes("researcher")) team.push("researcher");
    if (idle.includes("coder")) team.push("coder");
  } else if (lower.includes("design") || lower.includes("ui") || lower.includes("layout")) {
    if (idle.includes("researcher")) team.push("researcher");
    if (idle.includes("reviewer")) team.push("reviewer");
  } else if (lower.includes("fix") || lower.includes("bug") || lower.includes("error")) {
    if (idle.includes("researcher")) team.push("researcher");
    if (idle.includes("fixer")) team.push("fixer");
  } else if (lower.includes("review") || lower.includes("check") || lower.includes("test")) {
    if (idle.includes("reviewer")) team.push("reviewer");
  } else {
    for (const c of idle) {
      if (!team.includes(c) && team.length < 4) team.push(c);
    }
  }

  if (team.length === 0) team.push("mayor");
  return team;
}

export function createTask(message: string, agents: Agent[]): { task: Task; updatedAgents: Agent[] } {
  taskCounter++;
  const id = `task-${taskCounter}-${Date.now()}`;
  const assigned = pickAgents(message, agents);

  const firstLog: LogEntry = {
    id: `log-${Date.now()}-0`,
    type: "user",
    text: message,
    timestamp: Date.now(),
  };

  const assignLog: LogEntry = {
    id: `log-${Date.now()}-1`,
    type: "system",
    text: `Mayor assigned ${assigned.filter((a) => a !== "mayor").map(capitalize).join(", ") || "the team"} to this task.`,
    timestamp: Date.now(),
  };

  const task: Task = {
    id,
    title: message.length > 40 ? message.slice(0, 40) + "..." : message,
    status: "running",
    progress: 0,
    agents: assigned,
    log: [firstLog, assignLog],
    createdAt: Date.now(),
    runCount: 1,
  };

  const updatedAgents = agents.map((a) => {
    if (assigned.includes(a.character)) {
      return {
        ...a,
        state: "working" as const,
        taskId: id,
        taskLabel:
          a.character === "mayor"
            ? `Coordinating: ${capitalizeLeadingLetter(task.title)}`
            : `Working on: ${capitalizeLeadingLetter(task.title)}`,
        progress: 0,
      };
    }
    return a;
  });

  return { task, updatedAgents };
}

// The agent pipeline: which agents run in what order
// Each step can see the output of previous steps

export function getAgentPipeline(task: Task): AgentStep[] {
  const agents = task.agents;
  const steps: AgentStep[] = [];

  // Mayor coordinates first
  if (agents.includes("mayor")) {
    steps.push({ agent: "mayor", progressAfter: 10, label: "Coordinating..." });
  }

  // Planner breaks down the task
  if (agents.includes("planner")) {
    steps.push({ agent: "planner", progressAfter: 25, label: "Planning..." });
  }

  // Then researchers/analysts
  for (const a of ["researcher", "reviewer"] as CharacterName[]) {
    if (agents.includes(a) && !steps.find((s) => s.agent === a)) {
      steps.push({
        agent: a,
        progressAfter: steps.length <= 2 ? 50 : 40,
        label: a === "researcher" ? "Researching..." : "Analyzing...",
      });
    }
  }

  // Then implementers
  for (const a of ["coder", "fixer"] as CharacterName[]) {
    if (agents.includes(a)) {
      steps.push({
        agent: a,
        progressAfter: 80,
        label: a === "coder" ? "Coding..." : "Fixing...",
      });
    }
  }

  // If reviewer is assigned and not yet added (means it's review time)
  if (agents.includes("reviewer") && !steps.find((s) => s.agent === "reviewer")) {
    steps.push({ agent: "reviewer", progressAfter: 95, label: "Reviewing..." });
  }

  return steps;
}

// Call an agent API and stream the response, collecting the full text
export async function callAgent(
  task: string,
  agent: CharacterName,
  context: { agent: string; text: string }[],
  onChunk: (text: string) => void,
  subtask?: string,
): Promise<string> {
  const response = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, agent, context, subtask }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            fullText += parsed.text;
            onChunk(fullText);
          } catch {
            // skip
          }
        }
      }
    }
  }

  return fullText;
}

// Parse structured sections from Planner's output
const validAgents: CharacterName[] = ["researcher", "coder", "fixer", "reviewer"];

export function parsePlannerSections(plannerOutput: string): PlannerSection[] | null {
  const startMarker = "---SECTIONS_START---";
  const endMarker = "---SECTIONS_END---";

  const startIdx = plannerOutput.indexOf(startMarker);
  const endIdx = plannerOutput.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return null;

  const jsonStr = plannerOutput.slice(startIdx + startMarker.length, endIdx).trim();

  try {
    const sections: PlannerSection[] = JSON.parse(jsonStr);

    // Validate structure
    if (!Array.isArray(sections) || sections.length === 0) return null;
    for (const s of sections) {
      if (!validAgents.includes(s.agent)) return null;
      if (typeof s.subtask !== "string" || s.subtask.length === 0) return null;
      if (typeof s.group !== "number" || s.group < 1) return null;
    }

    return sections;
  } catch {
    return null;
  }
}

// Build a parallel-aware pipeline from Planner's structured sections
export function buildParallelPipeline(task: Task, sections: PlannerSection[]): PipelineGroup[] {
  const groups: PipelineGroup[] = [];

  // Mayor (sequential)
  if (task.agents.includes("mayor")) {
    groups.push({
      type: "sequential",
      steps: [{ agent: "mayor", progressAfter: 10, label: "Coordinating..." }],
      progressAfter: 10,
    });
  }

  // Planner (sequential)
  if (task.agents.includes("planner")) {
    groups.push({
      type: "sequential",
      steps: [{ agent: "planner", progressAfter: 20, label: "Planning..." }],
      progressAfter: 20,
    });
  }

  // Group sections by group number
  const sectionsByGroup = new Map<number, PlannerSection[]>();
  for (const s of sections) {
    const existing = sectionsByGroup.get(s.group) || [];
    existing.push(s);
    sectionsByGroup.set(s.group, existing);
  }

  const sortedGroupNums = Array.from(sectionsByGroup.keys()).sort((a, b) => a - b);
  const totalGroups = sortedGroupNums.length;

  // Distribute progress between 25% and 85%
  sortedGroupNums.forEach((groupNum, idx) => {
    const secs = sectionsByGroup.get(groupNum)!;
    const progressAfter = Math.round(25 + ((idx + 1) / totalGroups) * 60);
    const isParallel = secs.length > 1;

    const steps: AgentStep[] = secs.map((s) => ({
      agent: s.agent,
      progressAfter,
      label: s.subtask.length > 40 ? s.subtask.slice(0, 40) + "..." : s.subtask,
      subtask: s.subtask,
    }));

    groups.push({
      type: isParallel ? "parallel" : "sequential",
      steps,
      progressAfter,
    });
  });

  // Reviewer (sequential, always last)
  groups.push({
    type: "sequential",
    steps: [{ agent: "reviewer", progressAfter: 95, label: "Reviewing..." }],
    progressAfter: 95,
  });

  return groups;
}

function capitalize(s: CharacterName): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

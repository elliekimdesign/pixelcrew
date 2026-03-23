export type AgentState = "working" | "idle" | "done" | "stuck";
export type CharacterName = "mayor" | "planner" | "researcher" | "coder" | "fixer" | "reviewer" | "monitor";

export interface Agent {
  id: string;
  name: string;
  character: CharacterName;
  title: string;
  state: AgentState;
  taskId?: string; // which task this agent is working on
  taskLabel?: string;
  progress?: number;
}

export interface Task {
  id: string;
  title: string;
  status: "running" | "done" | "stuck";
  progress: number;
  agents: CharacterName[]; // assigned agents
  log: LogEntry[]; // conversation / activity log
  createdAt: number;
  runCount: number; // how many times the pipeline has run
}

export interface LogEntry {
  id: string;
  type: "system" | "agent" | "user" | "result";
  character?: CharacterName;
  text: string;
  timestamp: number;
  group?: string;
}

// Structured output from Planner: each section is a subtask assigned to an agent
export interface PlannerSection {
  agent: CharacterName;
  subtask: string;
  group: number; // same group number = run in parallel
}

// A group of agent steps that run together (sequentially or in parallel)
export interface PipelineGroup {
  type: "sequential" | "parallel";
  steps: AgentStep[];
  progressAfter: number;
}

export interface AgentStep {
  agent: CharacterName;
  progressAfter: number;
  label: string;
  subtask?: string; // specific subtask from Planner
}

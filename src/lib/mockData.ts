import { Agent } from "./types";

export const initialAgents: Agent[] = [
  { id: "mayor-1", name: "Mayor", character: "mayor", title: "The Boss", state: "idle" },
  { id: "pc-planner", name: "Planner", character: "planner", title: "The Strategist", state: "idle" },
  { id: "pc-researcher", name: "Researcher", character: "researcher", title: "The Scout", state: "idle" },
  { id: "pc-coder", name: "Coder", character: "coder", title: "The Engineer", state: "idle" },
  { id: "pc-fixer", name: "Fixer", character: "fixer", title: "The Mechanic", state: "idle" },
  { id: "pc-reviewer", name: "Reviewer", character: "reviewer", title: "The Inspector", state: "idle" },
  { id: "monitor-1", name: "Monitor", character: "monitor", title: "The Watchdog", state: "working", taskLabel: "Monitoring systems", progress: 100 },
];

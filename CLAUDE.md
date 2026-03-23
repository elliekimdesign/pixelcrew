# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm start        # Run production build
```

No test runner or linter is configured.

## Environment

- AI calls go through the Claude CLI (`~/.local/bin/claude`), not the Anthropic API directly. Override with `CLAUDE_PATH` env var.
- No `ANTHROPIC_API_KEY` needed — the CLI uses the Max subscription OAuth token. The key is explicitly stripped from the child process env in `src/lib/claudeCli.ts` to prevent the placeholder in `.env.local` from interfering.
- `data/state.json` — persisted app state (tasks, agents, task counter). Auto-created.
- `sandbox/<task-id>/` — isolated directories for agent-generated files. Auto-created per task.

## Architecture

This is a multi-agent orchestration dashboard. Users submit tasks, and a team of 7 AI agents (Mayor, Planner, Researcher, Coder, Fixer, Reviewer, Monitor) collaborates to complete them with real-time streaming.

### Data flow

```
User input → page.tsx creates task + picks agents via taskEngine
           → runPipeline() executes agent steps:
               1. Mayor (sequential) → coordinates
               2. Planner (sequential) → outputs structured JSON sections
               3. Worker agents (parallel if Planner sections parse, else sequential)
               4. Reviewer (sequential) → quality check
           → Each step calls /api/agent → spawns claude CLI → streams SSE back
           → Frontend accumulates streamed text in streamingEntries state
           → On completion, streaming entry moves to task.log as a LogEntry
```

### Key modules

- **`src/lib/taskEngine.ts`** — Core orchestration: task creation, agent selection (keyword-based), pipeline building, Planner output parsing, SSE consumption. Exports a mutable `taskCounter` that must be restored on load.
- **`src/lib/claudeCli.ts`** — Spawns `claude -p --output-format stream-json --verbose --include-partial-messages` and converts newline-delimited JSON into `data: {"text":"..."}\n\n` SSE format.
- **`src/app/page.tsx`** — All state lives here (agents, tasks, selectedTaskId, streamingEntries). Persistence loads from `/api/state` on mount and saves with 500ms debounce on changes. Interrupted "running" tasks become "stuck" on reload.
- **`src/lib/types.ts`** — `Agent`, `Task`, `LogEntry`, `PlannerSection`, `PipelineGroup`, `AgentStep`.

### Planner structured output

The Planner agent is prompted to emit subtasks between `---SECTIONS_START---` / `---SECTIONS_END---` markers as JSON:
```json
[{ "agent": "researcher", "subtask": "...", "group": 1 }, ...]
```
Same `group` number = parallel execution. Higher group = runs after lower groups finish. If parsing fails, the pipeline falls back to sequential execution. `parsePlannerSections()` in taskEngine validates agent names and types.

### API routes (all `runtime = "nodejs"`)

| Route | Purpose |
|-------|---------|
| `POST /api/agent` | Streams agent response via Claude CLI. Takes `{task, agent, context, subtask?}`. Each agent character has a distinct system prompt defined in the route file. |
| `POST /api/chat` | General chat endpoint (same streaming pattern). |
| `GET/POST /api/state` | Read/write `data/state.json`. |
| `GET/POST /api/sandbox` | List/create per-task sandbox directories. |

### SSE streaming contract

All streaming endpoints return `Content-Type: text/event-stream` with:
```
data: {"text":"chunk"}\n\n     ← incremental text
data: [DONE]\n\n               ← end of stream
```
The frontend (`callAgent` in taskEngine) reads via `response.body.getReader()` and accumulates `.text` fields.

## UI conventions

- Retro pixel-art aesthetic: Press Start 2P font for labels, 12×12 SVG pixel sprites per agent, beige palette.
- Parallel agent outputs render side-by-side with fork/merge connectors in `TaskDetail`.
- Agent states: `idle`, `working`, `done`, `stuck`. Monitor is always `working` (passive watchdog, never assigned to tasks).

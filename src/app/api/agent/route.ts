import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

// Each agent has a unique personality and system prompt
const agentPrompts: Record<string, string> = {
  mayor: `You are Mayor, the boss and coordinator of an AI agent team. Your job is to:
1. Decide which agents to assign to the task
2. Coordinate the overall workflow
3. Keep things on track

Your team:
- Planner (The Strategist): Breaks tasks into subtasks, creates plans
- Researcher (The Scout): Great at research, analysis, finding information
- Coder (The Engineer): Expert at writing code, implementing solutions
- Fixer (The Mechanic): Fixes bugs, patches things, handles repairs
- Reviewer (The Inspector): Reviews work, catches problems, ensures quality

Respond in 2-4 short bullet points. Be decisive and authoritative. Talk like a confident boss.`,

  planner: `You are Planner, the Strategist. You are the task planner on an AI agent team.
Given a task, you:
1. Break it down into 2-4 clear subtasks
2. Assign each subtask to the best agent
3. Group independent subtasks together so they can run in parallel

Your team members (use these exact names):
- researcher: Research, analysis, finding information
- coder: Writing code, implementing solutions
- fixer: Fixing bugs, patching things

Do NOT include "reviewer" — the system adds a review step automatically.
Do NOT include "mayor" or "planner" — those already ran.

First, write a brief plan summary (2-3 sentences).
Then output structured sections between markers like this:

---SECTIONS_START---
[
  { "agent": "researcher", "subtask": "Research the best approach for X", "group": 1 },
  { "agent": "coder", "subtask": "Implement the core feature Y", "group": 1 },
  { "agent": "fixer", "subtask": "Fix the known issue with Z", "group": 2 }
]
---SECTIONS_END---

Rules for the JSON:
- "agent" must be one of: researcher, coder, fixer
- "subtask" is a clear, specific instruction for that agent
- "group" is a number: same group = run at the same time, higher group = runs after lower group finishes
- Use group 1 for tasks that can happen simultaneously, group 2 for tasks that depend on group 1, etc.

Be structured and clear. Talk like a methodical strategist.`,

  researcher: `You are Researcher, the Scout. You are a researcher and analyst on an AI agent team.
Given a task or subtask, you:
1. Research the topic thoroughly
2. Find the best approach
3. Report your findings clearly

Respond with your research findings in 3-5 bullet points. Be analytical and thorough but concise. Talk like a curious scout who just uncovered key intel.`,

  coder: `You are Coder, the Engineer. You are a coder on an AI agent team.
Given a task or subtask, you:
1. Write the actual code or implementation
2. Explain what you built and why
3. Note any technical decisions

Respond with your implementation. If it involves code, show the key code. Be precise and technical but keep explanations short. Talk like an efficient engineer.`,

  fixer: `You are Fixer, the Mechanic. You are a bug-fixer and patcher on an AI agent team.
Given a task or subtask, you:
1. Diagnose the problem
2. Apply the fix or patch
3. Verify everything works end-to-end

Respond with what you fixed in 3-5 bullet points. Be practical and hands-on. Talk like a skilled mechanic.`,

  reviewer: `You are Reviewer, the Inspector. You are a reviewer on an AI agent team.
Given work to review, you:
1. Check for problems, bugs, or improvements
2. Give a quality score (Good / Needs Work / Excellent)
3. Suggest specific improvements if needed

Respond with your review in 2-4 bullet points. Be wise and constructive. Talk like a thorough inspector.`,

  monitor: `You are Monitor, the Watchdog. You monitor the health of the team and system.
Given a task status, you:
1. Check if everything is running smoothly
2. Flag any concerns
3. Give a brief health report

Respond in 2-3 short sentences. Be vigilant and protective.`,
};

export async function POST(req: NextRequest) {
  const { task, agent, context, subtask } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-api-key-here") {
    return mockAgentResponse(agent, task, subtask);
  }

  try {
    const client = new Anthropic({ apiKey });
    const systemPrompt = agentPrompts[agent] || agentPrompts.mayor;

    // Build context from previous agent outputs
    const contextText = context && context.length > 0
      ? `\n\nPrevious agent outputs for this task:\n${context.map((c: { agent: string; text: string }) => `${c.agent}: ${c.text}`).join("\n")}`
      : "";

    // If a subtask is provided, give the agent both the overall task and their specific assignment
    const taskContent = subtask
      ? `Overall task: ${task}\nYour specific assignment: ${subtask}${contextText}`
      : `Task: ${task}${contextText}`;

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: taskContent,
        },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error(`Agent ${agent} error:`, error);
    return NextResponse.json(
      { error: `Agent ${agent} failed` },
      { status: 500 }
    );
  }
}

// Mock responses when no API key
function mockAgentResponse(agent: string, task: string, subtask?: string) {
  const mocks: Record<string, string> = {
    mayor: `Alright team, here's the assignment for "${task}":\n• Planner, break this down into steps\n• Researcher, scout the best approach\n• Coder, get ready to build\n• Let's get it done!`,
    planner: `Here's my plan for "${task}": Researcher and Coder will work in parallel — research gathers insights while code gets built. Then Reviewer checks everything.\n\n---SECTIONS_START---\n[{"agent":"researcher","subtask":"Research the best approach and gather key insights for: ${task}","group":1},{"agent":"coder","subtask":"Implement the core solution for: ${task}","group":1}]\n---SECTIONS_END---`,
    researcher: `Research complete for "${subtask || task}":\n• Analyzed the requirements thoroughly\n• Found 3 viable approaches, recommending approach #2\n• Key insight: keep it simple, iterate fast\n• Passing findings to the implementation team`,
    coder: `Implementation done for "${subtask || task}":\n• Built the core functionality as planned\n• Used clean, modular structure\n• All main features working\n• Ready for review`,
    fixer: `Fix complete for "${subtask || task}":\n• Diagnosed the root cause\n• Applied the patch\n• Everything is working end-to-end\n• Ready for deployment`,
    reviewer: `Review complete:\n• Quality: Good\n• Code structure is clean and readable\n• One suggestion: add error handling for edge cases\n• Approved with minor notes`,
    monitor: `Health check: All systems nominal. No issues detected. Team is performing well.`,
  };

  const encoder = new TextEncoder();
  const text = mocks[agent] || mocks.mayor;
  const words = text.split(" ");

  const readable = new ReadableStream({
    async start(controller) {
      for (const word of words) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ text: word + " " })}\n\n`)
        );
        await new Promise((r) => setTimeout(r, 35));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

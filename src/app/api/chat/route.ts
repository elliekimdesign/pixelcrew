import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { message, history } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-api-key-here") {
    return mockStreamResponse(message);
  }

  try {
    const client = new Anthropic({ apiKey });

    const messages = [
      ...history.map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ];

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system:
        "You are a multi-agent AI assistant called Mission Control. You coordinate a crew of AI agents: Mayor (boss/coordinator), Planner (strategist), Researcher (scout), Coder (engineer), Fixer (mechanic), Reviewer (inspector), and Monitor (watchdog). When given a task, briefly explain how your agents will handle it. Be concise and friendly.",
      messages,
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
    console.error("Chat API error:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Failed to get response from AI" },
      { status: 500 }
    );
  }
}

function mockStreamResponse(message: string) {
  const encoder = new TextEncoder();
  const response = getMockResponse(message);
  const words = response.split(" ");

  const readable = new ReadableStream({
    async start(controller) {
      for (const word of words) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ text: word + " " })}\n\n`)
        );
        await new Promise((r) => setTimeout(r, 40));
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

function getMockResponse(message: string): string {
  const lower = message.toLowerCase();

  // Building / coding tasks
  if (lower.includes("build") || lower.includes("create") || lower.includes("make")) {
    return `Roger that! Mayor is assembling the crew.\n\n[CONVOY CREATED] "${message}"\n\n> Planner (Strategist) is breaking this into subtasks...\n> Researcher (Scout) is researching best approaches...\n> Coder (Engineer) is ready to start coding once the plan is set.\n> Reviewer (Inspector) will review the work.\n\nEstimated tasks: 4 beads. Planner is on it now — check the Convoys panel on the right for progress.`;
  }

  // Design tasks
  if (lower.includes("design") || lower.includes("ui") || lower.includes("layout") || lower.includes("figma")) {
    return `On it! Mayor assigned this to the design team.\n\n[CONVOY CREATED] "Design Task"\n\n> Planner (Strategist) is creating the plan.\n> Researcher (Scout) is gathering design references and patterns.\n> Reviewer (Inspector) is reviewing existing components.\n> Fixer (Mechanic) is standing by to implement.\n\nYou'll see updates in the Activity feed as they work.`;
  }

  // Fix / debug
  if (lower.includes("fix") || lower.includes("bug") || lower.includes("error") || lower.includes("broken")) {
    return `Bug spotted! Mayor is sending the crew in.\n\n> Researcher (Scout) is investigating the root cause.\n> Fixer (Mechanic) will patch it once Researcher finds it.\n> Monitor (Watchdog) is monitoring for related issues.\n\nResearcher usually cracks these fast. Watch the Agents panel on the left for status updates.`;
  }

  // Status / check
  if (lower.includes("status") || lower.includes("progress") || lower.includes("how") || lower.includes("update")) {
    return `Here's your crew status:\n\n> Mayor — Coordinating convoy #3\n> Planner — Breaking down next task (65%)\n> Researcher — Analyzing API structure (40%)\n> Coder — Implementing auth flow (78%)\n> Fixer — Idle, standing by\n> Reviewer — Idle, waiting for review tasks\n> Monitor — All systems healthy\n\n2 convoys active, 1 completed today. Looking good!`;
  }

  // Hello / greeting
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey") || lower.includes("yo")) {
    return `Hey! Welcome to Mission Control.\n\nYour crew of 7 agents is ready:\n> Mayor (The Boss) coordinates\n> Planner (The Strategist) plans\n> Researcher (The Scout) researches\n> Coder (The Engineer) codes\n> Fixer (The Mechanic) fixes\n> Reviewer (The Inspector) reviews\n> Monitor (The Watchdog) monitors\n\nJust tell me what you need — "build a landing page", "fix the login bug", "design a dashboard" — and I'll put the crew on it.`;
  }

  // Help
  if (lower.includes("help") || lower.includes("what can")) {
    return `Here's what you can do:\n\n> "build [something]" — Create something new. Mayor assembles the crew, Planner makes the plan.\n> "fix [something]" — Debug a problem. Researcher investigates, Fixer patches.\n> "design [something]" — Design work. Researcher + Reviewer collaborate.\n> "status" — Check what everyone is working on.\n\nThe left panel shows your agents. The right panel shows convoys (task groups) and activity. Just type naturally!`;
  }

  // Task / todo
  if (lower.includes("task") || lower.includes("todo") || lower.includes("assign")) {
    return `Task noted! Mayor is adding it to the queue.\n\n> Looking at current workload... Coder is almost done (78%), so they can take this next.\n> Reviewer is idle and ready for review work.\n\nI'll assign it to the best available agent. Check the Convoys panel for the new task.`;
  }

  // Default
  return `Got it! Let me route this to the right agent.\n\n> Mayor is reviewing your request...\n> Planner (Strategist) is thinking about the approach.\n> Researcher (Scout) is looking into it.\n\nTip: Try commands like "build a todo app", "check status", or "help" to see the crew in action. The agents on the left and convoys on the right will update as work happens.`;
}

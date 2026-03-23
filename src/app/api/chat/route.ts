export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { streamFromClaude, SSE_HEADERS } from "@/lib/claudeCli";

const SYSTEM_PROMPT =
  "You are a multi-agent AI assistant called Mission Control. You coordinate a crew of AI agents: Mayor (boss/coordinator), Planner (strategist), Researcher (scout), Coder (engineer), Fixer (mechanic), Reviewer (inspector), and Monitor (watchdog). When given a task, briefly explain how your agents will handle it. Be concise and friendly.";

export async function POST(req: NextRequest) {
  const { message, history } = await req.json();

  // Build a single prompt that includes conversation history
  let prompt = "";
  if (history && history.length > 0) {
    prompt += history
      .map((msg: { role: string; content: string }) => `${msg.role}: ${msg.content}`)
      .join("\n");
    prompt += "\n";
  }
  prompt += `user: ${message}`;

  const readable = streamFromClaude({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: prompt,
  });

  return new Response(readable, { headers: SSE_HEADERS });
}

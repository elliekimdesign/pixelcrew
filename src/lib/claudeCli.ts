import { spawn } from "child_process";

const CLAUDE_PATH = process.env.CLAUDE_PATH || `${process.env.HOME}/.local/bin/claude`;

/**
 * Spawns the claude CLI and returns a ReadableStream of SSE data
 * in the format the frontend expects: `data: {"text":"..."}\n\n`
 */
export function streamFromClaude(options: {
  systemPrompt: string;
  userMessage: string;
  model?: string;
}): ReadableStream<Uint8Array> {
  const { systemPrompt, userMessage, model = "claude-sonnet-4-20250514" } = options;
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      const args = [
        "-p",
        "--output-format", "stream-json",
        "--verbose",
        "--include-partial-messages",
        "--no-session-persistence",
        "--model", model,
        "--system-prompt", systemPrompt,
        userMessage,
      ];

      // Remove ANTHROPIC_API_KEY so Claude CLI uses the Max subscription OAuth token
      const env = { ...process.env };
      delete env.ANTHROPIC_API_KEY;

      const child = spawn(CLAUDE_PATH, args, {
        stdio: ["ignore", "pipe", "pipe"],
        env,
      });

      let buffer = "";
      let closed = false;

      function finish() {
        if (closed) return;
        closed = true;
        try {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch {
          // already closed
        }
      }

      function handleParsed(parsed: Record<string, unknown>) {
        const event = parsed.event as Record<string, unknown> | undefined;
        if (
          parsed.type === "stream_event" &&
          event?.type === "content_block_delta"
        ) {
          const delta = event.delta as Record<string, unknown> | undefined;
          if (delta?.type === "text_delta" && typeof delta.text === "string") {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`)
            );
          }
        }

        if (parsed.type === "result") {
          if (parsed.is_error) {
            console.error("[claude-cli] error:", parsed.result);
          }
          finish();
        }
      }

      child.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();

        // Try to consume complete JSON objects from the buffer.
        // Each JSON object from the CLI is newline-delimited.
        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          const candidate = buffer.slice(0, newlineIdx).trim();
          if (!candidate) {
            // Empty line, skip
            buffer = buffer.slice(newlineIdx + 1);
            continue;
          }

          try {
            const parsed = JSON.parse(candidate);
            // Success — consume this line from the buffer
            buffer = buffer.slice(newlineIdx + 1);
            handleParsed(parsed);
          } catch {
            // Parse failed. This could mean:
            // 1. The line is genuinely incomplete (split across chunks)
            // 2. The line contains embedded newlines
            // For case 2, try parsing up to the NEXT newline
            const nextNewline = buffer.indexOf("\n", newlineIdx + 1);
            if (nextNewline === -1) {
              // No more newlines — wait for more data
              break;
            }
            // Try the extended line
            const extended = buffer.slice(0, nextNewline).trim();
            try {
              const parsed = JSON.parse(extended);
              buffer = buffer.slice(nextNewline + 1);
              handleParsed(parsed);
            } catch {
              // Still can't parse — skip this line segment, it may be garbage
              buffer = buffer.slice(newlineIdx + 1);
            }
          }
        }
      });

      child.stderr.on("data", (chunk: Buffer) => {
        console.error("[claude-cli stderr]", chunk.toString());
      });

      child.on("error", (err) => {
        console.error("[claude-cli spawn error]", err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ text: "[Error: could not reach Claude]" })}\n\n`)
        );
        finish();
      });

      child.on("close", () => {
        // Process any remaining data
        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer.trim());
            handleParsed(parsed);
          } catch {
            // ignore
          }
        }
        finish();
      });
    },
  });
}

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
} as const;

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SANDBOX_ROOT = path.join(process.cwd(), "sandbox");

// GET /api/sandbox?taskId=task-1-123 — list files in a task's sandbox
export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "taskId required" }, { status: 400 });
  }

  const taskDir = path.join(SANDBOX_ROOT, taskId);
  if (!fs.existsSync(taskDir)) {
    return NextResponse.json({ files: [] });
  }

  const files = listFilesRecursive(taskDir, taskDir);
  return NextResponse.json({ files });
}

// POST /api/sandbox — create a sandbox for a task
export async function POST(req: NextRequest) {
  const { taskId } = await req.json();
  if (!taskId) {
    return NextResponse.json({ error: "taskId required" }, { status: 400 });
  }

  const taskDir = path.join(SANDBOX_ROOT, taskId);
  if (!fs.existsSync(taskDir)) {
    fs.mkdirSync(taskDir, { recursive: true });
  }

  return NextResponse.json({ path: taskDir });
}

function listFilesRecursive(dir: string, root: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(full, root));
    } else {
      results.push(path.relative(root, full));
    }
  }
  return results;
}

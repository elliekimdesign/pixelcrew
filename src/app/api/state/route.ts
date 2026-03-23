export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const STATE_FILE = path.join(process.cwd(), "data", "state.json");

export async function GET() {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return NextResponse.json(null);
    }
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    const state = JSON.parse(raw);
    return NextResponse.json(state);
  } catch {
    return NextResponse.json(null);
  }
}

export async function POST(req: NextRequest) {
  try {
    const state = await req.json();

    // Ensure data directory exists
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save state:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

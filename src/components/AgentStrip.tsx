"use client";

import { spaceGrotesk } from "@/lib/fonts";

export default function AgentStrip() {
  return (
    <div className="shrink-0">
      <span className={`${spaceGrotesk.className} font-semibold text-[17px] text-[var(--text)]`}>Pixel Crew</span>
    </div>
  );
}

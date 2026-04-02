"use client";

// Each character is a hand-drawn pixel grid rendered as SVG
// Grid is 12x12 pixels, scaled up

type CharacterName = "mayor" | "planner" | "researcher" | "coder" | "fixer" | "reviewer" | "monitor";

interface Props {
  character: CharacterName;
  size?: number;
  className?: string;
}

// Color palettes per character
const palettes: Record<CharacterName, { primary: string; secondary: string; accent: string; skin: string }> = {
  mayor:      { primary: "#5b6cf0", secondary: "#3b3a8a", accent: "#fbbf24", skin: "#ffcfa3" },
  planner:    { primary: "#8b5cf6", secondary: "#6d28d9", accent: "#c4b5fd", skin: "#ffcfa3" },
  researcher: { primary: "#f59e0b", secondary: "#a16207", accent: "#fef08a", skin: "#ffcfa3" },
  coder:      { primary: "#06b6d4", secondary: "#0e7490", accent: "#67e8f9", skin: "#b0c4d4" },
  fixer:      { primary: "#f97316", secondary: "#c2410c", accent: "#fed7aa", skin: "#ffcfa3" },
  reviewer:   { primary: "#a855f7", secondary: "#6b21a8", accent: "#e9d5ff", skin: "#e8d9b0" },
  monitor:    { primary: "#22c55e", secondary: "#15803d", accent: "#86efac", skin: "#deb887" },
};

// Pixel grids: 12x12, each cell is a color key
// . = transparent, 1 = primary, 2 = secondary, 3 = accent, 4 = skin, 5 = white, 6 = black
const sprites: Record<CharacterName, string[]> = {
  // Mayor: top hat boss with suit
  mayor: [
    "...33333...",
    "...33333...",
    "..3333333..",
    "...44444...",
    "...46646...",
    "...44444...",
    "..1111111..",
    "..1155111..",
    "..1111111..",
    "...11111...",
    "...2.2.2...",
    "...2...2...",
  ],
  // Planner: person with clipboard/checklist
  planner: [
    "...44444...",
    "..4444444..",
    "...44444...",
    "...46646...",
    "...44444...",
    "..1111111..",
    "..1111115..",
    "..1111155..",
    "...11155...",
    "...1.155...",
    "...2..55...",
    "...2...2...",
  ],
  // Researcher: person with magnifying glass
  researcher: [
    "...11111...",
    "..1111111..",
    "...11111...",
    "...44444...",
    "...46646...",
    "...44444...",
    "..2222222..",
    "..2222222..",
    "..2222233..",
    "...22222.3.",
    "...2.2..33.",
    "...2.2..3..",
  ],
  // Coder: robot with keyboard/screen
  coder: [
    ".....3.....",
    "....333....",
    "...11111...",
    "...15551...",
    "...16161...",
    "...11111...",
    "..1111111..",
    ".311555113.",
    "..1155511..",
    "...11111...",
    "...1.1.1...",
    "...1...1...",
  ],
  // Fixer: person with wrench/tool
  fixer: [
    "..3333333..",
    "..3333333..",
    "..1111111..",
    "...44444...",
    "...46646...",
    "...44444...",
    "..1111111..",
    "..111111133",
    "..1111111.3",
    "...11111.3.",
    "...2.2.33..",
    "...2...2...",
  ],
  // Reviewer: owl with glasses
  reviewer: [
    "..1.....1..",
    "..11...11..",
    "..1111111..",
    "..3316133..",
    "..3316133..",
    "..1144411..",
    "...11311...",
    "..1111111..",
    "..1111111..",
    "...11111...",
    "...1...1...",
    "..33...33..",
  ],
  // Monitor: dog with shield
  monitor: [
    "..44.....4.",
    "..44...44..",
    "..4444444..",
    "..4466644..",
    "..4444444..",
    "...44444...",
    "..1111111..",
    ".31111111..",
    ".31111111..",
    "..1111111..",
    "...4.4.4...",
    "...4...4...",
  ],
};

export default function PixelSprite({ character, size = 36, className = "" }: Props) {
  const grid = sprites[character];
  const palette = palettes[character];
  const cellSize = size / 12;

  const getColor = (key: string): string | null => {
    switch (key) {
      case "1": return palette.primary;
      case "2": return palette.secondary;
      case "3": return palette.accent;
      case "4": return palette.skin;
      case "5": return "#ffffff";
      case "6": return "#2d2a24";
      case ".": return null;
      default: return null;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      className={className}
      style={{ imageRendering: "pixelated" }}
      shapeRendering="crispEdges"
    >
      {grid.map((row, y) =>
        row.split("").map((cell, x) => {
          const color = getColor(cell);
          if (!color) return null;
          return (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={color}
            />
          );
        })
      )}
    </svg>
  );
}

// Character descriptions for tooltips
export const characterInfo: Record<CharacterName, { name: string; title: string; emoji: string }> = {
  mayor:      { name: "Mayor", title: "The Boss", emoji: "🎩" },
  planner:    { name: "Planner", title: "The Strategist", emoji: "📋" },
  researcher: { name: "Researcher", title: "The Scout", emoji: "🔍" },
  coder:      { name: "Coder", title: "The Engineer", emoji: "🤖" },
  fixer:      { name: "Fixer", title: "The Mechanic", emoji: "🔧" },
  reviewer:   { name: "Reviewer", title: "The Inspector", emoji: "🦉" },
  monitor:    { name: "Monitor", title: "The Watchdog", emoji: "🐕" },
};

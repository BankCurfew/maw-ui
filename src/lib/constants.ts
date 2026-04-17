export const SVG_WIDTH = 1280;
export const SVG_HEIGHT = 900;

// Session group → room mapping (department names match office.vuttipipat.com)
export const ROOM_COLORS: Record<string, { accent: string; floor: string; wall: string; label: string; description?: string }> = {
  "0":              { accent: "#26c6da", floor: "#1a2228", wall: "#0e1a20", label: "Main" },
  "01-bob":         { accent: "#fdd835", floor: "#282814", wall: "#20200e", label: "COMMAND", description: "CEO Office — Boss + Combat" },
  "01-pulse":       { accent: "#fdd835", floor: "#282814", wall: "#20200e", label: "COMMAND", description: "CEO Office — Boss + Combat" },
  "02-hermes":      { accent: "#64b5f6", floor: "#141a28", wall: "#0e1420", label: "ENGINEERING", description: "Build, Design, Test" },
  "02-dev":         { accent: "#64b5f6", floor: "#141a28", wall: "#0e1420", label: "ENGINEERING", description: "Build, Design, Test" },
  "03-neo":         { accent: "#ef5350", floor: "#281418", wall: "#200e12", label: "SECURITY", description: "CISO & Data Guardian" },
  "03-qa":          { accent: "#64b5f6", floor: "#141a28", wall: "#0e1420", label: "ENGINEERING", description: "Build, Design, Test" },
  "04-homekeeper":  { accent: "#ec407a", floor: "#281420", wall: "#200e18", label: "AIA OFFICE", description: "AIA Thailand — Insurance & Bot Operations" },
  "04-admin":       { accent: "#ec407a", floor: "#281420", wall: "#200e18", label: "AIA OFFICE", description: "AIA Thailand — Insurance & Bot Operations" },
  "05-volt":        { accent: "#4caf50", floor: "#142818", wall: "#0e2010", label: "DATA LAB", description: "Pipelines & Knowledge" },
  "05-data":        { accent: "#4caf50", floor: "#142818", wall: "#0e2010", label: "DATA LAB", description: "Pipelines & Knowledge" },
  "06-floodboy":    { accent: "#ffa726", floor: "#281e14", wall: "#201810", label: "STUDIO", description: "Research, Write, Edit, People" },
  "06-researcher":  { accent: "#ffa726", floor: "#281e14", wall: "#201810", label: "STUDIO", description: "Research, Write, Edit, People" },
  "07-fireman":     { accent: "#ffa726", floor: "#281e14", wall: "#201810", label: "STUDIO", description: "Research, Write, Edit, People" },
  "07-hr":          { accent: "#ffa726", floor: "#281e14", wall: "#201810", label: "STUDIO", description: "Research, Write, Edit, People" },
  "08-dustboy":     { accent: "#ffa726", floor: "#281e14", wall: "#201810", label: "STUDIO", description: "Research, Write, Edit, People" },
  "08-writer":      { accent: "#ffa726", floor: "#281e14", wall: "#201810", label: "STUDIO", description: "Research, Write, Edit, People" },
  "09-dustboychain": { accent: "#8d6e63", floor: "#1e1814", wall: "#16120e", label: "ORACLE ACADEMY", description: "Community & Education" },
  "09-creator":     { accent: "#8d6e63", floor: "#1e1814", wall: "#16120e", label: "ORACLE ACADEMY", description: "Community & Education" },
  "10-arthur":      { accent: "#64b5f6", floor: "#141a28", wall: "#0e1420", label: "ENGINEERING", description: "Build, Design, Test" },
  "10-designer":    { accent: "#64b5f6", floor: "#141a28", wall: "#0e1420", label: "ENGINEERING", description: "Build, Design, Test" },
  "11-calliope":    { accent: "#69f0ae", floor: "#142818", wall: "#0e2010", label: "Calliope" },
  "12-odin":        { accent: "#ab47bc", floor: "#1e1428", wall: "#160e1e", label: "Odin" },
  "13-mother":      { accent: "#ec407a", floor: "#281420", wall: "#200e18", label: "AIA OFFICE", description: "AIA Thailand — Insurance & Bot Operations" },
  "13-aia":         { accent: "#ec407a", floor: "#281420", wall: "#200e18", label: "AIA OFFICE", description: "AIA Thailand — Insurance & Bot Operations" },
  "14-nexus":       { accent: "#26c6da", floor: "#1a2228", wall: "#0e1a20", label: "FEDERATION", description: "Cross-Node Agents" },
  "14-echo":        { accent: "#26c6da", floor: "#1a2228", wall: "#0e1a20", label: "FEDERATION", description: "Cross-Node Agents" },
  "15-xiaoer":      { accent: "#8d6e63", floor: "#1e1814", wall: "#16120e", label: "XiaoEr" },
  "15-pa":          { accent: "#26c6da", floor: "#1a2228", wall: "#0e1a20", label: "EXECUTIVE SUITE", description: "Personal Assistant — Calendar, Finance, Email" },
  "16-pigment":     { accent: "#e040fb", floor: "#1e1428", wall: "#160e1e", label: "Pigment" },
  "16-cost":        { accent: "#26c6da", floor: "#1a2228", wall: "#0e1a20", label: "EXECUTIVE SUITE", description: "Personal Assistant — Calendar, Finance, Email" },
  "17-fa":          { accent: "#26c6da", floor: "#1a2228", wall: "#0e1a20", label: "EXECUTIVE SUITE", description: "Personal Assistant — Calendar, Finance, Email" },
  "99-overview":    { accent: "#78909c", floor: "#1a1a1e", wall: "#121216", label: "Overview" },
};

const FALLBACK_ACCENTS = [
  "#ab47bc", "#ec407a", "#42a5f5", "#26a69a", "#ffa726", "#7e57c2",
  "#ef5350", "#4caf50", "#fdd835", "#26c6da", "#ff7043", "#69f0ae",
];

export function roomStyle(sessionName: string): { accent: string; floor: string; wall: string; label: string; description?: string } {
  if (ROOM_COLORS[sessionName]) return ROOM_COLORS[sessionName];
  // Generate deterministic style with session name as label
  let h = 0;
  for (let i = 0; i < sessionName.length; i++) h = ((h << 5) - h + sessionName.charCodeAt(i)) | 0;
  const accent = FALLBACK_ACCENTS[Math.abs(h) % FALLBACK_ACCENTS.length];
  const label = sessionName.replace(/^\d+-/, ""); // strip number prefix
  return { accent, floor: "#1a1a20", wall: "#121218", label: label.charAt(0).toUpperCase() + label.slice(1) };
}

// Preferred agent display order (lower = first, unlisted = 999)
export const AGENT_ORDER: Record<string, number> = {
  "neo-oracle": 0,
  "nexus-oracle": 1,
  "hermes-oracle": 2,
  "pulse-oracle": 3,
};

export function agentSortKey(name: string): number {
  return AGENT_ORDER[name] ?? 999;
}

// Oracle-specific icons (unique emoji per oracle)
export const ORACLE_ICONS: Record<string, string> = {
  neo: "🟢",
  pulse: "💓",
  hermes: "📡",
  mother: "🔮",
  odin: "👁️",
  pigment: "🎨",
  calliope: "📖",
  volt: "⚡",
  homekeeper: "🏠",
  floodboy: "🌊",
  fireman: "🔥",
  dustboychain: "💨",
  dustboy: "💨",
  arthur: "🗡️",
  phukhao: "⛰️",
  athena: "🦉",
  thor: "⚡",
  mycelium: "🍄",
  apollo: "☀️",
  nexus: "🔍",
  xiaoer: "🍵",
};

export function agentIcon(name: string): string | undefined {
  const key = name.replace(/-oracle$/, "").replace(/-/g, "").toLowerCase();
  return ORACLE_ICONS[key];
}

// Agent capsule colors (deterministic by name hash)
export const AGENT_COLORS = [
  "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffa07a",
  "#dda0dd", "#98d8c8", "#f7dc6f", "#bb8fce", "#85c1e9",
  "#f0b27a", "#82e0aa",
];

export function agentColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return AGENT_COLORS[Math.abs(h) % AGENT_COLORS.length];
}

// Desk grid within each room
export const DESK = {
  cols: 4,
  cellW: 200,
  cellH: 160,
  offsetX: 30,
  offsetY: 60,
} as const;

// Room layout grid
export const ROOM_GRID = {
  cols: 3,
  roomW: 400,
  roomH: 400,
  gapX: 20,
  gapY: 20,
  startX: 20,
  startY: 70,
} as const;

export const AVATAR = {
  radius: 20,
  strokeWidth: 3,
  nameLabelMaxChars: 12,
} as const;

// Preview card dimensions
export const PREVIEW_CARD = {
  width: 700,
  maxHeight: 860,
} as const;

/** Client-side fallback — server resolves the real command from maw.config.json via buildCommand().
 *  When empty string is sent, the server handler uses buildCommand() automatically. */
export function guessCommand(_agentName: string): string {
  return ""; // empty = let server resolve from maw.config.json
}

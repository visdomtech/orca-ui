/**
 * Orca Chip Palette — the canonical color system shared across every orca-ui
 * component and every sub-app's ConfigProvider.
 *
 * Three values per tone: `tint` (soft background), `fg` (mid-tone text), and
 * `dot` (indicator / solid fill). Solid-variant text is white for every tone
 * except warning, which uses a dark brown for contrast.
 */

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

export interface TonePalette {
  tint: string;
  fg: string;
  dot: string;
  solidFg: string;
}

export const LIGHT_TONES: Record<Tone, TonePalette> = {
  neutral: { tint: "#F1EFEA", fg: "#5F5A52", dot: "#A39E94", solidFg: "#FFFFFF" },
  success: { tint: "#EAF5EF", fg: "#2F6B4F", dot: "#3E9A6E", solidFg: "#FFFFFF" },
  warning: { tint: "#FBF3E0", fg: "#8A6114", dot: "#E0A93B", solidFg: "#2A2008" },
  danger:  { tint: "#FBECEA", fg: "#A33A30", dot: "#D65C4F", solidFg: "#FFFFFF" },
  info:    { tint: "#EDF0FD", fg: "#3348B8", dot: "#3554E3", solidFg: "#FFFFFF" },
  accent:  { tint: "#F2EDFB", fg: "#6544B0", dot: "#8B6AD6", solidFg: "#FFFFFF" },
};

export const DARK_TONES: Record<Tone, TonePalette> = {
  neutral: { tint: "#2A2926", fg: "#C9C5BC", dot: "#8A857B", solidFg: "#141412" },
  success: { tint: "#1B2A22", fg: "#8FD3B0", dot: "#56B98A", solidFg: "#141412" },
  warning: { tint: "#2D2618", fg: "#E8C277", dot: "#D9A441", solidFg: "#141412" },
  danger:  { tint: "#30201D", fg: "#F0A79E", dot: "#E0705F", solidFg: "#141412" },
  info:    { tint: "#1E2340", fg: "#AEB9F6", dot: "#8696F2", solidFg: "#141412" },
  accent:  { tint: "#26203A", fg: "#C6B4F1", dot: "#A58BE6", solidFg: "#141412" },
};

/** Surface and ink tokens, light theme. */
export const LIGHT_SURFACE = {
  canvas: "#F6F5F2",
  surface: "#FFFFFF",
  ink: "#1B1A17",
  ink2: "#6B675F",
  line: "#E9E6E0",
  brand: "#3554E3",
} as const;

/** Surface and ink tokens, dark theme. */
export const DARK_SURFACE = {
  canvas: "#141412",
  surface: "#1C1B19",
  ink: "#EDEBE6",
  ink2: "#A39F96",
  line: "#2E2C28",
  brand: "#8696F2",
} as const;

/** Font stacks per spec. */
export const FONT_STACK = `"Figtree", system-ui, -apple-system, "Segoe UI", sans-serif`;
export const MONO_FONT_STACK = `"JetBrains Mono", ui-monospace, Menlo, monospace`;

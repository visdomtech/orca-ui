import type { GlobalToken } from "antd";

import { LIGHT_TONES } from "./palette";

export type ChartTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

/**
 * Chart tone colors source from the Orca Chip Palette so charts match status
 * chips. We prefer the `dot` color (saturated signal) for strokes/segments,
 * falling back to token-derived values when callers pass antd's theme token.
 */
export function toneColor(_token: GlobalToken, tone: ChartTone): string {
  return LIGHT_TONES[tone].dot;
}

export const SERIES_PALETTE: ChartTone[] = ["info", "accent", "success", "warning", "danger", "neutral"];

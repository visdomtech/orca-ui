import type { GlobalToken } from "antd";

export type ChartTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

export function toneColor(token: GlobalToken, tone: ChartTone): string {
  switch (tone) {
    case "success":
      return token.colorSuccess;
    case "warning":
      return token.colorWarning;
    case "danger":
      return token.colorError;
    case "info":
      return token.colorInfo;
    case "accent":
      return token.colorPrimary;
    case "neutral":
    default:
      return token.colorTextSecondary;
  }
}

export const SERIES_PALETTE: ChartTone[] = ["accent", "info", "success", "warning", "danger", "neutral"];

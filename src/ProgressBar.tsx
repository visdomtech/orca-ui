import type { ReactNode } from "react";

import { MeterBar } from "./MeterBar";
import type { ChartTone } from "./_chartTones";

export interface ProgressBarProps {
  /** 0..100. */
  value: number;
  label?: ReactNode;
  showPercent?: boolean;
  tone?: ChartTone;
  height?: number;
}

export function ProgressBar({ value, label, showPercent = true, tone = "accent", height = 8 }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <MeterBar
      value={clamped}
      min={0}
      max={100}
      height={height}
      tone={tone}
      label={label}
      valueFormat={showPercent ? (v) => `${Math.round(v)}%` : undefined}
    />
  );
}

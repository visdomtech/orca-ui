import { theme } from "antd";
import type { ReactNode } from "react";

import { toneColor, type ChartTone } from "./_chartTones";

export interface MeterThreshold {
  at: number;
  tone: ChartTone;
  label?: string;
}

export interface MeterBarProps {
  value: number;
  min?: number;
  max: number;
  target?: number;
  thresholds?: MeterThreshold[];
  label?: ReactNode;
  valueFormat?: (v: number) => string;
  height?: number;
  tone?: ChartTone;
  showScale?: boolean;
}

function activeTone(value: number, thresholds?: MeterThreshold[]): ChartTone {
  if (!thresholds || thresholds.length === 0) return "accent";
  const sorted = [...thresholds].sort((a, b) => a.at - b.at);
  let pick = sorted[0];
  for (const t of sorted) if (value >= t.at) pick = t;
  return pick.tone;
}

export function MeterBar({
  value,
  min = 0,
  max,
  target,
  thresholds,
  label,
  valueFormat = (v) => String(v),
  height = 10,
  tone,
  showScale = false,
}: MeterBarProps) {
  const { token } = theme.useToken();
  const span = max - min || 1;
  const pct = Math.max(0, Math.min(1, (value - min) / span));
  const resolvedTone = tone ?? activeTone(value, thresholds);
  const color = toneColor(token, resolvedTone);
  const targetLeft = target !== undefined ? ((target - min) / span) * 100 : null;

  return (
    <div style={{ width: "100%" }}>
      {(label || value !== undefined) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          {label && (
            <span style={{ fontSize: 12, color: token.colorTextSecondary, fontWeight: 600 }}>{label}</span>
          )}
          <span style={{ fontSize: 12, fontWeight: 700, color: token.colorText }}>
            {valueFormat(value)}
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        style={{
          position: "relative",
          width: "100%",
          height,
          borderRadius: 999,
          background: token.colorFillTertiary,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct * 100}%`,
            background: color,
            transition: "width 0.25s ease",
          }}
        />
        {targetLeft !== null && (
          <div
            style={{
              position: "absolute",
              top: -2,
              bottom: -2,
              left: `${targetLeft}%`,
              width: 2,
              background: token.colorWarning,
              transform: "translateX(-50%)",
            }}
            title={`Target ${valueFormat(target!)}`}
          />
        )}
      </div>
      {showScale && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 12, color: token.colorTextSecondary }}>{valueFormat(min)}</span>
          <span style={{ fontSize: 12, color: token.colorTextSecondary }}>{valueFormat(max)}</span>
        </div>
      )}
    </div>
  );
}

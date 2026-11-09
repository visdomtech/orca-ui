import { theme } from "antd";
import type { ReactNode } from "react";

import { SERIES_PALETTE, toneColor, type ChartTone } from "./_chartTones";

export interface DistributionBarSegment {
  id: string;
  label: ReactNode;
  value: number;
  tone?: ChartTone;
}

export interface DistributionBarProps {
  segments: DistributionBarSegment[];
  total?: number;
  showLegend?: boolean;
  height?: number;
  formatValue?: (v: number) => string;
  "aria-label"?: string;
}

export function DistributionBar({
  segments,
  total,
  showLegend = true,
  height = 14,
  formatValue = (v) => String(v),
  ...aria
}: DistributionBarProps) {
  const { token } = theme.useToken();
  const sum = segments.reduce((acc, s) => acc + s.value, 0);
  const denom = total ?? sum;

  const resolved = segments.map((s, i) => ({
    ...s,
    tone: s.tone ?? SERIES_PALETTE[i % SERIES_PALETTE.length],
    pct: denom > 0 ? (s.value / denom) * 100 : 0,
  }));

  return (
    <div aria-label={aria["aria-label"] ?? "Distribution"}>
      <div
        style={{
          display: "flex",
          width: "100%",
          height,
          borderRadius: 999,
          overflow: "hidden",
          background: token.colorFillTertiary,
        }}
      >
        {resolved.map((s) => (
          <div
            key={s.id}
            title={`${typeof s.label === "string" ? s.label : s.id}: ${formatValue(s.value)}`}
            style={{
              width: `${s.pct}%`,
              background: toneColor(token, s.tone),
              transition: "width 0.25s ease",
            }}
          />
        ))}
      </div>
      {showLegend && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
          {resolved.map((s) => (
            <div key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: toneColor(token, s.tone),
                }}
              />
              <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
                {s.label} <strong style={{ color: token.colorText }}>{formatValue(s.value)}</strong>
                {denom > 0 && ` · ${s.pct.toFixed(0)}%`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

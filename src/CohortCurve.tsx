import { theme } from "antd";

import { SERIES_PALETTE, toneColor, type ChartTone } from "./_chartTones";

export interface CohortCurveCohort {
  id: string;
  label: string;
  retention: number[];
  tone?: ChartTone;
}

export interface CohortCurveProps {
  cohorts: CohortCurveCohort[];
  periods: number;
  height?: number;
  width?: number;
  periodLabel?: (i: number) => string;
  showLegend?: boolean;
  "aria-label"?: string;
}

const PAD_LEFT = 42;
const PAD_RIGHT = 14;
const PAD_TOP = 14;
const PAD_BOTTOM = 28;

export function CohortCurve({
  cohorts,
  periods,
  height = 220,
  width = 640,
  periodLabel = (i) => `P${i}`,
  showLegend = true,
  ...aria
}: CohortCurveProps) {
  const { token } = theme.useToken();
  const stroke = token.colorBorderSecondary;
  const textColor = token.colorTextSecondary;

  const innerW = width - PAD_LEFT - PAD_RIGHT;
  const innerH = height - PAD_TOP - PAD_BOTTOM;

  const xAt = (i: number) =>
    periods <= 1 ? PAD_LEFT + innerW / 2 : PAD_LEFT + (i / (periods - 1)) * innerW;
  const yAt = (v: number) => PAD_TOP + innerH - Math.max(0, Math.min(1, v)) * innerH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div style={{ width: "100%" }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={aria["aria-label"] ?? "Cohort retention curves"}
        style={{ maxWidth: "100%", height: "auto" }}
      >
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={yAt(t)} y2={yAt(t)} stroke={stroke} strokeDasharray="2 3" />
            <text x={PAD_LEFT - 8} y={yAt(t) + 3} fontSize={10} fill={textColor} textAnchor="end">
              {Math.round(t * 100)}%
            </text>
          </g>
        ))}

        {Array.from({ length: periods }, (_, i) => (
          <text key={i} x={xAt(i)} y={height - 8} fontSize={10} fill={textColor} textAnchor="middle">
            {periodLabel(i)}
          </text>
        ))}

        {cohorts.map((c, cIdx) => {
          const tone = c.tone ?? SERIES_PALETTE[cIdx % SERIES_PALETTE.length];
          const color = toneColor(token, tone);
          const pts = c.retention
            .slice(0, periods)
            .map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(2)},${yAt(v).toFixed(2)}`)
            .join(" ");
          return (
            <g key={c.id}>
              <path d={pts} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
              {c.retention.slice(0, periods).map((v, i) => (
                <circle key={i} cx={xAt(i)} cy={yAt(v)} r={2.5} fill={color} />
              ))}
            </g>
          );
        })}
      </svg>

      {showLegend && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8, paddingLeft: PAD_LEFT }}>
          {cohorts.map((c, cIdx) => {
            const tone = c.tone ?? SERIES_PALETTE[cIdx % SERIES_PALETTE.length];
            const color = toneColor(token, tone);
            return (
              <div key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                <span style={{ fontSize: 12, color: textColor }}>{c.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

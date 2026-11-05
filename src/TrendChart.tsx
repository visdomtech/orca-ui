import { theme } from "antd";
import { useMemo } from "react";

import { SERIES_PALETTE, toneColor, type ChartTone } from "./_chartTones";

export interface TrendChartSeries {
  id: string;
  label: string;
  points: Array<{ x: number | string; y: number }>;
  tone?: ChartTone;
}

export interface TrendChartAnnotation {
  x: number | string;
  label: string;
}

export interface TrendChartProps {
  series: TrendChartSeries[];
  height?: number;
  width?: number;
  yFormat?: (y: number) => string;
  xFormat?: (x: number | string) => string;
  annotations?: TrendChartAnnotation[];
  forecastFrom?: number | string;
  showLegend?: boolean;
  target?: number;
  "aria-label"?: string;
}

const DEFAULT_HEIGHT = 220;
const DEFAULT_WIDTH = 640;
const PAD_LEFT = 42;
const PAD_RIGHT = 14;
const PAD_TOP = 14;
const PAD_BOTTOM = 28;

function toKey(x: number | string): string {
  return typeof x === "number" ? String(x) : x;
}

export function TrendChart({
  series,
  height = DEFAULT_HEIGHT,
  width = DEFAULT_WIDTH,
  yFormat = (y) => String(y),
  xFormat = (x) => String(x),
  annotations = [],
  forecastFrom,
  showLegend = true,
  target,
  ...aria
}: TrendChartProps) {
  const { token } = theme.useToken();
  const stroke = token.colorBorderSecondary;
  const textColor = token.colorTextSecondary;

  const { xs, ys, yMin, yMax, columnFor } = useMemo(() => {
    const allX: Array<number | string> = [];
    const seen = new Set<string>();
    for (const s of series) {
      for (const p of s.points) {
        const k = toKey(p.x);
        if (!seen.has(k)) {
          seen.add(k);
          allX.push(p.x);
        }
      }
    }
    const allY: number[] = series.flatMap((s) => s.points.map((p) => p.y));
    const yMin = Math.min(0, ...allY);
    const yMax = Math.max(...allY, target ?? -Infinity);
    const columnFor = (x: number | string) => allX.findIndex((v) => toKey(v) === toKey(x));
    return { xs: allX, ys: allY, yMin, yMax, columnFor };
  }, [series, target]);

  const innerW = width - PAD_LEFT - PAD_RIGHT;
  const innerH = height - PAD_TOP - PAD_BOTTOM;
  const span = yMax - yMin || 1;

  const xAt = (i: number) =>
    xs.length <= 1 ? PAD_LEFT + innerW / 2 : PAD_LEFT + (i / (xs.length - 1)) * innerW;
  const yAt = (v: number) => PAD_TOP + innerH - ((v - yMin) / span) * innerH;

  const forecastIdx = forecastFrom !== undefined ? columnFor(forecastFrom) : -1;

  const yTicks = useMemo(() => {
    const steps = 4;
    const out: number[] = [];
    for (let i = 0; i <= steps; i++) out.push(yMin + (span * i) / steps);
    return out;
  }, [yMin, span]);

  return (
    <div style={{ width: "100%" }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={aria["aria-label"] ?? "Trend chart"}
        style={{ maxWidth: "100%", height: "auto" }}
      >
        {yTicks.map((t, i) => {
          const y = yAt(t);
          return (
            <g key={i}>
              <line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={y} y2={y} stroke={stroke} strokeDasharray="2 3" />
              <text x={PAD_LEFT - 8} y={y + 3} fontSize={10} fill={textColor} textAnchor="end">
                {yFormat(t)}
              </text>
            </g>
          );
        })}

        {target !== undefined && (
          <line
            x1={PAD_LEFT}
            x2={width - PAD_RIGHT}
            y1={yAt(target)}
            y2={yAt(target)}
            stroke={token.colorWarning}
            strokeDasharray="4 3"
            strokeWidth={1.5}
          />
        )}

        {xs.map((x, i) => {
          if (xs.length > 10 && i % Math.ceil(xs.length / 8) !== 0) return null;
          return (
            <text
              key={i}
              x={xAt(i)}
              y={height - 8}
              fontSize={10}
              fill={textColor}
              textAnchor="middle"
            >
              {xFormat(x)}
            </text>
          );
        })}

        {annotations.map((a, i) => {
          const idx = columnFor(a.x);
          if (idx < 0) return null;
          const x = xAt(idx);
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={PAD_TOP} y2={height - PAD_BOTTOM} stroke={token.colorWarning} strokeDasharray="3 3" />
              <text x={x + 4} y={PAD_TOP + 10} fontSize={10} fill={token.colorWarningText}>
                {a.label}
              </text>
            </g>
          );
        })}

        {series.map((s, sIdx) => {
          const tone = s.tone ?? SERIES_PALETTE[sIdx % SERIES_PALETTE.length];
          const color = toneColor(token, tone);
          const pts = s.points.map((p) => ({ i: columnFor(p.x), y: yAt(p.y) }));

          const solidPts = forecastIdx < 0 ? pts : pts.filter((p) => p.i <= forecastIdx);
          const dashedPts = forecastIdx < 0 ? [] : pts.filter((p) => p.i >= forecastIdx);

          const toPath = (ps: typeof pts) =>
            ps.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(p.i).toFixed(2)},${p.y.toFixed(2)}`).join(" ");

          return (
            <g key={s.id}>
              {solidPts.length > 0 && (
                <path d={toPath(solidPts)} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
              )}
              {dashedPts.length > 0 && (
                <path d={toPath(dashedPts)} fill="none" stroke={color} strokeWidth={1.75} strokeDasharray="4 3" strokeLinejoin="round" />
              )}
              {pts.map((p, i) => (
                <circle key={i} cx={xAt(p.i)} cy={p.y} r={2.5} fill={color} />
              ))}
            </g>
          );
        })}
      </svg>

      {showLegend && series.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8, paddingLeft: PAD_LEFT }}>
          {series.map((s, sIdx) => {
            const tone = s.tone ?? SERIES_PALETTE[sIdx % SERIES_PALETTE.length];
            const color = toneColor(token, tone);
            return (
              <div key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: color }} />
                <span style={{ fontSize: 12, color: textColor }}>{s.label}</span>
              </div>
            );
          })}
        </div>
      )}
      {ys.length === 0 && (
        <div style={{ fontSize: 12, color: textColor, marginTop: 8 }}>No data.</div>
      )}
    </div>
  );
}

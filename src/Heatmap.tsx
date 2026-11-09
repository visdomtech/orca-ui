import { theme, type GlobalToken } from "antd";
import { useMemo } from "react";

export interface HeatmapScale {
  min?: number;
  max?: number;
  thresholds?: Array<{ at: number; color: (token: GlobalToken) => string }>;
}

export interface HeatmapProps {
  rows: string[];
  cols: string[];
  values: Array<Array<number | null>>;
  format?: (v: number) => string;
  scale?: HeatmapScale;
  onCellClick?: (row: string, col: string, value: number | null) => void;
  cellSize?: number;
  showRowLabels?: boolean;
  showColLabels?: boolean;
}

function tintPrimary(base: string, t: number): string {
  // t in [0,1]. For arbitrary colors just blend with white at (1-t) and base at t.
  // Simple approach: use rgba with alpha from 0.1..0.85.
  const alpha = 0.1 + t * 0.75;
  // Accept base as hex #RRGGBB or rgb()
  if (base.startsWith("#")) {
    const hex = base.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return base;
}

export function Heatmap({
  rows,
  cols,
  values,
  format = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1)),
  scale,
  onCellClick,
  cellSize = 44,
  showRowLabels = true,
  showColLabels = true,
}: HeatmapProps) {
  const { token } = theme.useToken();

  const flat = values.flat().filter((v): v is number => v !== null && Number.isFinite(v));
  const resolvedMin = scale?.min ?? (flat.length ? Math.min(...flat) : 0);
  const resolvedMax = scale?.max ?? (flat.length ? Math.max(...flat) : 1);
  const span = resolvedMax - resolvedMin || 1;

  const colorFor = useMemo(() => {
    const sorted = scale?.thresholds
      ? [...scale.thresholds].sort((a, b) => a.at - b.at)
      : null;
    const defaultBase = token.colorPrimary;
    return (v: number) => {
      if (sorted && sorted.length > 0) {
        let pick = sorted[0];
        for (const s of sorted) if (v >= s.at) pick = s;
        return pick.color(token);
      }
      return tintPrimary(defaultBase, (v - resolvedMin) / span);
    };
  }, [token, resolvedMin, span, scale]);

  return (
    <div style={{ display: "inline-flex", flexDirection: "column" }}>
      {showColLabels && (
        <div style={{ display: "flex", paddingLeft: showRowLabels ? 96 : 0 }}>
          {cols.map((c) => (
            <div
              key={c}
              style={{ width: cellSize, textAlign: "center", padding: "4px 0", color: token.colorTextSecondary, fontSize: 12 }}
            >
              {c}
            </div>
          ))}
        </div>
      )}
      {rows.map((r, rowIdx) => (
        <div key={r} style={{ display: "flex", alignItems: "center" }}>
          {showRowLabels && (
            <div
              style={{
                width: 96,
                paddingRight: 8,
                textAlign: "right",
                color: token.colorTextSecondary,
                fontSize: 12,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={r}
            >
              {r}
            </div>
          )}
          {cols.map((c, colIdx) => {
            const v = values[rowIdx]?.[colIdx] ?? null;
            const bg = v === null ? token.colorFillTertiary : colorFor(v);
            const clickable = Boolean(onCellClick);
            return (
              <button
                key={c}
                type="button"
                onClick={clickable ? () => onCellClick!(r, c, v) : undefined}
                disabled={!clickable}
                style={{
                  width: cellSize,
                  height: cellSize,
                  margin: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                  backgroundColor: bg,
                  border: 0,
                  cursor: clickable ? "pointer" : "default",
                  color: token.colorText,
                  fontSize: 12,
                  fontWeight: 600,
                  font: clickable ? "inherit" : undefined,
                }}
                aria-label={`${r} × ${c}: ${v === null ? "no data" : format(v)}`}
              >
                {v === null ? "–" : format(v)}
              </button>
            );
          })}
        </div>
      ))}
      {flat.length === 0 && (
        <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 8 }}>No data.</div>
      )}
    </div>
  );
}

import { theme } from "antd";

import { toneColor, type ChartTone } from "./_chartTones";

export interface SparklineProps {
  points: number[];
  width?: number;
  height?: number;
  tone?: ChartTone;
  showArea?: boolean;
  strokeWidth?: number;
}

export function Sparkline({
  points,
  width = 80,
  height = 24,
  tone = "accent",
  showArea = true,
  strokeWidth = 1.5,
}: SparklineProps) {
  const { token } = theme.useToken();
  const color = toneColor(token, tone);

  if (points.length === 0) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const padY = strokeWidth;
  const innerH = height - padY * 2;

  const path = points
    .map((v, i) => {
      const x = (i / Math.max(1, points.length - 1)) * width;
      const y = padY + innerH - ((v - min) / span) * innerH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const areaPath = showArea
    ? `${path} L${width.toFixed(2)},${height.toFixed(2)} L0,${height.toFixed(2)} Z`
    : "";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Sparkline, ${points.length} values ranging ${min}–${max}`}
    >
      {showArea && <path d={areaPath} fill={color} opacity={0.14} />}
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

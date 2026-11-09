import { Timeline as AntTimeline, theme } from "antd";
import type { ReactNode } from "react";

import type { ChartTone } from "./_chartTones";

export type TimelineTone = ChartTone;

export interface TimelineItem {
  id: string;
  date: Date | string;
  title: ReactNode;
  detail?: ReactNode;
  tone?: TimelineTone;
  icon?: ReactNode;
}

export interface TimelineProps {
  items: TimelineItem[];
  /** Vertical only for now; horizontal reserved for future. */
  orientation?: "vertical";
  /** Group entries with a month header. Default 'none'. */
  groupBy?: "month" | "none";
  /** Reverse chronological order. */
  reverse?: boolean;
}

const TONE_TO_ANT: Record<TimelineTone, string> = {
  neutral: "gray",
  accent: "blue",
  info: "blue",
  success: "green",
  warning: "orange",
  danger: "red",
};

function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function Timeline({ items, groupBy = "none", reverse = false }: TimelineProps) {
  const { token } = theme.useToken();
  const normalized = items.map((i) => ({ ...i, _date: toDate(i.date) }));
  normalized.sort((a, b) =>
    reverse ? b._date.getTime() - a._date.getTime() : a._date.getTime() - b._date.getTime(),
  );

  const antItems: Array<{ color?: string; dot?: ReactNode; label?: ReactNode; children: ReactNode }> = [];

  let lastMonth: string | null = null;
  for (const it of normalized) {
    if (groupBy === "month") {
      const mk = monthKey(it._date);
      if (mk !== lastMonth) {
        lastMonth = mk;
        antItems.push({
          dot: (
            <span
              style={{
                fontSize: 11,
                fontWeight: 650,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: token.colorTextSecondary,
              }}
            >
              {monthLabel(it._date)}
            </span>
          ),
          children: null,
        });
      }
    }
    antItems.push({
      color: it.tone ? TONE_TO_ANT[it.tone] : undefined,
      dot: it.icon,
      label: (
        <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
          {formatDate(it._date)}
        </span>
      ),
      children: (
        <div>
          <div style={{ fontWeight: 600, color: token.colorText }}>{it.title}</div>
          {it.detail && (
            <div style={{ fontSize: 13, color: token.colorTextSecondary, marginTop: 2 }}>
              {it.detail}
            </div>
          )}
        </div>
      ),
    });
  }

  return <AntTimeline mode="left" items={antItems} />;
}

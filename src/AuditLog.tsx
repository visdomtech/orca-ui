import { theme } from "antd";
import type { CSSProperties, ReactNode } from "react";

import { Avatar } from "./Avatar";
import type { Tone } from "./palette";
import type { UserRef } from "./PeoplePicker";

export interface AuditEntry {
  id: string;
  at: Date | string;
  actor: UserRef;
  action: ReactNode;
  target?: ReactNode;
  detail?: ReactNode;
  tone?: Tone;
}

export interface AuditLogProps {
  entries: AuditEntry[];
  renderActor?: (actor: UserRef) => ReactNode;
  renderTarget?: (target: ReactNode) => ReactNode;
  groupBy?: "day" | "none";
  emptyState?: ReactNode;
  maxHeight?: number | string;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDay(d: Date): string {
  const today = new Date();
  const dk = dayKey(d);
  if (dk === dayKey(today)) return "Today";
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  if (dk === dayKey(y)) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function AuditLog({
  entries,
  renderActor,
  renderTarget,
  groupBy = "day",
  emptyState,
  maxHeight,
}: AuditLogProps) {
  const { token } = theme.useToken();

  if (entries.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: token.colorTextSecondary, fontSize: 12 }}>
        {emptyState ?? "No activity yet."}
      </div>
    );
  }

  const normalized = entries.map((e) => ({
    ...e,
    atDate: e.at instanceof Date ? e.at : new Date(e.at),
  }));
  normalized.sort((a, b) => b.atDate.getTime() - a.atDate.getTime());

  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    maxHeight,
    overflow: maxHeight ? "auto" : undefined,
  };

  const rowStyle: CSSProperties = {
    display: "flex",
    gap: 12,
    padding: "8px 12px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    alignItems: "flex-start",
  };

  const headerStyle: CSSProperties = {
    padding: "6px 12px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    position: "sticky",
    top: 0,
    background: token.colorBgContainer,
    zIndex: 1,
  };

  const row = (e: (typeof normalized)[number], time: string) => (
    <div key={e.id} style={rowStyle}>
      {renderActor ? renderActor(e.actor) : <Avatar user={e.actor} size="sm" />}
      <div style={{ minWidth: 0, flexGrow: 1 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: token.colorText }}>{e.actor.name}</span>
          <span style={{ fontSize: 14, color: token.colorTextSecondary }}>{e.action}</span>
          {e.target && (
            <span style={{ fontWeight: 500, fontSize: 14, color: token.colorText }}>
              {renderTarget ? renderTarget(e.target) : e.target}
            </span>
          )}
        </div>
        {e.detail && (
          <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 2 }}>{e.detail}</div>
        )}
      </div>
      <span style={{ fontSize: 12, color: token.colorTextSecondary, flexShrink: 0 }}>{time}</span>
    </div>
  );

  if (groupBy === "none") {
    return <div style={containerStyle}>{normalized.map((e) => row(e, formatTime(e.atDate)))}</div>;
  }

  const groups: Array<{ day: string; items: typeof normalized }> = [];
  for (const e of normalized) {
    const d = formatDay(e.atDate);
    const last = groups[groups.length - 1];
    if (last && last.day === d) last.items.push(e);
    else groups.push({ day: d, items: [e] });
  }

  return (
    <div style={containerStyle}>
      {groups.map((g) => (
        <div key={g.day}>
          <div style={headerStyle}>
            <span style={{ fontSize: 11, letterSpacing: "0.04em", fontWeight: 600, color: token.colorTextSecondary, textTransform: "uppercase" }}>
              {g.day}
            </span>
          </div>
          {g.items.map((e) => row(e, formatTime(e.atDate)))}
        </div>
      ))}
    </div>
  );
}

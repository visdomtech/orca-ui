import { DownOutlined, RightOutlined, CalendarOutlined } from "@ant-design/icons";
import { Button, Card, Space, theme } from "antd";
import { useState, type ReactNode } from "react";

import { Avatar } from "./Avatar";
import type { UserRef } from "./PeoplePicker";
import { StatusPill, type StatusPillTone } from "./StatusPill";

export interface ExpandableTaskCardProps {
  title: ReactNode;
  status: StatusPillTone;
  statusLabel?: string;
  owner?: UserRef;
  due?: Date | string;
  summary?: ReactNode;
  /** Controlled expanded state. If omitted, uses internal state. */
  expanded?: boolean;
  onToggle?: (next: boolean) => void;
  /** Right-side action slot in the header (e.g. menu, extra buttons). */
  actions?: ReactNode;
  /** Full detail shown when expanded. */
  children?: ReactNode;
  defaultExpanded?: boolean;
}

function formatDue(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ExpandableTaskCard({
  title,
  status,
  statusLabel,
  owner,
  due,
  summary,
  expanded: expandedProp,
  onToggle,
  actions,
  children,
  defaultExpanded = false,
}: ExpandableTaskCardProps) {
  const { token } = theme.useToken();
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const controlled = expandedProp !== undefined;
  const expanded = controlled ? expandedProp : internalExpanded;

  const toggle = () => {
    const next = !expanded;
    if (!controlled) setInternalExpanded(next);
    onToggle?.(next);
  };

  return (
    <Card
      size="small"
      styles={{ body: { padding: 0 } }}
      style={{ overflow: "hidden" }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: "100%",
          padding: "12px 16px",
          border: 0,
          background: "transparent",
          cursor: "pointer",
          font: "inherit",
          textAlign: "left",
          color: token.colorText,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            width: 20,
            height: 20,
            alignItems: "center",
            justifyContent: "center",
            color: token.colorTextSecondary,
            flexShrink: 0,
          }}
        >
          {expanded ? <DownOutlined /> : <RightOutlined />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600 }}>{title}</span>
            <StatusPill tone={status} label={statusLabel ?? status.toUpperCase()} />
          </div>
          {!expanded && summary && (
            <div style={{ fontSize: 13, color: token.colorTextSecondary, marginTop: 4 }}>
              {summary}
            </div>
          )}
        </div>
        <Space size={12} style={{ flexShrink: 0 }}>
          {owner && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: token.colorTextSecondary }}>
              <Avatar user={owner} size="xs" />
              <span>{owner.name}</span>
            </span>
          )}
          {due && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: token.colorTextSecondary }}>
              <CalendarOutlined />
              <span>{formatDue(due)}</span>
            </span>
          )}
          {actions && (
            <span onClick={(e) => e.stopPropagation()} role="presentation">
              {actions}
            </span>
          )}
        </Space>
      </button>
      {expanded && children && (
        <div
          style={{
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            padding: 16,
            background: token.colorFillQuaternary,
          }}
        >
          {children}
        </div>
      )}
    </Card>
  );
}

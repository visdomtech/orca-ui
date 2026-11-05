import {
  CheckCircleOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Button, Empty, theme } from "antd";
import type { ReactNode } from "react";

export type NotificationTone = "info" | "success" | "warning" | "danger";

export interface NotificationItem {
  id: string;
  title: ReactNode;
  detail?: ReactNode;
  at: Date | string;
  read?: boolean;
  tone?: NotificationTone;
  action?: { label: string; onClick: () => void };
}

export interface NotificationsTrayProps {
  items: NotificationItem[];
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead?: () => void;
  emptyState?: ReactNode;
  maxHeight?: number | string;
  title?: ReactNode;
}

function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

function formatRelative(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const TONE_ICON: Record<NotificationTone, ReactNode> = {
  info: <InfoCircleOutlined />,
  success: <CheckCircleOutlined />,
  warning: <WarningOutlined />,
  danger: <WarningOutlined />,
};

export function NotificationsTray({
  items,
  onDismiss,
  onMarkRead,
  onMarkAllRead,
  emptyState,
  maxHeight = 480,
  title = "Notifications",
}: NotificationsTrayProps) {
  const { token } = theme.useToken();
  const unreadCount = items.filter((i) => !i.read).length;

  const toneColor = (tone: NotificationTone | undefined) => {
    switch (tone) {
      case "success":
        return token.colorSuccess;
      case "warning":
        return token.colorWarning;
      case "danger":
        return token.colorError;
      case "info":
      default:
        return token.colorInfo;
    }
  };

  return (
    <div
      style={{
        width: 360,
        background: token.colorBgElevated,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div style={{ fontWeight: 650, fontSize: 14, color: token.colorText }}>
          {title}
          {unreadCount > 0 && (
            <span
              style={{
                marginLeft: 8,
                padding: "0 7px",
                borderRadius: 999,
                background: token.colorPrimary,
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && onMarkAllRead && (
          <Button type="link" size="small" onClick={onMarkAllRead} style={{ padding: 0 }}>
            Mark all read
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <div style={{ padding: 24 }}>
          {emptyState ?? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No new notifications" />}
        </div>
      ) : (
        <div style={{ maxHeight, overflowY: "auto" }}>
          {items.map((item) => {
            const d = toDate(item.at);
            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 14px",
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  background: item.read ? "transparent" : token.colorPrimaryBg,
                  cursor: item.read ? "default" : "pointer",
                  transition: "background 0.15s",
                }}
                onClick={() => !item.read && onMarkRead(item.id)}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `${toneColor(item.tone)}22`,
                    color: toneColor(item.tone),
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {TONE_ICON[item.tone ?? "info"]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: item.read ? 500 : 650, fontSize: 13, color: token.colorText }}>
                      {item.title}
                    </span>
                    <span style={{ fontSize: 11, color: token.colorTextSecondary }}>
                      {formatRelative(d)}
                    </span>
                  </div>
                  {item.detail && (
                    <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 2 }}>
                      {item.detail}
                    </div>
                  )}
                  {item.action && (
                    <Button
                      type="link"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        item.action!.onClick();
                      }}
                      style={{ padding: 0, marginTop: 4, height: "auto" }}
                    >
                      {item.action.label}
                    </Button>
                  )}
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined style={{ fontSize: 11 }} />}
                  aria-label="Dismiss"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(item.id);
                  }}
                  style={{ flexShrink: 0, color: token.colorTextSecondary }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

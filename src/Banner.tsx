import {
  CheckCircleOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  RightOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useState, type ReactNode } from "react";

import { LIGHT_SURFACE, LIGHT_TONES, type Tone } from "./palette";

export type BannerTone = "info" | "success" | "warning" | "danger" | "soft";

export interface BannerProps {
  tone?: BannerTone;
  title: ReactNode;
  detail?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  onDismiss?: () => void;
}

const BANNER_TO_PALETTE: Record<BannerTone, Tone | "soft"> = {
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
  soft: "soft",
};

const DEFAULT_ICONS: Record<BannerTone, ReactNode> = {
  info: <InfoCircleOutlined />,
  success: <CheckCircleOutlined />,
  warning: <WarningOutlined />,
  danger: <ExclamationCircleOutlined />,
  soft: <InfoCircleOutlined />,
};

function resolveColors(tone: BannerTone) {
  const key = BANNER_TO_PALETTE[tone];
  if (key === "soft") {
    return {
      background: LIGHT_SURFACE.surface,
      color: LIGHT_SURFACE.ink,
      border: `1px solid ${LIGHT_SURFACE.line}`,
      stripeColor: LIGHT_TONES.neutral.dot,
    };
  }
  const p = LIGHT_TONES[key];
  return {
    background: p.tint,
    color: p.fg,
    border: `1px solid transparent`,
    stripeColor: p.dot,
  };
}

export function Banner({ tone = "info", title, detail, action, icon, onDismiss }: BannerProps) {
  const { background, color, border, stripeColor } = resolveColors(tone);
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 8,
        border,
        background,
        color,
        borderLeft: `4px solid ${stripeColor}`,
      }}
    >
      <span style={{ marginTop: 2, color: stripeColor, display: "inline-flex", fontSize: 16 }}>
        {icon ?? DEFAULT_ICONS[tone]}
      </span>
      <div style={{ minWidth: 0, flexGrow: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.4 }}>{title}</div>
        {detail && (
          <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 2, opacity: 0.9 }}>{detail}</div>
        )}
      </div>
      {action && <div style={{ display: "inline-flex", alignItems: "center" }}>{action}</div>}
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          style={{
            all: "unset",
            cursor: "pointer",
            padding: 2,
            marginLeft: 4,
            borderRadius: 4,
            color: "currentColor",
            opacity: 0.55,
            display: "inline-flex",
            alignItems: "center",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.55")}
        >
          <CloseOutlined style={{ fontSize: 12 }} />
        </button>
      )}
    </div>
  );
}

export interface CollapsibleBannerProps extends BannerProps {
  defaultOpen?: boolean;
  summary: ReactNode;
}

export function CollapsibleBanner({
  defaultOpen = false,
  summary,
  title,
  detail,
  action,
  tone = "info",
  icon,
  onDismiss,
}: CollapsibleBannerProps) {
  const [open, setOpen] = useState(defaultOpen);
  const header = (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setOpen((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen((v) => !v);
        }
      }}
      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, userSelect: "none" }}
      aria-expanded={open}
    >
      <RightOutlined
        style={{
          fontSize: 10,
          transform: open ? "rotate(90deg)" : "none",
          transition: "transform 0.15s",
        }}
      />
      {title}
    </span>
  );
  return (
    <Banner
      tone={tone}
      icon={icon}
      onDismiss={onDismiss}
      title={header}
      detail={open ? detail : summary}
      action={action}
    />
  );
}

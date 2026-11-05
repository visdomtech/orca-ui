import { Alert } from "antd";
import { useState, type ReactNode } from "react";

export type BannerTone = "info" | "success" | "warning" | "danger" | "soft";

export interface BannerProps {
  tone?: BannerTone;
  title: ReactNode;
  detail?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  onDismiss?: () => void;
}

const TONE_TO_ANT: Record<BannerTone, "info" | "success" | "warning" | "error"> = {
  info: "info",
  success: "success",
  warning: "warning",
  danger: "error",
  soft: "info",
};

export function Banner({ tone = "info", title, detail, action, icon, onDismiss }: BannerProps) {
  const antType = TONE_TO_ANT[tone];
  return (
    <Alert
      type={antType}
      showIcon
      icon={icon}
      message={title}
      description={detail}
      action={action}
      closable={Boolean(onDismiss)}
      onClose={onDismiss}
      style={tone === "soft" ? { background: "rgba(0,0,0,0.03)", borderColor: "rgba(0,0,0,0.1)" } : undefined}
    />
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
      style={{ cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
      aria-expanded={open}
    >
      <span
        style={{
          display: "inline-block",
          transform: open ? "rotate(90deg)" : "none",
          transition: "transform 0.15s",
        }}
      >
        ▸
      </span>
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

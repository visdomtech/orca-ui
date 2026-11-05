import { Tag } from "antd";

export type StatusPillTone = "success" | "warning" | "error" | "info" | "neutral";

export interface StatusPillProps {
  tone: StatusPillTone;
  label: string;
}

const TONE_MAP: Record<StatusPillTone, string> = {
  success: "success",
  warning: "warning",
  error: "error",
  info: "processing",
  neutral: "default",
};

export function StatusPill({ tone, label }: StatusPillProps) {
  return (
    <Tag color={TONE_MAP[tone]} style={{ borderRadius: 999, fontWeight: 600, margin: 0 }} bordered>
      {label}
    </Tag>
  );
}

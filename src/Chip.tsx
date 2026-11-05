import { Tag } from "antd";
import type { ReactElement, ReactNode } from "react";

export type ChipTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent";

export type ChipSize = "sm" | "md";

export interface ChipProps {
  tone?: ChipTone;
  size?: ChipSize;
  icon?: ReactElement;
  children: ReactNode;
  onDelete?: () => void;
  onClick?: () => void;
}

const TONE_TO_COLOR: Record<ChipTone, string | undefined> = {
  neutral: "default",
  success: "success",
  warning: "warning",
  danger: "error",
  info: "processing",
  accent: "blue",
};

const SIZE_SX: Record<ChipSize, { fontSize: number; padding: string; lineHeight: string }> = {
  sm: { fontSize: 11, padding: "0 6px", lineHeight: "16px" },
  md: { fontSize: 12, padding: "1px 8px", lineHeight: "18px" },
};

export function Chip({
  tone = "neutral",
  size = "md",
  icon,
  children,
  onDelete,
  onClick,
}: ChipProps) {
  const style = {
    ...SIZE_SX[size],
    cursor: onClick ? "pointer" : undefined,
    fontWeight: 500,
    margin: 0,
  };
  return (
    <Tag
      color={TONE_TO_COLOR[tone]}
      icon={icon}
      closable={Boolean(onDelete)}
      onClose={onDelete ? (e) => { e.preventDefault(); onDelete(); } : undefined}
      onClick={onClick}
      style={style}
      bordered
    >
      {children}
    </Tag>
  );
}

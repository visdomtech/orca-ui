import { Chip, type ChipTone } from "./Chip";

export type StatusPillTone = "success" | "warning" | "error" | "info" | "neutral";

export interface StatusPillProps {
  tone: StatusPillTone;
  label: string;
}

const TONE_MAP: Record<StatusPillTone, ChipTone> = {
  success: "success",
  warning: "warning",
  error: "danger",
  info: "info",
  neutral: "neutral",
};

export function StatusPill({ tone, label }: StatusPillProps) {
  return (
    <Chip tone={TONE_MAP[tone]} variant="dot" size="sm">
      {label}
    </Chip>
  );
}

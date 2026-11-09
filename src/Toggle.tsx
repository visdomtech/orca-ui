import { Switch } from "antd";
import type { ReactNode } from "react";

export type ToggleSize = "sm" | "md";

export interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  hint?: ReactNode;
  size?: ToggleSize;
  disabled?: boolean;
  name?: string;
}

export function Toggle({ checked, onChange, label, hint, size = "md", disabled }: ToggleProps) {
  const control = (
    <Switch
      checked={checked}
      onChange={onChange}
      size={size === "sm" ? "small" : "default"}
      disabled={disabled}
    />
  );

  if (!label && !hint) return control;

  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: hint ? "flex-start" : "center",
        gap: 8,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {control}
      <div>
        {label && (
          <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>{label}</div>
        )}
        {hint && (
          <div style={{ fontSize: 12, color: "rgba(0,0,0,0.45)", lineHeight: 1.3 }}>{hint}</div>
        )}
      </div>
    </label>
  );
}

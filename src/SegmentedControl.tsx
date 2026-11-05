import { Segmented } from "antd";
import type { ReactNode } from "react";

export type SegmentedControlSize = "sm" | "md";

export interface SegmentedControlOption<V extends string = string> {
  value: V;
  label: ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface SegmentedControlProps<V extends string = string> {
  options: SegmentedControlOption<V>[];
  value: V;
  onChange: (next: V) => void;
  size?: SegmentedControlSize;
  fullWidth?: boolean;
  "aria-label"?: string;
}

export function SegmentedControl<V extends string = string>({
  options,
  value,
  onChange,
  size = "md",
  fullWidth,
}: SegmentedControlProps<V>) {
  return (
    <Segmented<V>
      value={value}
      onChange={(v) => onChange(v as V)}
      size={size === "sm" ? "small" : "middle"}
      block={fullWidth}
      options={options.map((o) => ({
        value: o.value,
        disabled: o.disabled,
        label: (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {o.label}
            {typeof o.count === "number" && (
              <span
                style={{
                  minWidth: 18,
                  padding: "0 6px",
                  borderRadius: 999,
                  fontSize: 11,
                  background: "rgba(0,0,0,0.06)",
                  color: "rgba(0,0,0,0.65)",
                }}
              >
                {o.count}
              </span>
            )}
          </span>
        ),
      }))}
    />
  );
}

import type { ReactNode } from "react";

export interface DetailRowProps {
  label: string;
  children: ReactNode;
}

export function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div style={{ display: "flex", padding: "12px 0" }}>
      <div
        style={{
          width: 160,
          flexShrink: 0,
          fontSize: 14,
          fontWeight: 500,
          color: "rgba(0,0,0,0.65)",
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

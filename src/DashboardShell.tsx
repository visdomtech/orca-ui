import type { CSSProperties, ReactNode } from "react";

export interface DashboardShellProps {
  kpis?: ReactNode;
  filters?: ReactNode;
  primary: ReactNode;
  secondary?: ReactNode;
  secondaryWidth?: number;
  gap?: number;
}

export function DashboardShell({
  kpis,
  filters,
  primary,
  secondary,
  secondaryWidth = 340,
  gap = 20,
}: DashboardShellProps) {
  const rootStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    minHeight: 0,
    gap,
  };

  const bodyStyle: CSSProperties = secondary
    ? { display: "grid", minHeight: 0, gridTemplateColumns: "1fr auto", gap }
    : { minWidth: 0 };

  return (
    <div style={rootStyle}>
      {kpis && <div>{kpis}</div>}
      {filters && <div>{filters}</div>}
      <div style={bodyStyle}>
        <div style={{ minWidth: 0 }}>{primary}</div>
        {secondary && <div style={{ width: secondaryWidth, flexShrink: 0 }}>{secondary}</div>}
      </div>
    </div>
  );
}

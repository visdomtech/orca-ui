import { Empty } from "antd";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Empty
      image={<div style={{ fontSize: 40, color: "rgba(0,0,0,0.25)", display: "flex", justifyContent: "center" }}>{icon}</div>}
      description={
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(0,0,0,0.88)" }}>{title}</div>
          {description && (
            <div style={{ fontSize: 12, color: "rgba(0,0,0,0.45)", marginTop: 4, maxWidth: 360, marginInline: "auto" }}>
              {description}
            </div>
          )}
        </div>
      }
    >
      {action}
    </Empty>
  );
}

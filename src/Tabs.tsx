import { Tabs as AntTabs } from "antd";
import type { ReactNode } from "react";

export interface TabSpec<Id extends string = string> {
  id: Id;
  label: ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps<Id extends string = string> {
  tabs: TabSpec<Id>[];
  activeId: Id;
  onChange: (next: Id) => void;
  variant?: "standard" | "fullWidth";
  "aria-label"?: string;
}

export function Tabs<Id extends string = string>({ tabs, activeId, onChange }: TabsProps<Id>) {
  return (
    <AntTabs
      activeKey={activeId}
      onChange={(k) => onChange(k as Id)}
      items={tabs.map((t) => ({
        key: t.id,
        disabled: t.disabled,
        label: (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {t.label}
            {typeof t.count === "number" && (
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
                {t.count}
              </span>
            )}
          </span>
        ),
      }))}
    />
  );
}

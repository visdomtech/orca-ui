import { theme } from "antd";
import type { CSSProperties, ReactNode } from "react";

import { TwoPane } from "./TwoPane";

export interface LeftRailItem<Id extends string = string> {
  id: Id;
  label: ReactNode;
  meta?: ReactNode;
  disabled?: boolean;
}

export interface LeftRailWorkspaceProps<Id extends string = string> {
  rail: {
    items: LeftRailItem<Id>[];
    selectedId: Id | null;
    onSelect: (id: Id) => void;
    header?: ReactNode;
    search?: ReactNode;
    footer?: ReactNode;
    empty?: ReactNode;
    "aria-label"?: string;
  };
  children: ReactNode;
  railWidth?: number;
  resizable?: boolean;
}

export function LeftRailWorkspace<Id extends string = string>({
  rail,
  children,
  railWidth = 300,
  resizable = false,
}: LeftRailWorkspaceProps<Id>) {
  const { token } = theme.useToken();

  const headerStyle: CSSProperties = {
    padding: "12px 16px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    flexShrink: 0,
  };

  const listStyle: CSSProperties = {
    flexGrow: 1,
    overflowY: "auto",
    padding: "4px 0",
  };

  const footerStyle: CSSProperties = {
    padding: "8px 12px",
    borderTop: `1px solid ${token.colorBorderSecondary}`,
    flexShrink: 0,
  };

  return (
    <TwoPane
      split={resizable ? "resizable" : "fixed"}
      leftWidth={railWidth}
      left={
        <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
          {(rail.header || rail.search) && (
            <div style={headerStyle}>
              {rail.header}
              {rail.search}
            </div>
          )}
          <nav aria-label={rail["aria-label"] ?? "Items"} style={listStyle}>
            {rail.items.length === 0 ? (
              <div style={{ padding: 16, color: token.colorTextSecondary, fontSize: 12 }}>
                {rail.empty ?? "No items."}
              </div>
            ) : (
              rail.items.map((item) => {
                const selected = rail.selectedId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={item.disabled}
                    aria-current={selected ? "page" : undefined}
                    onClick={() => rail.onSelect(item.id)}
                    style={{
                      display: "block",
                      width: "calc(100% - 8px)",
                      textAlign: "left",
                      padding: "8px 12px",
                      margin: "2px 4px",
                      borderRadius: token.borderRadius,
                      border: 0,
                      background: selected ? token.colorPrimaryBg : "transparent",
                      color: selected ? token.colorPrimary : token.colorText,
                      fontWeight: selected ? 600 : 500,
                      cursor: item.disabled ? "not-allowed" : "pointer",
                      font: "inherit",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!selected && !item.disabled) {
                        e.currentTarget.style.background = token.colorFillTertiary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selected) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <div style={{ fontSize: 14, lineHeight: 1.3, color: "inherit", fontWeight: "inherit" }}>
                      {item.label}
                    </div>
                    {item.meta && (
                      <div
                        style={{
                          fontSize: 12,
                          color: token.colorTextSecondary,
                          lineHeight: 1.3,
                          marginTop: 2,
                        }}
                      >
                        {item.meta}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </nav>
          {rail.footer && <div style={footerStyle}>{rail.footer}</div>}
        </div>
      }
      right={children}
    />
  );
}

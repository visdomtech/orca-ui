import { LinkOutlined } from "@ant-design/icons";
import { Button, Empty, theme, Typography } from "antd";
import type { ReactNode } from "react";

const { Text } = Typography;

export interface Citation {
  id: string;
  label: ReactNode;
  source: string;
  snippet?: string;
  href?: string;
}

export interface EvidencePanelProps {
  citations: Citation[];
  onOpen?: (citation: Citation) => void;
  emptyState?: ReactNode;
  title?: ReactNode;
}

export function EvidencePanel({ citations, onOpen, emptyState, title }: EvidencePanelProps) {
  const { token } = theme.useToken();

  if (citations.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        {emptyState ?? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No evidence yet" />}
      </div>
    );
  }

  return (
    <div>
      {title && (
        <div style={{ padding: "0 4px 8px", color: token.colorTextSecondary, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {title}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {citations.map((c) => {
          const openable = Boolean(c.href || onOpen);
          const content = (
            <div
              style={{
                padding: 12,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadius,
                background: token.colorBgContainer,
                transition: "border-color 0.15s, background 0.15s",
                cursor: openable ? "pointer" : "default",
              }}
              onMouseEnter={(e) => {
                if (openable) {
                  e.currentTarget.style.borderColor = token.colorPrimary;
                  e.currentTarget.style.background = token.colorPrimaryBg;
                }
              }}
              onMouseLeave={(e) => {
                if (openable) {
                  e.currentTarget.style.borderColor = token.colorBorderSecondary;
                  e.currentTarget.style.background = token.colorBgContainer;
                }
              }}
              onClick={() => {
                if (c.href) {
                  window.open(c.href, "_blank", "noopener,noreferrer");
                } else if (onOpen) {
                  onOpen(c);
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: token.colorText }}>
                    {c.label}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {c.source}
                  </Text>
                  {c.snippet && (
                    <blockquote
                      style={{
                        margin: "6px 0 0",
                        padding: "4px 10px",
                        borderLeft: `3px solid ${token.colorPrimary}`,
                        color: token.colorTextSecondary,
                        fontStyle: "italic",
                        fontSize: 12,
                        lineHeight: 1.4,
                      }}
                    >
                      {c.snippet}
                    </blockquote>
                  )}
                </div>
                {c.href && (
                  <Button type="text" size="small" icon={<LinkOutlined />} aria-label="Open source" />
                )}
              </div>
            </div>
          );
          return <div key={c.id}>{content}</div>;
        })}
      </div>
    </div>
  );
}

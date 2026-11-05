import { Divider, Typography, theme } from "antd";
import type { ReactNode } from "react";

const { Title, Text } = Typography;

export interface StoryPanelProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function StoryPanel({ title, description, children }: StoryPanelProps) {
  return (
    <div style={{ maxWidth: 1100 }}>
      <Title level={2} style={{ marginBottom: 4 }}>
        {title}
      </Title>
      {description && (
        <Text type="secondary" style={{ display: "block", marginBottom: 20 }}>
          {description}
        </Text>
      )}
      <Divider style={{ marginBottom: 24 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>{children}</div>
    </div>
  );
}

export interface VariantProps {
  label: string;
  code?: string;
  children: ReactNode;
}

export function Variant({ label, code, children }: VariantProps) {
  const { token } = theme.useToken();
  return (
    <div>
      <Text
        type="secondary"
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <div
        style={{
          marginTop: 4,
          padding: 20,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          background: token.colorBgContainer,
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "center",
        }}
      >
        {children}
      </div>
      {code && (
        <pre
          style={{
            marginTop: 8,
            padding: "8px 12px",
            fontFamily: '"JetBrains Mono", Consolas, monospace',
            fontSize: 12,
            background: "#0f172a",
            color: "#e2e8f0",
            borderRadius: 6,
            overflow: "auto",
          }}
        >
          {code}
        </pre>
      )}
    </div>
  );
}

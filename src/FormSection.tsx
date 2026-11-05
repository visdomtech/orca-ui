import { Divider, Space, Typography } from "antd";
import type { ReactNode } from "react";

const { Text } = Typography;

export interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <div style={{ marginBottom: 32 }}>
      <Text
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(0,0,0,0.65)",
        }}
      >
        {title}
      </Text>
      {description && (
        <Text style={{ display: "block", fontSize: 12, color: "rgba(0,0,0,0.45)", marginTop: 4 }}>
          {description}
        </Text>
      )}
      <Divider style={{ margin: "16px 0" }} />
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        {children}
      </Space>
    </div>
  );
}

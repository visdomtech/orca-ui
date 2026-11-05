import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Space, Typography } from "antd";
import type { ReactNode } from "react";
import { Link } from "react-router";

const { Title, Text } = Typography;

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function PageHeader({ title, subtitle, actions, backHref, backLabel = "Back" }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      {backHref && (
        <Button
          type="text"
          size="small"
          icon={<ArrowLeftOutlined />}
          style={{ marginBottom: 8, marginLeft: -8, color: "rgba(0,0,0,0.65)" }}
        >
          <Link to={backHref} style={{ color: "inherit" }}>
            {backLabel}
          </Link>
        </Button>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          {subtitle && (
            <Text type="secondary" style={{ display: "block", marginTop: 4 }}>
              {subtitle}
            </Text>
          )}
        </div>
        {actions && (
          <Space size={8} style={{ flexShrink: 0 }}>
            {actions}
          </Space>
        )}
      </div>
    </div>
  );
}

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Space, Typography } from "antd";
import type { ReactNode } from "react";
import { Link } from "react-router";

const { Title, Text } = Typography;

export interface DetailLayoutProps {
  title: string;
  subtitle?: string;
  status?: ReactNode;
  avatar?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
}

export function DetailLayout({
  title,
  subtitle,
  status,
  avatar,
  actions,
  backHref,
  backLabel = "Back",
  children,
}: DetailLayoutProps) {
  return (
    <div>
      {backHref && (
        <Button type="text" size="small" icon={<ArrowLeftOutlined />} style={{ marginBottom: 8, marginLeft: -8 }}>
          <Link to={backHref} style={{ color: "inherit" }}>
            {backLabel}
          </Link>
        </Button>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        {avatar}
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Title level={4} style={{ margin: 0 }}>
              {title}
            </Title>
            {status}
          </div>
          {subtitle && (
            <Text type="secondary" style={{ display: "block", marginTop: 4 }}>
              {subtitle}
            </Text>
          )}
        </div>
        {actions && <Space size={8}>{actions}</Space>}
      </div>
      {children}
    </div>
  );
}

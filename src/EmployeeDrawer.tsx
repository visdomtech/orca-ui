import { Collapse, theme } from "antd";
import type { ReactNode } from "react";

import { Avatar } from "./Avatar";
import { Drawer } from "./Drawer";
import type { UserRef } from "./PeoplePicker";

export interface EmployeeDrawerSection {
  id: string;
  title: ReactNode;
  render: () => ReactNode;
  defaultOpen?: boolean;
}

export interface EmployeeDrawerProps {
  open: boolean;
  onClose: () => void;
  user: UserRef;
  /** Shown below name/email in the user header (e.g. "Senior Software Engineer · Platform"). */
  subtitle?: ReactNode;
  sections: EmployeeDrawerSection[];
  /** Right-aligned action buttons in the footer. */
  actions?: ReactNode;
  width?: number | string;
}

export function EmployeeDrawer({
  open,
  onClose,
  user,
  subtitle,
  sections,
  actions,
  width = 480,
}: EmployeeDrawerProps) {
  const { token } = theme.useToken();

  const defaultOpenKeys = sections.filter((s) => s.defaultOpen).map((s) => s.id);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width={width}
      title={null}
      footer={actions ? <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>{actions}</div> : undefined}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingBottom: 16,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          marginBottom: 16,
        }}
      >
        <Avatar user={user} size="lg" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 650, color: token.colorText, lineHeight: 1.25 }}>
            {user.name}
          </div>
          {user.email && (
            <div style={{ fontSize: 13, color: token.colorTextSecondary, marginTop: 2 }}>
              {user.email}
            </div>
          )}
          {subtitle && (
            <div style={{ fontSize: 13, color: token.colorTextSecondary, marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      <Collapse
        defaultActiveKey={defaultOpenKeys}
        bordered={false}
        items={sections.map((s) => ({
          key: s.id,
          label: <span style={{ fontWeight: 600 }}>{s.title}</span>,
          children: s.render(),
        }))}
      />
    </Drawer>
  );
}

import { MoreOutlined } from "@ant-design/icons";
import { Button, Dropdown, type MenuProps as AntMenuProps } from "antd";
import { useState, type MouseEvent, type ReactElement, type ReactNode } from "react";

export interface MenuAction {
  id: string;
  label: ReactNode;
  icon?: ReactElement;
  danger?: boolean;
  disabled?: boolean;
  description?: ReactNode;
}

export type MenuItem = MenuAction | "divider";

export type MenuAlign = "start" | "end";

export interface MenuProps {
  items: MenuItem[];
  onSelect: (id: string) => void;
  align?: MenuAlign;
  trigger: (api: { open: boolean; toggle: (e: MouseEvent<HTMLElement>) => void }) => ReactElement;
}

function toAntItems(items: MenuItem[], onSelect: (id: string) => void): AntMenuProps["items"] {
  return items.map((item, i) => {
    if (item === "divider") return { type: "divider" as const, key: `d-${i}` };
    return {
      key: item.id,
      icon: item.icon,
      danger: item.danger,
      disabled: item.disabled,
      label: (
        <div>
          <div>{item.label}</div>
          {item.description && (
            <div style={{ fontSize: 12, color: "rgba(0,0,0,0.45)", lineHeight: 1.3 }}>
              {item.description}
            </div>
          )}
        </div>
      ),
      onClick: () => onSelect(item.id),
    };
  });
}

export function Menu({ items, onSelect, align = "end", trigger }: MenuProps) {
  const [open, setOpen] = useState(false);
  const toggle = (_e: MouseEvent<HTMLElement>) => setOpen((v) => !v);
  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      placement={align === "end" ? "bottomRight" : "bottomLeft"}
      menu={{ items: toAntItems(items, onSelect) }}
    >
      {trigger({ open, toggle })}
    </Dropdown>
  );
}

export interface MeatballMenuProps extends Omit<MenuProps, "trigger"> {
  "aria-label"?: string;
}

export function MeatballMenu({ items, onSelect, align, ...aria }: MeatballMenuProps) {
  return (
    <Menu
      items={items}
      onSelect={onSelect}
      align={align}
      trigger={() => (
        <Button
          type="text"
          size="small"
          icon={<MoreOutlined />}
          aria-label={aria["aria-label"] ?? "More actions"}
        />
      )}
    />
  );
}

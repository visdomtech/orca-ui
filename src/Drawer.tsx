import { Drawer as AntDrawer } from "antd";
import type { ReactNode } from "react";

export type DrawerSide = "right" | "left";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  side?: DrawerSide;
  width?: number | string;
  footer?: ReactNode;
  dismissible?: boolean;
  children: ReactNode;
}

export function Drawer({
  open,
  onClose,
  title,
  side = "right",
  width = 420,
  footer,
  dismissible = true,
  children,
}: DrawerProps) {
  return (
    <AntDrawer
      open={open}
      onClose={dismissible ? onClose : () => undefined}
      title={title}
      placement={side}
      width={width}
      footer={footer}
      closable={dismissible}
      maskClosable={dismissible}
      keyboard={dismissible}
    >
      {children}
    </AntDrawer>
  );
}

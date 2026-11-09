import { Modal as AntModal } from "antd";
import { useEffect, type ReactNode, type RefObject } from "react";

export type ModalSize = "sm" | "md" | "lg" | "xl";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  size?: ModalSize;
  footer?: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  dismissible?: boolean;
  children: ReactNode;
}

const SIZE_WIDTH: Record<ModalSize, number> = {
  sm: 400,
  md: 560,
  lg: 760,
  xl: 1024,
};

export function Modal({
  open,
  onClose,
  title,
  size = "md",
  footer,
  initialFocusRef,
  dismissible = true,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open || !initialFocusRef) return;
    const id = window.setTimeout(() => initialFocusRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [open, initialFocusRef]);

  return (
    <AntModal
      open={open}
      onCancel={dismissible ? onClose : undefined}
      title={title}
      width={SIZE_WIDTH[size]}
      footer={footer ?? null}
      closable={dismissible}
      maskClosable={dismissible}
      keyboard={dismissible}
      destroyOnHidden
    >
      {children}
    </AntModal>
  );
}

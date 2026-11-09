import { Button as AntButton, type ButtonProps as AntButtonProps } from "antd";
import type { ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<
    AntButtonProps,
    "variant" | "size" | "type" | "danger" | "color" | "icon" | "iconPosition"
  > {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leading?: ReactNode;
  trailing?: ReactNode;
  loading?: boolean;
}

const SIZE_MAP: Record<ButtonSize, AntButtonProps["size"]> = {
  sm: "small",
  md: "middle",
  lg: "large",
};

interface AntButtonConfig {
  type: AntButtonProps["type"];
  danger?: boolean;
}

const VARIANT_TO_ANT: Record<ButtonVariant, AntButtonConfig> = {
  primary: { type: "primary" },
  secondary: { type: "default" },
  ghost: { type: "text" },
  danger: { type: "primary", danger: true },
  link: { type: "link" },
};

export function Button({
  variant = "primary",
  size = "md",
  leading,
  trailing,
  loading = false,
  children,
  ...rest
}: ButtonProps) {
  const ant = VARIANT_TO_ANT[variant];
  return (
    <AntButton
      {...rest}
      type={ant.type}
      danger={ant.danger}
      size={SIZE_MAP[size]}
      loading={loading}
      icon={leading}
    >
      {children}
      {trailing}
    </AntButton>
  );
}

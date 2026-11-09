import { Form } from "antd";
import type { CSSProperties, ReactNode } from "react";

export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export function Field({ label, hint, error, required, htmlFor, children, style, className }: FieldProps) {
  return (
    <Form.Item
      label={label}
      htmlFor={htmlFor}
      required={required}
      validateStatus={error ? "error" : undefined}
      help={error ?? hint}
      style={style}
      className={className}
      layout="vertical"
    >
      {children}
    </Form.Item>
  );
}

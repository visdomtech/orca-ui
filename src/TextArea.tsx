import { Form, Input } from "antd";
import type { TextAreaProps as AntTextAreaProps } from "antd/es/input/TextArea";
import type { ReactNode } from "react";

export interface TextAreaProps extends Omit<AntTextAreaProps, "size" | "status"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  minRows?: number;
  maxRows?: number;
  fullWidth?: boolean;
}

export function TextArea({
  label,
  hint,
  error,
  minRows = 3,
  maxRows,
  fullWidth = true,
  style,
  ...rest
}: TextAreaProps) {
  const input = (
    <Input.TextArea
      {...rest}
      status={error ? "error" : undefined}
      autoSize={{ minRows, maxRows: maxRows ?? Math.max(minRows, 10) }}
      style={{ ...style, ...(fullWidth ? { width: "100%" } : {}) }}
    />
  );
  if (!label && !hint && !error) return input;
  return (
    <Form.Item
      label={label}
      validateStatus={error ? "error" : undefined}
      help={error ?? hint}
      layout="vertical"
      style={{ marginBottom: 0 }}
    >
      {input}
    </Form.Item>
  );
}

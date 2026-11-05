import { Form, Input, type InputProps as AntInputProps, type InputRef } from "antd";
import type { ReactNode, Ref } from "react";

export interface TextInputProps extends Omit<AntInputProps, "size" | "status"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  fullWidth?: boolean;
  autoFocus?: boolean;
  /** Receives the HTMLInputElement. */
  inputRef?: Ref<HTMLInputElement>;
}

export function TextInput({
  label,
  hint,
  error,
  fullWidth = true,
  inputRef,
  style,
  ...rest
}: TextInputProps) {
  const antRef = (node: InputRef | null) => {
    if (typeof inputRef === "function") {
      inputRef(node?.input ?? null);
    } else if (inputRef && typeof inputRef === "object") {
      (inputRef as { current: HTMLInputElement | null }).current = node?.input ?? null;
    }
  };

  const input = (
    <Input
      {...rest}
      ref={antRef}
      status={error ? "error" : undefined}
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

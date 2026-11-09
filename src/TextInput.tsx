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

function assignRef(ref: Ref<HTMLInputElement> | undefined, el: HTMLInputElement | null) {
  if (typeof ref === "function") {
    ref(el);
  } else if (ref && typeof ref === "object") {
    (ref as { current: HTMLInputElement | null }).current = el;
  }
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
    assignRef(inputRef, node?.input ?? null);
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

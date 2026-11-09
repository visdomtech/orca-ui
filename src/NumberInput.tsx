import { Form, InputNumber } from "antd";
import type { InputNumberProps as AntInputNumberProps } from "antd/es/input-number";
import type { ReactNode } from "react";

export interface NumberInputProps
  extends Omit<AntInputNumberProps, "value" | "onChange" | "status" | "size"> {
  value: number | "";
  onChange: (next: number | "") => void;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  fullWidth?: boolean;
}

export function NumberInput({
  value,
  onChange,
  label,
  hint,
  error,
  min,
  max,
  step,
  fullWidth = true,
  style,
  ...rest
}: NumberInputProps) {
  const input = (
    <InputNumber
      {...rest}
      value={value === "" ? null : value}
      onChange={(v) => {
        if (v === null || v === undefined) onChange("");
        else if (typeof v === "number") onChange(v);
        else {
          const n = Number(v);
          onChange(Number.isNaN(n) ? "" : n);
        }
      }}
      min={min}
      max={max}
      step={step}
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

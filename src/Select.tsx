import { Form, Select as AntSelect } from "antd";
import type { ReactNode } from "react";

export interface SelectOption<V extends string | number = string> {
  value: V;
  label: ReactNode;
  disabled?: boolean;
}

export interface SelectProps<V extends string | number = string> {
  value: V | "";
  onChange: (next: V) => void;
  options: SelectOption<V>[];
  placeholder?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  disabled?: boolean;
  allowClear?: boolean;
  fullWidth?: boolean;
}

export function Select<V extends string | number = string>({
  value,
  onChange,
  options,
  placeholder,
  label,
  hint,
  error,
  disabled,
  allowClear,
  fullWidth = true,
}: SelectProps<V>) {
  const select = (
    <AntSelect<V>
      value={value === "" ? undefined : (value as V)}
      onChange={(v) => onChange(v as V)}
      options={options.map((o) => ({ value: o.value, label: o.label, disabled: o.disabled }))}
      placeholder={placeholder}
      disabled={disabled}
      allowClear={allowClear}
      status={error ? "error" : undefined}
      style={fullWidth ? { width: "100%" } : undefined}
    />
  );
  if (!label && !hint && !error) return select;
  return (
    <Form.Item
      label={label}
      validateStatus={error ? "error" : undefined}
      help={error ?? hint}
      layout="vertical"
      style={{ marginBottom: 0 }}
    >
      {select}
    </Form.Item>
  );
}

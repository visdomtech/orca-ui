import { DatePicker, Form } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type { ReactNode } from "react";

export interface MonthYearValue {
  month: number;
  year: number;
}

export interface MonthYearPickerProps {
  value: MonthYearValue;
  onChange: (next: MonthYearValue) => void;
  minYear?: number;
  maxYear?: number;
  label?: ReactNode;
  disabled?: boolean;
}

export function MonthYearPicker({
  value,
  onChange,
  minYear = 1970,
  maxYear = 2100,
  label,
  disabled,
}: MonthYearPickerProps) {
  const antValue: Dayjs = dayjs(new Date(value.year, value.month - 1, 1));

  const picker = (
    <DatePicker
      picker="month"
      value={antValue}
      disabled={disabled}
      onChange={(d) => {
        if (!d) return;
        onChange({ month: d.month() + 1, year: d.year() });
      }}
      minDate={dayjs(new Date(minYear, 0, 1))}
      maxDate={dayjs(new Date(maxYear, 11, 31))}
      format="MMMM YYYY"
      style={{ width: "100%" }}
    />
  );

  if (!label) return picker;
  return (
    <Form.Item label={label} layout="vertical" style={{ marginBottom: 0 }}>
      {picker}
    </Form.Item>
  );
}

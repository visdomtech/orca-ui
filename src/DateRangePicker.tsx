import { DatePicker, Form } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import type { ReactNode } from "react";

const { RangePicker } = DatePicker;

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface DateRangePreset {
  id: string;
  label: string;
  range: () => DateRange;
}

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (next: DateRange) => void;
  presets?: DateRangePreset[];
  minDate?: Date;
  maxDate?: Date;
  label?: ReactNode;
  placeholder?: string;
}

const ONE_DAY = 24 * 60 * 60 * 1000;

export const DEFAULT_PRESETS: DateRangePreset[] = [
  { id: "7d", label: "Last 7 days", range: () => ({ from: new Date(Date.now() - 7 * ONE_DAY), to: new Date() }) },
  { id: "30d", label: "Last 30 days", range: () => ({ from: new Date(Date.now() - 30 * ONE_DAY), to: new Date() }) },
  { id: "90d", label: "Last 90 days", range: () => ({ from: new Date(Date.now() - 90 * ONE_DAY), to: new Date() }) },
  { id: "ytd", label: "Year to date", range: () => ({ from: new Date(new Date().getFullYear(), 0, 1), to: new Date() }) },
];

export function DateRangePicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  minDate,
  maxDate,
  label,
  placeholder = "Select date range",
}: DateRangePickerProps) {
  const antValue: [Dayjs | null, Dayjs | null] = [
    value.from ? dayjs(value.from) : null,
    value.to ? dayjs(value.to) : null,
  ];

  const antPresets = presets.map((p) => {
    const r = p.range();
    return {
      label: p.label,
      value: [r.from ? dayjs(r.from) : null, r.to ? dayjs(r.to) : null] as [Dayjs | null, Dayjs | null],
    };
  });

  const picker = (
    <RangePicker
      value={antValue}
      onChange={(dates) => {
        onChange({
          from: dates?.[0]?.toDate() ?? null,
          to: dates?.[1]?.toDate() ?? null,
        });
      }}
      allowEmpty={[true, true]}
      placeholder={[placeholder, placeholder]}
      presets={antPresets}
      minDate={minDate ? dayjs(minDate) : undefined}
      maxDate={maxDate ? dayjs(maxDate) : undefined}
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

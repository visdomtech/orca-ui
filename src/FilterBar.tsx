import { CloseOutlined, SearchOutlined } from "@ant-design/icons";
import { Button as AntButton, Checkbox, Dropdown, Input, Space, theme } from "antd";
import { useState, type ReactNode } from "react";

import { Chip } from "./Chip";
import { DateRangePicker, type DateRange, type DateRangePreset } from "./DateRangePicker";
import { Select, type SelectOption } from "./Select";
import { Toggle } from "./Toggle";

export type FilterSpec =
  | { kind: "search"; id: string; label: string; placeholder?: string }
  | { kind: "select"; id: string; label: string; options: SelectOption[]; placeholder?: string }
  | {
      kind: "multiselect";
      id: string;
      label: string;
      options: Array<{ value: string; label: ReactNode; count?: number }>;
      placeholder?: string;
    }
  | { kind: "daterange"; id: string; label: string; presets?: DateRangePreset[] }
  | { kind: "toggle"; id: string; label: string };

export type FilterValue = string | string[] | DateRange | boolean | null;
export type FilterState = Record<string, FilterValue>;

export interface FilterBarProps {
  filters: FilterSpec[];
  value: FilterState;
  onChange: (next: FilterState) => void;
  onReset?: () => void;
  density?: "compact" | "standard";
  showActiveChips?: boolean;
}

function isActive(spec: FilterSpec, v: FilterValue): boolean {
  if (v === null || v === undefined) return false;
  switch (spec.kind) {
    case "search":
    case "select":
      return typeof v === "string" && v.length > 0;
    case "multiselect":
      return Array.isArray(v) && v.length > 0;
    case "daterange":
      return typeof v === "object" && v !== null && !Array.isArray(v) && (Boolean((v as DateRange).from) || Boolean((v as DateRange).to));
    case "toggle":
      return v === true;
  }
}

function describeActive(spec: FilterSpec, v: FilterValue): string {
  switch (spec.kind) {
    case "search":
      return `"${v as string}"`;
    case "select": {
      const opt = spec.options.find((o) => o.value === v);
      return typeof opt?.label === "string" ? opt.label : String(v);
    }
    case "multiselect":
      return (v as string[]).length === 1
        ? String(spec.options.find((o) => o.value === (v as string[])[0])?.label ?? (v as string[])[0])
        : `${(v as string[]).length} selected`;
    case "daterange": {
      const r = v as DateRange;
      const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      if (r.from && r.to) return `${fmt(r.from)} – ${fmt(r.to)}`;
      if (r.from) return `From ${fmt(r.from)}`;
      if (r.to) return `Until ${fmt(r.to)}`;
      return "";
    }
    case "toggle":
      return "on";
  }
}

function emptyValueFor(spec: FilterSpec): FilterValue {
  switch (spec.kind) {
    case "search":
    case "select":
      return "";
    case "multiselect":
      return [];
    case "daterange":
      return { from: null, to: null };
    case "toggle":
      return false;
  }
}

function MultiDropdown({
  spec,
  value,
  onChange,
}: {
  spec: Extract<FilterSpec, { kind: "multiselect" }>;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { token } = theme.useToken();
  const [open, setOpen] = useState(false);
  const selected = new Set(value);
  const active = value.length > 0;

  const panel = (
    <div style={{ minWidth: 240, padding: 4 }}>
      {spec.options.map((o) => {
        const checked = selected.has(o.value);
        return (
          <div
            key={o.value}
            onClick={() => {
              const next = new Set(selected);
              if (checked) next.delete(o.value);
              else next.add(o.value);
              onChange(Array.from(next));
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              cursor: "pointer",
              borderRadius: token.borderRadius,
              fontSize: 14,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = token.colorFillTertiary)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Checkbox checked={checked} />
            <span style={{ flexGrow: 1 }}>{o.label}</span>
            {typeof o.count === "number" && (
              <span style={{ fontSize: 12, color: token.colorTextSecondary }}>{o.count}</span>
            )}
          </div>
        );
      })}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, padding: "4px 8px" }}>
        <AntButton type="text" size="small" onClick={() => onChange([])}>
          Clear
        </AntButton>
        <AntButton type="primary" size="small" onClick={() => setOpen(false)}>
          Done
        </AntButton>
      </div>
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      placement="bottomLeft"
      popupRender={() => panel}
    >
      <AntButton
        type={active ? "default" : "text"}
        size="middle"
        style={active ? { borderColor: token.colorPrimary, color: token.colorPrimary } : undefined}
      >
        {spec.label}
        {active && (
          <span
            style={{
              marginLeft: 6,
              padding: "0 6px",
              borderRadius: 999,
              fontSize: 11,
              background: token.colorPrimary,
              color: "#fff",
            }}
          >
            {value.length}
          </span>
        )}
      </AntButton>
    </Dropdown>
  );
}

export function FilterBar({
  filters,
  value,
  onChange,
  onReset,
  showActiveChips = true,
}: FilterBarProps) {
  const setOne = (id: string, next: FilterValue) => onChange({ ...value, [id]: next });
  const anyActive = filters.some((f) => isActive(f, value[f.id] ?? null));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Space wrap size={8} style={{ alignItems: "center" }}>
        {filters.map((spec) => {
          const v = value[spec.id] ?? emptyValueFor(spec);
          switch (spec.kind) {
            case "search":
              return (
                <Input
                  key={spec.id}
                  prefix={<SearchOutlined />}
                  placeholder={spec.placeholder ?? spec.label}
                  value={(v as string) ?? ""}
                  onChange={(e) => setOne(spec.id, e.target.value)}
                  style={{ width: 240 }}
                  allowClear
                />
              );
            case "select":
              return (
                <div key={spec.id} style={{ minWidth: 160 }}>
                  <Select
                    value={(v as string) ?? ""}
                    onChange={(next) => setOne(spec.id, next)}
                    options={spec.options}
                    placeholder={spec.placeholder ?? `All ${spec.label.toLowerCase()}`}
                    allowClear
                  />
                </div>
              );
            case "multiselect":
              return (
                <MultiDropdown
                  key={spec.id}
                  spec={spec}
                  value={(v as string[]) ?? []}
                  onChange={(next) => setOne(spec.id, next)}
                />
              );
            case "daterange":
              return (
                <div key={spec.id} style={{ minWidth: 240 }}>
                  <DateRangePicker
                    value={(v as DateRange) ?? { from: null, to: null }}
                    onChange={(next) => setOne(spec.id, next)}
                    presets={spec.presets}
                  />
                </div>
              );
            case "toggle":
              return (
                <Toggle
                  key={spec.id}
                  size="sm"
                  checked={Boolean(v)}
                  onChange={(next) => setOne(spec.id, next)}
                  label={spec.label}
                />
              );
          }
          const _never: never = spec;
          void _never;
          return null;
        })}
        {onReset && anyActive && (
          <AntButton type="text" size="middle" icon={<CloseOutlined />} onClick={onReset}>
            Reset
          </AntButton>
        )}
      </Space>

      {showActiveChips && anyActive && (
        <Space wrap size={6}>
          {filters.map((spec) => {
            const v = value[spec.id] ?? null;
            if (!isActive(spec, v)) return null;
            return (
              <Chip
                key={spec.id}
                size="sm"
                tone="accent"
                onDelete={() => setOne(spec.id, emptyValueFor(spec))}
              >
                {spec.label}: {describeActive(spec, v)}
              </Chip>
            );
          })}
        </Space>
      )}
    </div>
  );
}

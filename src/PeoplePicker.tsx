import { Form, Select, Spin } from "antd";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Avatar } from "./Avatar";

export interface UserRef {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

export interface PeopleSource {
  search: (query: string) => Promise<UserRef[]>;
  byId?: (ids: string[]) => Promise<UserRef[]>;
}

export interface PeoplePickerCommonProps {
  source: PeopleSource;
  label?: ReactNode;
  placeholder?: string;
  hint?: ReactNode;
  error?: ReactNode;
  disabled?: boolean;
  debounceMs?: number;
}

export interface PeoplePickerProps extends PeoplePickerCommonProps {
  value: UserRef | null;
  onChange: (next: UserRef | null) => void;
}

export interface PeoplePickerMultiProps extends PeoplePickerCommonProps {
  value: UserRef[];
  onChange: (next: UserRef[]) => void;
  max?: number;
}

function OptionLabel({ user }: { user: UserRef }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <Avatar user={user} size="sm" />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {user.name}
        </div>
        {user.email && (
          <div style={{ fontSize: 12, color: "rgba(0,0,0,0.45)", lineHeight: 1.2 }}>{user.email}</div>
        )}
      </div>
    </div>
  );
}

function useAsyncSearch(source: PeopleSource, debounceMs: number) {
  const [query, setQuery] = useState("");
  const [fetched, setFetched] = useState<{ query: string; options: UserRef[] }>({ query: "", options: [] });
  const reqRef = useRef(0);

  const trimmed = query.trim();
  const options = trimmed === fetched.query ? fetched.options : [];
  const loading = trimmed.length > 0 && trimmed !== fetched.query;

  useEffect(() => {
    if (!trimmed || trimmed === fetched.query) return;
    const myReq = ++reqRef.current;
    const t = window.setTimeout(() => {
      source
        .search(trimmed)
        .then((res) => {
          if (myReq !== reqRef.current) return;
          setFetched({ query: trimmed, options: res });
        })
        .catch(() => {
          if (myReq !== reqRef.current) return;
          setFetched({ query: trimmed, options: [] });
        });
    }, debounceMs);
    return () => window.clearTimeout(t);
  }, [trimmed, fetched.query, source, debounceMs]);

  return { setQuery, options, loading };
}

export function PeoplePicker({
  value,
  onChange,
  source,
  label,
  placeholder,
  hint,
  error,
  disabled,
  debounceMs = 180,
}: PeoplePickerProps) {
  const { setQuery, options, loading } = useAsyncSearch(source, debounceMs);
  const [cache, setCache] = useState<Record<string, UserRef>>({});

  useEffect(() => {
    if (value) setCache((c) => ({ ...c, [value.id]: value }));
  }, [value]);

  for (const o of options) {
    if (!cache[o.id]) setCache((c) => ({ ...c, [o.id]: o }));
  }

  const antOptions = useMemo(
    () => options.map((o) => ({ value: o.id, label: <OptionLabel user={o} />, user: o })),
    [options],
  );

  const picker = (
    <Select<string>
      showSearch
      value={value?.id}
      onSearch={setQuery}
      onChange={(id) => onChange(id ? cache[id] ?? null : null)}
      onClear={() => onChange(null)}
      allowClear
      disabled={disabled}
      status={error ? "error" : undefined}
      placeholder={placeholder}
      filterOption={false}
      notFoundContent={loading ? <Spin size="small" /> : "Type to search people"}
      options={antOptions}
      optionLabelProp="user"
      labelRender={(labelProps) => {
        const user = cache[String(labelProps.value)];
        return user ? <OptionLabel user={user} /> : labelProps.label;
      }}
      style={{ width: "100%" }}
    />
  );

  if (!label && !hint && !error) return picker;
  return (
    <Form.Item
      label={label}
      validateStatus={error ? "error" : undefined}
      help={error ?? hint}
      layout="vertical"
      style={{ marginBottom: 0 }}
    >
      {picker}
    </Form.Item>
  );
}

export function PeoplePickerMulti({
  value,
  onChange,
  source,
  label,
  placeholder,
  hint,
  error,
  disabled,
  max,
  debounceMs = 180,
}: PeoplePickerMultiProps) {
  const { setQuery, options, loading } = useAsyncSearch(source, debounceMs);
  const [cache, setCache] = useState<Record<string, UserRef>>({});

  useEffect(() => {
    const next: Record<string, UserRef> = {};
    for (const u of value) next[u.id] = u;
    setCache((c) => ({ ...c, ...next }));
  }, [value]);

  for (const o of options) {
    if (!cache[o.id]) setCache((c) => ({ ...c, [o.id]: o }));
  }

  const selectedIds = useMemo(() => new Set(value.map((u) => u.id)), [value]);
  const antOptions = useMemo(
    () =>
      options
        .filter((o) => !selectedIds.has(o.id))
        .map((o) => ({ value: o.id, label: <OptionLabel user={o} /> })),
    [options, selectedIds],
  );
  const atMax = max !== undefined && value.length >= max;

  const picker = (
    <Select<string[]>
      mode="multiple"
      showSearch
      value={value.map((u) => u.id)}
      onSearch={setQuery}
      onChange={(ids) => {
        if (atMax && ids.length > value.length) return;
        const next = ids.map((id) => cache[id]).filter(Boolean) as UserRef[];
        onChange(next);
      }}
      disabled={disabled}
      status={error ? "error" : undefined}
      placeholder={value.length === 0 ? placeholder : undefined}
      filterOption={false}
      notFoundContent={atMax ? `Max ${max} selected` : loading ? <Spin size="small" /> : "Type to search people"}
      options={antOptions}
      style={{ width: "100%" }}
    />
  );

  if (!label && !hint && !error) return picker;
  return (
    <Form.Item
      label={label}
      validateStatus={error ? "error" : undefined}
      help={error ?? hint}
      layout="vertical"
      style={{ marginBottom: 0 }}
    >
      {picker}
    </Form.Item>
  );
}

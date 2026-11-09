import { SettingOutlined } from "@ant-design/icons";
import { Button, Divider, Input, Modal, Select, Skeleton, Switch, Typography } from "antd";
import { useState } from "react";
import type { ReactNode } from "react";

const { Text } = Typography;

/** Header gradient. */
const GRADIENT = "linear-gradient(135deg, #4a5bba 0%, #4d78d6 60%, #60a5fa 100%)";

// ── Dev settings localStorage helpers (exported for app httpClients) ─────────

function devKey(appId: string, suffix: string) {
  return `orca.${appId}.${suffix}`;
}

export function getDevApiKey(appId: string): string | undefined {
  try {
    return localStorage.getItem(devKey(appId, "devApiKey")) || undefined;
  } catch {
    return undefined;
  }
}

export function setDevApiKey(appId: string, key: string): void {
  try {
    const k = devKey(appId, "devApiKey");
    if (key.trim()) localStorage.setItem(k, key.trim());
    else localStorage.removeItem(k);
  } catch {
    // ignore
  }
}

export function getUseApi(appId: string): boolean {
  try {
    const val = localStorage.getItem(devKey(appId, "useApi"));
    return val === null ? true : val !== "false";
  } catch {
    return true;
  }
}

export function setUseApi(appId: string, val: boolean): void {
  try {
    localStorage.setItem(devKey(appId, "useApi"), String(val));
  } catch {
    // ignore
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SubAppHeaderTab {
  key: string;
  label: string;
  badge?: number | null;
}

export interface SubAppHeaderPreviewOption {
  value: string;
  label: string;
  groupLabel?: string;
  dividerBefore?: boolean;
}

export interface SubAppHeaderProps {
  title: string;
  subtitle?: string;
  homeLink?: ReactNode;
  onTitleClick?: () => void;
  rightSlot?: ReactNode;
  banner?: ReactNode;
  tabs?: SubAppHeaderTab[];
  activeTab?: string | null;
  onTabChange?: (key: string) => void;
  rightSlotLoading?: boolean;
  userEmail?: string;
  userName?: string;
  devSettingsAppId?: string;
  isAdmin?: boolean;
  previewLabel?: string;
  previewOptions?: SubAppHeaderPreviewOption[];
  previewValue?: string | null;
  onPreviewChange?: (value: string | null) => void;
  fullWidth?: boolean;
}

function DevSettingsDialog({ appId, onClose }: { appId: string; onClose: () => void }) {
  const [useApi, setUseApiState] = useState(() => getUseApi(appId));
  const [key, setKey] = useState(() => getDevApiKey(appId) ?? "");

  const save = () => {
    setDevApiKey(appId, useApi ? key : "");
    setUseApi(appId, useApi);
    onClose();
  };

  return (
    <Modal
      open
      onCancel={onClose}
      onOk={save}
      title="Settings"
      okText="Save"
      cancelText="Cancel"
      width={480}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
          <Switch checked={useApi} onChange={setUseApiState} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Use dev API key</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Off = normal session login (cookie auth, same-origin).
            </Text>
          </div>
        </label>
        <div>
          <Text style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>
            X-doublefin-api-key
          </Text>
          <Input.Password
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={!useApi}
            autoComplete="off"
          />
          <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: "block" }}>
            Sent as X-doublefin-api-key through the dev-server proxy.
          </Text>
        </div>
      </div>
    </Modal>
  );
}

function buildPreviewOptions(previewLabel: string | undefined, options: SubAppHeaderPreviewOption[]) {
  const grouped: Array<{ label: string; options: Array<{ value: string; label: string }> }> = [];
  const flat: Array<{ value: string; label: string }> = [{ value: "", label: previewLabel ?? "My view" }];
  let current: (typeof grouped)[number] | null = null;
  for (const opt of options) {
    if (opt.groupLabel) {
      current = { label: opt.groupLabel, options: [] };
      grouped.push(current);
    }
    const flatOpt = { value: opt.value, label: opt.label };
    if (current) current.options.push(flatOpt);
    else flat.push(flatOpt);
  }
  return { grouped, flat };
}

export function SubAppHeader({
  title,
  subtitle,
  homeLink,
  onTitleClick,
  rightSlot,
  banner,
  tabs,
  activeTab,
  onTabChange,
  rightSlotLoading,
  userEmail,
  devSettingsAppId,
  isAdmin,
  previewLabel,
  previewOptions,
  previewValue,
  onPreviewChange,
  fullWidth = false,
}: SubAppHeaderProps) {
  const maxWidth = fullWidth ? undefined : 1152;
  const hasTabs = (tabs?.length ?? 0) > 0;
  const hasRight = rightSlotLoading || userEmail || rightSlot;
  const [devSettingsOpen, setDevSettingsOpen] = useState(false);

  const previewSelectOptions = previewOptions
    ? (() => {
        const built = buildPreviewOptions(previewLabel, previewOptions);
        if (built.grouped.length === 0) return built.flat;
        return [...built.flat, ...built.grouped];
      })()
    : null;

  return (
    <header
      style={{ position: "sticky", top: 0, zIndex: 30, background: GRADIENT, color: "#fff" }}
    >
      <div
        style={{
          margin: "0 auto",
          display: "flex",
          maxWidth,
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          columnGap: 24,
          rowGap: 12,
          padding: "16px 24px 8px",
        }}
      >
        <div style={{ display: "flex", minWidth: 0, alignItems: "center", gap: 8, flex: "1 1 320px" }}>
          {homeLink && <div style={{ flexShrink: 0 }}>{homeLink}</div>}
          <div style={{ minWidth: 0 }}>
            {onTitleClick ? (
              <button
                type="button"
                onClick={onTitleClick}
                style={{
                  cursor: "pointer",
                  border: 0,
                  background: "transparent",
                  padding: 0,
                  textAlign: "left",
                  fontSize: 17,
                  fontWeight: 600,
                  lineHeight: 1.25,
                  letterSpacing: "-0.01em",
                  color: "#fff",
                  fontFamily: "inherit",
                }}
              >
                {title}
              </button>
            ) : (
              <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.25, letterSpacing: "-0.01em", color: "#fff" }}>
                {title}
              </div>
            )}
            {subtitle && (
              <div style={{ marginTop: 2, fontSize: 13, lineHeight: 1.375, color: "rgba(255,255,255,0.65)" }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {hasRight && (
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              flexShrink: 0,
              flexWrap: "wrap",
              alignItems: "center",
              gap: 12,
            }}
          >
            {rightSlotLoading ? (
              <Skeleton.Button active style={{ width: 280, height: 42 }} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                {userEmail && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{userEmail}</span>
                      {devSettingsAppId && (
                        <Button
                          type="text"
                          size="small"
                          icon={<SettingOutlined />}
                          onClick={() => setDevSettingsOpen(true)}
                          style={{ color: "rgba(255,255,255,0.75)" }}
                          title="Dev settings"
                        />
                      )}
                    </div>
                    {isAdmin && previewSelectOptions && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Preview as</span>
                        <Select
                          id="subapp-preview-as"
                          size="small"
                          value={previewValue ?? ""}
                          onChange={(v) => onPreviewChange?.(v === "" ? null : v)}
                          options={previewSelectOptions}
                          style={{ minWidth: 200, maxWidth: 310 }}
                          popupMatchSelectWidth={false}
                        />
                      </div>
                    )}
                  </>
                )}
                {rightSlot}
              </div>
            )}
          </div>
        )}
      </div>

      {banner}

      {hasTabs && (
        <nav aria-label="Primary navigation">
          <div style={{ margin: "0 auto", maxWidth, padding: "0 24px" }}>
            <ul style={{ display: "flex", columnGap: 4, overflowX: "auto", listStyle: "none", margin: 0, padding: 0 }}>
              {tabs!.map((tab) => {
                const isActive = tab.key === activeTab;
                const showBadge = tab.badge != null && tab.badge > 0;
                return (
                  <li key={tab.key} style={{ flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => onTabChange?.(tab.key)}
                      aria-current={isActive ? "page" : undefined}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        whiteSpace: "nowrap",
                        border: 0,
                        borderBottom: `2px solid ${isActive ? "#fff" : "transparent"}`,
                        padding: "6px 12px 10px",
                        fontSize: 14,
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? "#fff" : "rgba(255,255,255,0.65)",
                        fontFamily: "inherit",
                        background: "transparent",
                        cursor: "pointer",
                        transition: "color 0.15s, border-color 0.15s",
                      }}
                    >
                      {tab.label}
                      {showBadge && (
                        <span
                          style={{
                            minWidth: 20,
                            borderRadius: 9999,
                            padding: "1px 6px",
                            textAlign: "center",
                            fontSize: 11,
                            fontWeight: 600,
                            fontVariantNumeric: "tabular-nums",
                            background: isActive ? "#fff" : "rgba(255,255,255,0.15)",
                            color: isActive ? "#1d6ffe" : "rgba(255,255,255,0.80)",
                          }}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <Divider style={{ margin: 0, borderColor: "rgba(255,255,255,0.1)" }} />
        </nav>
      )}

      {devSettingsAppId && devSettingsOpen && (
        <DevSettingsDialog appId={devSettingsAppId} onClose={() => setDevSettingsOpen(false)} />
      )}
    </header>
  );
}

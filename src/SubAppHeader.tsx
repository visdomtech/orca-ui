import { useState } from "react";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import ListSubheader from "@mui/material/ListSubheader";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

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
  } catch {}
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
  } catch {}
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SubAppHeaderTab {
  key: string;
  label: string;
  /** Count shown as a badge pill. Omit, null, or 0 to hide the badge. */
  badge?: number | null;
}

export interface SubAppHeaderPreviewOption {
  value: string;
  label: string;
  /** Renders a ListSubheader before this item. */
  groupLabel?: string;
  /** Renders a top border before this item. */
  dividerBefore?: boolean;
}

export interface SubAppHeaderProps {
  /** Application title shown in the header band. */
  title: string;
  /** Optional subtitle below the title. */
  subtitle?: string;
  /** Home-navigation link rendered before the title. */
  homeLink?: ReactNode;
  /** Called when the title text is clicked. */
  onTitleClick?: () => void;
  /** Extra right-side controls rendered after the built-in identity slot. */
  rightSlot?: ReactNode;
  /** Content rendered between the title row and the tab strip. */
  banner?: ReactNode;
  /** Navigation tabs shown below the title. */
  tabs?: SubAppHeaderTab[];
  /** Active tab key. */
  activeTab?: string | null;
  /** Called when the user selects a tab. */
  onTabChange?: (key: string) => void;

  // ── Built-in identity / preview-as / settings ───────────────────────────
  /** Shows a skeleton placeholder while identity data loads. */
  rightSlotLoading?: boolean;
  /** Logged-in user's email address. */
  userEmail?: string;
  /** Logged-in user's display name (shown above the email). */
  userName?: string;
  /**
   * App identifier used to namespace localStorage keys for the dev settings
   * modal. When provided, the gear icon is shown and manages the modal
   * internally. Pass only in dev builds:
   * `devSettingsAppId={import.meta.env.DEV ? "my-app-id" : undefined}`
   */
  devSettingsAppId?: string;
  /** True when the current user is an admin (shows the Preview-as row). */
  isAdmin?: boolean;
  /** Label for the "my own view" option, e.g. "My view (HR Lead)". */
  previewLabel?: string;
  /** Role/persona options for the Preview-as dropdown. */
  previewOptions?: SubAppHeaderPreviewOption[];
  /** Currently selected preview value; null = own view. */
  previewValue?: string | null;
  /** Called with the new value, or null when switching back to own view. */
  onPreviewChange?: (value: string | null) => void;
}

// ── Dev settings modal ────────────────────────────────────────────────────────

function DevSettingsDialog({ appId, onClose }: { appId: string; onClose: () => void }) {
  const [useApi, setUseApiState] = useState(() => getUseApi(appId));
  const [key, setKey] = useState(() => getDevApiKey(appId) ?? "");

  const save = () => {
    setDevApiKey(appId, useApi ? key : "");
    setUseApi(appId, useApi);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <FormControlLabel
            control={
              <Switch
                checked={useApi}
                onChange={(e) => setUseApiState(e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>Use dev API key</Typography>
                <Typography variant="caption" color="text.secondary">
                  Off = normal session login (cookie auth, same-origin).
                </Typography>
              </Box>
            }
          />
          <TextField
            type="password"
            size="small"
            fullWidth
            label="X-doublefin-api-key"
            value={key}
            disabled={!useApi}
            onChange={(e) => setKey(e.target.value)}
            autoComplete="off"
            helperText="Sent as X-doublefin-api-key through the dev-server proxy."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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
}: SubAppHeaderProps) {
  const hasTabs = (tabs?.length ?? 0) > 0;
  const hasRight = rightSlotLoading || userEmail || rightSlot;
  const [devSettingsOpen, setDevSettingsOpen] = useState(false);

  return (
    <Box
      component="header"
      sx={{ position: "sticky", top: 0, zIndex: 30, background: GRADIENT, color: "#fff" }}
    >
      {/* ── Title row ──────────────────────────────────────────────────── */}
      <Box
        sx={{
          mx: "auto",
          display: "flex",
          maxWidth: 1152,
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          columnGap: 3,
          rowGap: 1.5,
          px: 3,
          pb: 1,
          pt: 2,
        }}
      >
        {/* Left: home link + app title + subtitle */}
        <Box sx={{ display: "flex", minWidth: 0, alignItems: "center", gap: 1, flex: "1 1 320px" }}>
          {homeLink ? (
            <Box sx={{ flexShrink: 0 }}>{homeLink}</Box>
          ) : null}
          <Box sx={{ minWidth: 0 }}>
            {onTitleClick ? (
              <Box
                component="button"
                type="button"
                onClick={onTitleClick}
                sx={{
                  cursor: "pointer",
                  border: 0,
                  bgcolor: "transparent",
                  p: 0,
                  textAlign: "left",
                  fontSize: 17,
                  fontWeight: 600,
                  lineHeight: 1.25,
                  letterSpacing: "-0.01em",
                  color: "#fff",
                  fontFamily: "inherit",
                  "&:hover": { color: "rgba(255,255,255,0.85)" },
                }}
              >
                {title}
              </Box>
            ) : (
              <Box sx={{ fontSize: 17, fontWeight: 600, lineHeight: 1.25, letterSpacing: "-0.01em", color: "#fff" }}>
                {title}
              </Box>
            )}
            {subtitle ? (
              <Box sx={{ mt: 0.25, fontSize: 13, lineHeight: 1.375, color: "rgba(255,255,255,0.65)" }}>
                {subtitle}
              </Box>
            ) : null}
          </Box>
        </Box>

        {/* Right: identity + preview-as + settings */}
        {hasRight ? (
          <Box sx={{ ml: "auto", display: "flex", flexShrink: 0, flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
            {rightSlotLoading ? (
              <Skeleton
                variant="rounded"
                width={280}
                height={42}
                sx={{ bgcolor: "rgba(255,255,255,0.15)" }}
              />
            ) : userEmail ? (
              <Stack direction="column" spacing={0.5} sx={{ alignItems: "flex-end" }}>
                {/* Row 1: name · email + gear */}
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Typography sx={{ display: { xs: "none", lg: "inline" }, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                    {userEmail}
                  </Typography>
                  {devSettingsAppId ? (
                    <IconButton
                      size="small"
                      title="Dev settings"
                      onClick={() => setDevSettingsOpen(true)}
                      sx={{ color: "rgba(255,255,255,0.75)", "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.1)" } }}
                    >
                      <SettingsOutlinedIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                </Stack>
                {/* Row 2: Preview as (admin only) */}
                {isAdmin && previewOptions ? (
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography
                      component="label"
                      htmlFor="subapp-preview-as"
                      sx={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}
                    >
                      Preview as
                    </Typography>
                    <TextField
                      select
                      size="small"
                      id="subapp-preview-as"
                      value={previewValue ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        onPreviewChange?.(v === "" ? null : v);
                      }}
                      sx={{
                        minWidth: 200,
                        maxWidth: 310,
                        "& .MuiOutlinedInput-root": { bgcolor: "#fff", borderRadius: 2, fontSize: 13, height: 32 },
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
                      }}
                      slotProps={{
                        select: {
                          displayEmpty: true,
                          renderValue: (v) =>
                            v === ""
                              ? (previewLabel ?? "My view")
                              : (previewOptions.find((o) => o.value === String(v))?.label ?? String(v)),
                          MenuProps: { slotProps: { paper: { sx: { maxHeight: 440 } } } },
                        },
                      }}
                    >
                      <MenuItem value="" sx={{ fontSize: 13, minHeight: 0, py: 0.75 }}>
                        {previewLabel ?? "My view"}
                      </MenuItem>
                      {previewOptions.flatMap((opt) => [
                        ...(opt.groupLabel ? [
                          <ListSubheader key={`${opt.value}-group`} sx={{ fontSize: 11, lineHeight: "18px", fontWeight: 700, pt: 1.25, pb: 0.25 }}>
                            {opt.groupLabel}
                          </ListSubheader>,
                        ] : []),
                        <MenuItem
                          key={opt.value}
                          value={opt.value}
                          sx={{
                            fontSize: 13,
                            ...(opt.groupLabel ? { pl: 3 } : {}),
                            minHeight: 0,
                            py: opt.groupLabel ? 0.5 : 0.75,
                            ...(opt.dividerBefore ? { borderTop: 1, borderColor: "divider" } : {}),
                          }}
                        >
                          {opt.label}
                        </MenuItem>,
                      ])}
                    </TextField>
                  </Stack>
                ) : null}
              </Stack>
            ) : null}
            {rightSlot}
          </Box>
        ) : null}
      </Box>

      {/* ── Banner slot (inside brand band, above tabs) ─────────────────── */}
      {banner}

      {/* ── Tab strip (inherits header gradient) ────────────────────────── */}
      {hasTabs ? (
        <Box component="nav" aria-label="Primary navigation">
          <Box sx={{ mx: "auto", maxWidth: 1152, px: 3 }}>
            <Box
              component="ul"
              sx={{ display: "flex", columnGap: 0.5, overflowX: "auto", listStyle: "none", m: 0, p: 0 }}
            >
              {tabs!.map((tab) => {
                const isActive = tab.key === activeTab;
                const showBadge = tab.badge != null && tab.badge > 0;
                return (
                  <Box component="li" key={tab.key} sx={{ flexShrink: 0 }}>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => onTabChange?.(tab.key)}
                      aria-current={isActive ? "page" : undefined}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        whiteSpace: "nowrap",
                        border: 0,
                        borderBottom: "2px solid",
                        borderBottomColor: isActive ? "#fff" : "transparent",
                        px: 1.5,
                        pb: 1.25,
                        pt: 0.75,
                        fontSize: 14,
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? "#fff" : "rgba(255,255,255,0.65)",
                        fontFamily: "inherit",
                        bgcolor: "transparent",
                        cursor: "pointer",
                        transition: "color 0.15s, border-color 0.15s",
                        "&:hover": isActive
                          ? {}
                          : { borderBottomColor: "rgba(255,255,255,0.30)", color: "#fff" },
                      }}
                    >
                      {tab.label}
                      {showBadge ? (
                        <Box
                          component="span"
                          sx={{
                            minWidth: 20,
                            borderRadius: 9999,
                            px: 0.75,
                            py: "1px",
                            textAlign: "center",
                            fontSize: 11,
                            fontWeight: 600,
                            fontVariantNumeric: "tabular-nums",
                            bgcolor: isActive ? "#fff" : "rgba(255,255,255,0.15)",
                            color: isActive ? "#1d6ffe" : "rgba(255,255,255,0.80)",
                          }}
                        >
                          {tab.badge}
                        </Box>
                      ) : null}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      ) : null}

      {/* ── Dev settings modal ──────────────────────────────────────────── */}
      {devSettingsAppId && devSettingsOpen ? (
        <DevSettingsDialog appId={devSettingsAppId} onClose={() => setDevSettingsOpen(false)} />
      ) : null}
    </Box>
  );
}

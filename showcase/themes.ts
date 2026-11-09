import { theme as antTheme, type ThemeConfig } from "antd";

import { orcaAntdLightTheme } from "../src/antdTheme";
import { DARK_SURFACE, DARK_TONES, FONT_STACK } from "../src/palette";

export interface ThemePreset {
  id: string;
  label: string;
  description: string;
  config: ThemeConfig;
}

/** Orca — the canonical Chip Palette applied to antd. */
const orca: ThemeConfig = orcaAntdLightTheme;

/** Orca Dark — same palette, dark surfaces and ink. */
const orcaDark: ThemeConfig = {
  algorithm: antTheme.darkAlgorithm,
  token: {
    colorPrimary: DARK_SURFACE.brand,
    colorInfo: DARK_TONES.info.dot,
    colorSuccess: DARK_TONES.success.dot,
    colorWarning: DARK_TONES.warning.dot,
    colorError: DARK_TONES.danger.dot,
    colorBgLayout: DARK_SURFACE.canvas,
    colorBgContainer: DARK_SURFACE.surface,
    colorBgElevated: DARK_SURFACE.surface,
    colorText: DARK_SURFACE.ink,
    colorTextSecondary: DARK_SURFACE.ink2,
    colorBorder: DARK_SURFACE.line,
    colorBorderSecondary: DARK_SURFACE.line,
    borderRadius: 6,
    borderRadiusLG: 10,
    fontFamily: FONT_STACK,
    fontSize: 14,
  },
};

export const THEME_PRESETS: ThemePreset[] = [
  { id: "orca", label: "Orca", description: "Orca Chip Palette — brand #3554E3, warm neutrals, soft tints", config: orca },
  { id: "orca-dark", label: "Orca Dark", description: "Orca Chip Palette — dark surfaces and ink", config: orcaDark },
];

export const DEFAULT_THEME_ID = "orca";

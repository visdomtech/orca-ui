import { theme as antTheme, type ThemeConfig } from "antd";

export interface ThemePreset {
  id: string;
  label: string;
  description: string;
  config: ThemeConfig;
}

/** Ant — Ant Design 5 defaults, light mode. */
const antLight: ThemeConfig = {
  algorithm: antTheme.defaultAlgorithm,
};

/** Ant Dark — Ant Design 5 defaults, dark mode. */
const antDark: ThemeConfig = {
  algorithm: antTheme.darkAlgorithm,
};

export const THEME_PRESETS: ThemePreset[] = [
  { id: "ant", label: "Ant", description: "Ant Design 5 — light mode", config: antLight },
  { id: "ant-dark", label: "Ant Dark", description: "Ant Design 5 — dark mode", config: antDark },
];

export const DEFAULT_THEME_ID = "ant";

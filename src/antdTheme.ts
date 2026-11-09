/**
 * Shared antd ConfigProvider theme that applies the Orca Chip Palette tokens.
 * Sub-apps import this and pass it to `<ConfigProvider theme={orcaAntdTheme}>`
 * so every antd-rendered primitive (Button, Input, Select, Table, …) picks
 * up the same brand blue, canvas, surface, ink, and font stack.
 *
 * Tone-specific accents (success/warning/danger/info/accent) match the chip
 * palette's `dot` colors so antd Alerts and Status components visually align
 * with orca-ui's Chip and Banner.
 */

import type { ThemeConfig } from "antd";

import { FONT_STACK, LIGHT_SURFACE, LIGHT_TONES } from "./palette";

export const orcaAntdLightTheme: ThemeConfig = {
  token: {
    // Brand blue — the one strong color. Use for primary buttons, focus rings, links.
    colorPrimary: LIGHT_SURFACE.brand,
    colorInfo: LIGHT_TONES.info.dot,
    colorSuccess: LIGHT_TONES.success.dot,
    colorWarning: LIGHT_TONES.warning.dot,
    colorError: LIGHT_TONES.danger.dot,

    // Surfaces & ink.
    colorBgLayout: LIGHT_SURFACE.canvas,
    colorBgContainer: LIGHT_SURFACE.surface,
    colorBgElevated: LIGHT_SURFACE.surface,
    colorText: LIGHT_SURFACE.ink,
    colorTextSecondary: LIGHT_SURFACE.ink2,
    colorBorder: LIGHT_SURFACE.line,
    colorBorderSecondary: LIGHT_SURFACE.line,

    // Chrome.
    borderRadius: 6,
    borderRadiusLG: 10,
    fontFamily: FONT_STACK,
    fontSize: 14,

    // Soft shadow consistent with the palette doc's panel style.
    boxShadow: "0 1px 2px rgba(27, 26, 23, 0.04), 0 2px 8px rgba(27, 26, 23, 0.04)",
    boxShadowSecondary: "0 1px 2px rgba(27, 26, 23, 0.04)",
  },
  components: {
    Button: {
      // Match chip solid's weight (600) when primary; inherit elsewhere.
      fontWeight: 500,
      primaryShadow: "none",
      defaultShadow: "none",
    },
    Table: {
      headerBg: LIGHT_SURFACE.canvas,
      headerColor: LIGHT_SURFACE.ink,
      headerSplitColor: LIGHT_SURFACE.line,
      borderColor: LIGHT_SURFACE.line,
    },
    Card: {
      colorBorderSecondary: LIGHT_SURFACE.line,
    },
    Tag: {
      // antd Tag inherits the palette tones automatically via colorSuccess etc.
    },
  },
};

import type { CSSProperties, ReactElement, ReactNode } from "react";

import { LIGHT_SURFACE, LIGHT_TONES, type Tone } from "./palette";

export type ChipTone = Tone;
export type ChipVariant = "tint" | "dot" | "solid";
export type ChipSize = "sm" | "md";

export interface ChipProps {
  tone?: ChipTone;
  /**
   * `tint` (default): pale background + mid-tone text.
   * `dot`: surface + hairline border + colored dot (for dense tables).
   * `solid`: strong fill (reserved for the one call-to-action per screen).
   */
  variant?: ChipVariant;
  size?: ChipSize;
  icon?: ReactElement;
  children: ReactNode;
  onDelete?: () => void;
  onClick?: () => void;
}

/** Re-export the light tone triples for callers that render tone-aware chrome inline. */
export const CHIP_PALETTE = LIGHT_TONES;

const SIZE: Record<ChipSize, { fontSize: number; lineHeight: number; padding: string; gap: number; iconSize: number }> = {
  sm: { fontSize: 12, lineHeight: 16, padding: "2px 7px", gap: 5, iconSize: 12 },
  md: { fontSize: 13, lineHeight: 18, padding: "3px 9px", gap: 6, iconSize: 12 },
};

export function Chip({
  tone = "neutral",
  variant = "tint",
  size = "md",
  icon,
  children,
  onDelete,
  onClick,
}: ChipProps) {
  const palette = LIGHT_TONES[tone];
  const sz = SIZE[size];

  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: sz.gap,
    fontSize: sz.fontSize,
    lineHeight: `${sz.lineHeight}px`,
    padding: sz.padding,
    fontWeight: variant === "solid" ? 600 : 500,
    letterSpacing: "0.005em",
    borderRadius: 6,
    whiteSpace: "nowrap",
    cursor: onClick ? "pointer" : "default",
    userSelect: "none",
  };

  let variantStyle: CSSProperties;
  switch (variant) {
    case "dot":
      variantStyle = {
        background: LIGHT_SURFACE.surface,
        color: LIGHT_SURFACE.ink,
        boxShadow: `inset 0 0 0 1px ${LIGHT_SURFACE.line}`,
      };
      break;
    case "solid":
      variantStyle = {
        background: palette.dot,
        color: palette.solidFg,
      };
      break;
    case "tint":
    default:
      variantStyle = {
        background: palette.tint,
        color: palette.fg,
      };
  }

  const iconColor = variant === "solid" ? palette.solidFg : palette.fg;
  const iconWrap: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: sz.iconSize,
    height: sz.iconSize,
    color: iconColor,
    flex: "none",
  };

  return (
    <span style={{ ...base, ...variantStyle }} onClick={onClick}>
      {variant === "dot" && (
        <span
          aria-hidden
          style={{ width: 6, height: 6, borderRadius: "50%", background: palette.dot, flex: "none" }}
        />
      )}
      {icon && <span style={iconWrap} aria-hidden>{icon}</span>}
      <span>{children}</span>
      {onDelete && (
        <button
          type="button"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            all: "unset",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.55,
            borderRadius: 3,
            marginRight: -2,
            marginLeft: 2,
            color: "currentColor",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.55")}
        >
          <svg
            width={sz.fontSize - 2}
            height={sz.fontSize - 2}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      )}
    </span>
  );
}

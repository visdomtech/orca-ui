import Paper from "@mui/material/Paper";
import type { ReactNode } from "react";

/** Dramatic glassmorphism surface wrapper.
 *  Visibly translucent white + backdrop-filter blur(20px) + prismatic double-border
 *  (outer white + inner highlight) + depth shadow for floating appearance.
 *  Reads hairline token from theme.divider. Use for cards, hero bands,
 *  metric tiles, and section nav in the Liquid Metal design system.
 *  Must look visibly glassy, not white. */
export interface GlassCardProps {
  children: ReactNode;
  /** Padding. Defaults to 2.5 (20px). */
  padding?: number;
  /** Border radius. Defaults to 2 (16px). */
  borderRadius?: number;
  /** Additional sx props merged onto the root Paper. */
  sx?: Record<string, unknown>;
}

export function GlassCard({
  children,
  padding = 2.5,
  borderRadius = 2,
  sx,
}: GlassCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: padding,
        borderRadius,
        bgcolor: "var(--lm-glass-bg, rgba(255,255,255,0.45))",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid",
        borderColor: "var(--lm-glass-border, rgba(255,255,255,0.6))",
        boxShadow:
          "var(--lm-glass-shadow, inset 0 1px 0 rgba(255,255,255,0.8), 0 8px 32px -4px rgba(15,23,42,0.08), 0 2px 8px -2px rgba(91,108,255,0.06))",
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}

import Paper from "@mui/material/Paper";
import type { ReactNode } from "react";

/** Glassmorphism surface wrapper.
 *  Translucent white + backdrop-filter blur + 1px inner highlight.
 *  Reads hairline token from theme.divider. Use for cards and hero bands
 *  in the Liquid Metal design system. */
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
        bgcolor: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
        position: "relative",
        overflow: "hidden",
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}

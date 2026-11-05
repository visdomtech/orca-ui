import type { CSSProperties, ReactNode } from "react";

export interface GlassCardProps {
  children: ReactNode;
  /** Padding in px. Defaults to 20. */
  padding?: number;
  /** Border radius in px. Defaults to 16. */
  borderRadius?: number;
  style?: CSSProperties;
}

export function GlassCard({ children, padding = 20, borderRadius = 16, style }: GlassCardProps) {
  return (
    <div
      style={{
        padding,
        borderRadius,
        background: "var(--lm-glass-bg, rgba(255,255,255,0.45))",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--lm-glass-border, rgba(255,255,255,0.6))",
        boxShadow:
          "var(--lm-glass-shadow, inset 0 1px 0 rgba(255,255,255,0.8), 0 8px 32px -4px rgba(15,23,42,0.08), 0 2px 8px -2px rgba(91,108,255,0.06))",
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

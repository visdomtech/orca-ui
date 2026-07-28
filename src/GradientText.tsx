import Box from "@mui/material/Box";
import type { ElementType, ReactNode } from "react";

/** Chrome text gradient sweep for display headlines.
 *  Renders text with a metallic silver gradient using background-clip: text.
 *  Use sparingly on display headlines (h1-h2) - body text stays solid. */
export interface GradientTextProps {
  children: ReactNode;
  /** CSS gradient string. Defaults to a chrome silver sweep. */
  gradient?: string;
  /** HTML element or MUI variant to render. Defaults to "span". */
  component?: ElementType;
  /** Additional sx props merged onto the root Box. */
  sx?: Record<string, unknown>;
}

const DEFAULT_GRADIENT =
  "linear-gradient(135deg, #1e293b 0%, #64748b 50%, #94a3b8 100%)";

export function GradientText({
  children,
  gradient = DEFAULT_GRADIENT,
  component = "span",
  sx,
}: GradientTextProps) {
  return (
    <Box
      component={component}
      sx={{
        display: "inline-block",
        background: gradient,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

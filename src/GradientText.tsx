import type { CSSProperties, ElementType, ReactNode } from "react";

/** Specular chrome text gradient sweep for display headlines. */
export interface GradientTextProps {
  children: ReactNode;
  gradient?: string;
  component?: ElementType;
  style?: CSSProperties;
}

const DEFAULT_GRADIENT =
  "linear-gradient(135deg, #1e293b 0%, #475569 20%, #94a3b8 40%, #e2e8f0 50%, #94a3b8 60%, #475569 80%, #1e293b 100%)";

export function GradientText({
  children,
  gradient = DEFAULT_GRADIENT,
  component: Component = "span",
  style,
}: GradientTextProps) {
  return (
    <Component
      style={{
        display: "inline-block",
        background: gradient,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        color: "transparent",
        ...style,
      }}
    >
      {children}
    </Component>
  );
}

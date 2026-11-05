import type { CSSProperties } from "react";

/** Vivid ambient gradient background layer. The host app must import the liquid CSS file for animations to work. */
export interface AmbientBackgroundProps {
  style?: CSSProperties;
}

export function AmbientBackground({ style }: AmbientBackgroundProps) {
  return (
    <div className="lm-ambient" aria-hidden style={style}>
      <div className="lm-ambient__blob lm-ambient__blob--silver" />
      <div className="lm-ambient__blob lm-ambient__blob--accent" />
      <div className="lm-ambient__blob lm-ambient__blob--highlight" />
      <div className="lm-ambient__blob lm-ambient__blob--rose" />
      <div className="lm-ambient__noise" />
    </div>
  );
}

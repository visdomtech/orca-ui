import Box from "@mui/material/Box";

/** Vivid ambient gradient background layer.
 *  Renders behind content (z-index: -1, pointer-events: none).
 *  Four gradient blobs (silver, accent, highlight, rose) at 12-18% opacity
 *  with blur(100px), drifting via CSS keyframes.
 *  Uses CSS classes from the liquid.css file (lm-ambient, lm-ambient__blob, etc.).
 *  The host app must import the liquid CSS file for animations to work. */
export interface AmbientBackgroundProps {
  /** Additional sx props merged onto the root container. */
  sx?: Record<string, unknown>;
}

export function AmbientBackground({ sx }: AmbientBackgroundProps) {
  return (
    <Box className="lm-ambient" aria-hidden sx={sx}>
      <Box className="lm-ambient__blob lm-ambient__blob--silver" />
      <Box className="lm-ambient__blob lm-ambient__blob--accent" />
      <Box className="lm-ambient__blob lm-ambient__blob--highlight" />
      <Box className="lm-ambient__blob lm-ambient__blob--rose" />
      <Box className="lm-ambient__noise" />
    </Box>
  );
}

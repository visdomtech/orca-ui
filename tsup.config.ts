import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/roleAuditPrompt.ts"],
  format: ["esm"],
  dts: true,
  treeshake: true,
  external: [
    "react",
    "react-dom",
    "react-router",
    "@mui/material",
    "@mui/icons-material",
    "@mui/system",
    "@emotion/react",
    "@emotion/styled",
    "@tanstack/react-query",
  ],
  sourcemap: true,
  clean: true,
});

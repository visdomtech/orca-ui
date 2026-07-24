import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
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
  ],
  sourcemap: true,
  clean: true,
});

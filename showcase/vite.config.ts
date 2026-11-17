import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: here,
  base: process.env.SHOWCASE_DEPLOY === "docs" ? "/showcase/" : "/",
  plugins: [react()],
  server: { port: 5178, open: false },
  resolve: {
    alias: {
      // Order matters: more specific subpath first so "@orca-ui" doesn't
      // shadow "@orca-ui/org-chart".
      "@orca-ui/org-chart": fileURLToPath(new URL("../src/OrgChart.tsx", import.meta.url)),
      "@orca-ui": fileURLToPath(new URL("../src", import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL("./dist", import.meta.url)),
    emptyOutDir: true,
  },
});

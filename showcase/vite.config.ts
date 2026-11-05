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
      "@orca-ui": fileURLToPath(new URL("../src", import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL("./dist", import.meta.url)),
    emptyOutDir: true,
  },
});

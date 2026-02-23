import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { readFileSync } from "node:fs";

// Read version from the single source of truth so __APP_VERSION__ in the
// compiled bundle always matches package.json without any manual step.
const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8")
) as { version: string };

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative paths for Safari Web Extension compatibility
  base: "./",
  define: {
    // Replace every occurrence of __APP_VERSION__ in source with the literal
    // version string at build time.
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    rollupOptions: {
      input: {
        panel: resolve(__dirname, "panel.html"),
        devtools: resolve(__dirname, "devtools.html"),
      },
      output: {
        entryFileNames: () => {
          return `assets/[name].js`;
        },
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
      },
    },
  },
});

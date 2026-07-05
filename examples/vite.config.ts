import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// The demo consumes the library straight from ../src so it always reflects
// the working tree. dedupe forces every module (including ../src) to resolve
// react/pixi/leaflet from examples/node_modules — without it the library
// source would pick up the root repo's copies and React would be duplicated.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  resolve: {
    alias: {
      "react-leaflet-pixi-overlay": fileURLToPath(
        new URL("../src/index.ts", import.meta.url),
      ),
    },
    dedupe: [
      "react",
      "react-dom",
      "react-leaflet",
      "leaflet",
      "pixi.js",
      "supercluster",
    ],
  },
});

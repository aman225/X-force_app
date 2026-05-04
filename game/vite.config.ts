import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/ThunderSlash.ts",
      name: "ThunderSlash",
      fileName: "thunder-slash",
      formats: ["es", "umd"],
    },
    rollupOptions: {
      external: ["pixi.js"],
      output: {
        globals: {
          "pixi.js": "PIXI",
        },
      },
    },
  },
  server: {
    port: 5173,
    open: "/index.html",
  },
});

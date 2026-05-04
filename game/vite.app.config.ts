import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // When deploying to Vercel, we want a standard web app build, NOT library mode.
    outDir: "dist",
  },
});

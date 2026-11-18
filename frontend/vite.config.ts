import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The API runs on :3001 (npm run dev -w backend). Brand assets (yak, wordmark, favicon) are served
// straight from design/assets, so the design system stays the single source.
export default defineConfig({
  plugins: [react()],
  publicDir: "../design/assets",
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:3001",
      "/runs": "http://localhost:3001",
    },
  },
});

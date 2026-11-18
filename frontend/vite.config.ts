import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The API runs on :3001 (npm run dev -w backend). Brand assets (yak, wordmark, favicon) are served
// straight from design/assets, so the design system stays the single source.
// A second checkout can run side by side with API_PORT=3018 WEB_PORT=5181 (both default as below).
const api = `http://localhost:${process.env.API_PORT || "3001"}`;
const webPort = Number(process.env.WEB_PORT || 5180);

export default defineConfig({
  plugins: [react()],
  publicDir: "../design/assets",
  server: {
    port: webPort,
    strictPort: true,
    proxy: {
      "/api": api,
      "/runs": api,
    },
  },
  // npm run demo serves the built demo site (demo-site/) here, as the public link serves it.
  preview: { port: webPort, strictPort: true },
});

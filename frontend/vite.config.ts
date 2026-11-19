import { readdirSync } from "node:fs";
import { normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// The API runs on :3001 (npm run dev -w backend). Brand assets (yak, wordmark, favicon) are served
// straight from design/assets, so the design system stays the single source.
// A second checkout can run side by side with API_PORT=3018 WEB_PORT=5181 (both default as below).
const api = `http://localhost:${process.env.API_PORT || "3001"}`;
const webPort = Number(process.env.WEB_PORT || 5180);

// ---------- live web only (npm run live sets VITE_LIVE=1); npm run dev and the demo build never use these ----------
const live = process.env.VITE_LIVE === "1";
const SCREEN_FILE = normalize(fileURLToPath(new URL("../video-template/src/locked/stage/Screen.tsx", import.meta.url)));
const SCREEN_SCENES = fileURLToPath(new URL("./src/live/player/screen-scenes.ts", import.meta.url));
const TEMPLATE_PUBLIC_DIR = fileURLToPath(new URL("../video-template/public/", import.meta.url));

/**
 * Gives the locked Screen the live web's scene slots (src/live/player/screen-scenes.ts) instead of the
 * template's SCENES, so a part can be swapped while the Player plays. Only that one import of that one
 * file is redirected: the template's files stay untouched and the MP4 render (webpack) never sees this.
 */
const liveScreenScenes = (): Plugin => ({
  name: "sherpas-live-screen-scenes",
  enforce: "pre",
  resolveId(source, importer) {
    if (source !== "../../scenes" || !importer) return null;
    return normalize(importer.split("?")[0]) === SCREEN_FILE ? SCREEN_SCENES : null;
  },
});

/**
 * The template's music and sound effects: the locked Soundtrack asks for `staticFile("music/…")`, which the
 * Player resolves to /music/… on this origin. The live API serves `video-template/public`: proxy each folder.
 */
const templatePublicProxy = (): Record<string, string> =>
  Object.fromEntries(
    readdirSync(TEMPLATE_PUBLIC_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => [`/${entry.name}`, api]),
  );

export default defineConfig({
  plugins: live ? [react(), liveScreenScenes()] : [react()],
  publicDir: "../design/assets",
  server: {
    port: webPort,
    strictPort: true,
    proxy: {
      "/api": api,
      "/runs": api,
      ...(live ? templatePublicProxy() : {}),
    },
  },
  // npm run demo serves the built demo site (demo-site/) here, as the public link serves it.
  preview: { port: webPort, strictPort: true },
});

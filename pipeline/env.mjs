// Loads .env from the repo root (Node 22+), so every script can just import this file.
// Keys stay on this machine: nothing here is ever sent to the browser.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const CASES_DIR = join(ROOT, "cases");
export const EPISODES_DIR = join(ROOT, "web", "episodes");

const envFile = join(ROOT, ".env");
if (existsSync(envFile)) {
  try {
    process.loadEnvFile(envFile);
  } catch (err) {
    console.warn(`Could not read .env: ${err.message}`);
  }
}

export const env = {
  MCP_URL: process.env.MCP_URL || "https://mcp-hackathon.sherpaswealth.com/mcp",
  MCP_TOKEN: process.env.MCP_TOKEN || "",
  LLM_PROXY_URL: (process.env.LLM_PROXY_URL || "https://llm-hackathon.sherpaswealth.com").replace(/\/$/, ""),
  TEAM_KEY: process.env.TEAM_KEY || "",
  TEXT_MODEL: process.env.TEXT_MODEL || "gpt-5-mini",
  TTS_MODEL: process.env.TTS_MODEL || "eleven-flash-v2.5",
  TTS_VOICE: process.env.TTS_VOICE || "alloy",
  PAGES_BASE_URL: (process.env.PAGES_BASE_URL || "https://zzuazo.github.io/ausiasteam").replace(/\/$/, ""),
};

export const hasKey = (v) => Boolean(v) && !v.includes("...");

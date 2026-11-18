// Paths and settings. Keys live only in the repo-root .env: never in the frontend, never in git.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CASES_DIR = join(ROOT, "cases");
export const RUNS_DIR = join(ROOT, "runs");
export const PROMPTS_DIR = join(ROOT, "prompts");
export const TEMPLATE_DIR = join(ROOT, "video-template");

const envFile = join(ROOT, ".env");
if (existsSync(envFile)) {
  try {
    process.loadEnvFile(envFile);
  } catch (err) {
    console.warn(`Could not read .env: ${(err as Error).message}`);
  }
}

const has = (v?: string) => Boolean(v) && !v!.includes("...");

export const env = {
  /** Its own name, not PORT: dev servers set PORT for the frontend. */
  API_PORT: Number(process.env.API_PORT ?? 3001),
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY ?? "",
  ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID ?? "",
  ELEVENLABS_MODEL: process.env.ELEVENLABS_MODEL ?? "eleven_flash_v2_5",
  /** "1" lets step 2 call `claude -p` (needs the Claude Code CLI on this machine). */
  USE_CLAUDE: process.env.USE_CLAUDE === "1",
  /**
   * Demo pacing: the whole job takes at least this long, so the wait screen and its yak run have
   * time to be seen. 0 = as fast as the machine goes.
   */
  DEMO_MS: Number(process.env.DEMO_MS ?? 8000),
};

export const hasTts = () => has(env.ELEVENLABS_API_KEY) && has(env.ELEVENLABS_VOICE_ID);

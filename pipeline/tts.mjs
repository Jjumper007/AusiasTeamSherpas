// Text to speech through the hackathon proxy (OpenAI-compatible /v1/audio/speech, ElevenLabs models).
// Files are named by a hash of model + voice + text, so the same line is never paid for twice.
// Budget: ElevenLabs is capped at $1.40 per team (about 40 min with eleven-flash-v2.5).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { env, hasKey } from "./env.mjs";

export const ttsEnabled = () => hasKey(env.TEAM_KEY);

export function audioName(text) {
  return createHash("sha1").update(`${env.TTS_MODEL}|${env.TTS_VOICE}|${text}`).digest("hex").slice(0, 16) + ".mp3";
}

/** Writes the mp3 to outPath unless it already exists. Returns "cached" | "created". */
export async function speak(text, outPath) {
  if (existsSync(outPath)) return "cached";
  const res = await fetch(`${env.LLM_PROXY_URL}/v1/audio/speech`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.TEAM_KEY}` },
    body: JSON.stringify({ model: env.TTS_MODEL, voice: env.TTS_VOICE, input: text, response_format: "mp3" }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
  return "created";
}

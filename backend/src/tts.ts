// Step 3 (SPEC §5.3): one audio file per scene with ElevenLabs /with-timestamps, cached by a hash of the
// text, so a line is never paid for twice. The character timings drive the subtitles.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { env, RUNS_DIR } from "./env.js";

export interface Voiced {
  file: string;
  seconds: number;
  alignment: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] } | null;
}

const CACHE = join(RUNS_DIR, ".cache", "tts");

export async function speak(text: string): Promise<Voiced> {
  const id = createHash("sha1").update(`${env.ELEVENLABS_MODEL}|${env.ELEVENLABS_VOICE_ID}|${text}`).digest("hex").slice(0, 16);
  const mp3 = join(CACHE, `${id}.mp3`), meta = join(CACHE, `${id}.json`);
  if (existsSync(mp3) && existsSync(meta)) return { file: mp3, ...JSON.parse(readFileSync(meta, "utf8")) };

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${env.ELEVENLABS_VOICE_ID}/with-timestamps`, {
    method: "POST",
    headers: { "content-type": "application/json", "xi-api-key": env.ELEVENLABS_API_KEY },
    body: JSON.stringify({ text, model_id: env.ELEVENLABS_MODEL }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { audio_base64: string; alignment: Voiced["alignment"] };
  const seconds = data.alignment?.character_end_times_seconds.at(-1) ?? 0;
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(mp3, Buffer.from(data.audio_base64, "base64"));
  writeFileSync(meta, JSON.stringify({ seconds, alignment: data.alignment }));
  return { file: mp3, seconds, alignment: data.alignment };
}

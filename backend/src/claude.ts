// Step 2 (SPEC §5.2): Claude writes the script with `claude -p`, from prompts/script.md.
// The answer must parse as JSON, pass ScriptSchema and the figure check; otherwise we retry with the errors.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PROMPTS_DIR } from "./env.js";

/** Runs `claude -p` with the prompt on stdin and returns its text output. */
export function claudePrint(prompt: string, { cwd, allowedTools, timeoutMs = 240_000 }: { cwd?: string; allowedTools?: string; timeoutMs?: number } = {}): Promise<string> {
  const args = ["-p", "--output-format", "text", ...(allowedTools ? ["--allowedTools", allowedTools] : [])];
  return new Promise((resolve, reject) => {
    const child = spawn("claude", args, { cwd, shell: process.platform === "win32", stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error("claude -p timed out")); }, timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(timer);
      code === 0 ? resolve(out) : reject(new Error(`claude -p exited ${code}: ${err.slice(0, 300)}`));
    });
    child.stdin.end(prompt);
  });
}

/** Fills {{MARKERS}} in a prompt file. */
export function prompt(file: string, vars: Record<string, string>): string {
  const text = readFileSync(join(PROMPTS_DIR, file), "utf8");
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (_, k: string) => vars[k] ?? "");
}

/** The first {...} block in a model answer (it may wrap the JSON in prose or a code fence). */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("no JSON object in the answer");
  return JSON.parse(text.slice(start, end + 1));
}

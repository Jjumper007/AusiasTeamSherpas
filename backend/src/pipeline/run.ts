// The pipeline (SPEC §5): survey + case -> [1] brief + facts.ts -> [2] script -> [3] voice -> [4] scenes (TSX)
// -> [5] checks -> [6] retries / fallback -> [7] MP4. Each step reports to the job, so the wait screen
// shows real progress. Outputs go to runs/<caseId>/<member>/<timestamp>/.
import { copyFileSync, existsSync, mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join, relative } from "node:path";
import { env, hasTts, ROOT, RUNS_DIR, TEMPLATE_DIR } from "../env.js";
import { loadCase } from "../cases.js";
import { buildPlan, factsTs, type Plan } from "../facts.js";
import { buildBrief, briefSize } from "../brief.js";
import { contextFor, estimateSeconds, ScriptSchema, writeFallbackScript, type Script, type ScriptContext } from "../script.js";
import { checkFigures, checkScript, type Check } from "../validate.js";
import { speak } from "../tts.js";
import { claudePrint, extractJson, prompt } from "../claude.js";
import { emit, type Job } from "./jobs.js";

export interface JobResult {
  runId: string;
  caseId: string;
  member: string;
  name: string;
  partner: string | null;
  explain: ScriptContext["explain"];
  decision: ScriptContext["decision"];
  source: "claude" | "fallback";
  /** The rendered MP4, once the video template renders. null: the frontend plays the script preview. */
  videoUrl: string | null;
  scenes: { part: string; narration: string; visualIdea: string; start: number; seconds: number; audioUrl: string | null }[];
  chapters: { title: string; body: string; start: number }[];
  duration: number;
  cta: Script["cta"];
  firstStep: { title: string; action: string | null; effort: string | null; before: number; after: number; lift: number };
  /** "Why this number?": the facts behind the video, exact. */
  detail: { key: string; label: string; exact: string }[];
  checks: Check[];
  notes: string[];
}

const STEPS = [
  { id: "brief", label: "Reading your plan" },
  { id: "script", label: "Writing your script" },
  { id: "voice", label: "Recording the voice" },
  { id: "scenes", label: "Animating the scenes" },
  { id: "checks", label: "Checking every number" },
  { id: "render", label: "Rendering your video" },
] as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const url = (file: string) => `/${relative(ROOT, file).split("\\").join("/")}`;

export async function runJob(job: Job): Promise<void> {
  const { caseId, member, survey } = job.request;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = join(RUNS_DIR, caseId, member, stamp);
  mkdirSync(dir, { recursive: true });
  const log = (line: string) => appendFileSync(join(dir, "log.txt"), `${new Date().toISOString()} ${line}\n`);
  writeFileSync(join(dir, "survey.json"), JSON.stringify(survey, null, 2));

  // Demo pacing: each step lasts at least DEMO_MS / steps, and a ticker moves the bar in between.
  const stepMin = env.DEMO_MS / STEPS.length;
  let at = 0, stepStart = Date.now();
  const tick = setInterval(() => {
    const frac = stepMin ? Math.min(1, (Date.now() - stepStart) / stepMin) : 0.5;
    const p = Math.min(0.99, (at + frac * 0.95) / STEPS.length);
    const left = stepMin ? Math.max(0, Math.ceil(((STEPS.length - at - frac) * stepMin) / 1000)) : null;
    emit(job, { type: "progress", p, step: STEPS[Math.min(at, STEPS.length - 1)].label, left });
  }, 150);

  async function step<T>(i: number, fn: () => Promise<T> | T): Promise<T> {
    at = i; stepStart = Date.now();
    const s = STEPS[i];
    emit(job, { type: "step", index: i, total: STEPS.length, id: s.id, label: s.label, status: "running" });
    try {
      const out = await fn();
      const rest = stepMin - (Date.now() - stepStart);
      if (rest > 0) await sleep(rest);
      return out;
    } catch (err) {
      emit(job, { type: "step", index: i, total: STEPS.length, id: s.id, label: s.label, status: "failed", note: (err as Error).message });
      throw err;
    }
  }
  const done = (i: number, status: "done" | "skipped" = "done", note?: string) => {
    const s = STEPS[i];
    log(`[${s.id}] ${status}${note ? `: ${note}` : ""}`);
    emit(job, { type: "step", index: i, total: STEPS.length, id: s.id, label: s.label, status, note });
  };

  try {
    const notes: string[] = [];

    // [1] Brief + facts.ts
    const { plan, ctx, brief } = await step(0, () => {
      const plan: Plan = buildPlan(loadCase(caseId));
      const ctx = contextFor(plan, member, survey);
      const brief = buildBrief(ctx);
      writeFileSync(join(dir, "brief.md"), brief);
      writeFileSync(join(dir, "facts.ts"), factsTs(plan.facts));
      return { plan, ctx, brief };
    });
    done(0, "done", `${Object.keys(plan.facts).length} facts, brief ${(briefSize(brief) / 1024).toFixed(1)} KB`);

    // [2] Script: Claude when enabled, with up to 3 tries; the plan-only script otherwise.
    let source = "fallback" as JobResult["source"];
    const script = await step(1, async () => {
      if (!env.USE_CLAUDE) return writeFallbackScript(ctx);
      let errors = "";
      for (let tryNo = 1; tryNo <= 3; tryNo++) {
        try {
          const text = await claudePrint(prompt("script.md", { BRIEF: brief, ERRORS: errors }));
          const parsed = ScriptSchema.parse(extractJson(text));
          const bad = [...parsed.scenes.map((s) => s.narration), ...parsed.chapters.map((c) => c.body), parsed.cta.text].flatMap((t) => checkFigures(t, plan.facts));
          if (bad.length) throw new Error(`numbers not in the plan: ${[...new Set(bad)].join(", ")}`);
          source = "claude";
          return { ...parsed, cta: { ...parsed.cta, type: ctx.decision } }; // the survey answer decides the CTA
        } catch (err) {
          errors = `Your previous answer was rejected: ${(err as Error).message}. Fix it and answer with the JSON only.`;
          log(`[script] try ${tryNo} failed: ${(err as Error).message}`);
        }
      }
      notes.push("Claude's script failed the checks 3 times: the plan-only script was used.");
      return writeFallbackScript(ctx);
    });
    writeFileSync(join(dir, "script.json"), JSON.stringify(script, null, 2));
    done(1, "done", source === "claude" ? "written by Claude" : "plan-only script (Claude off)");

    // [3] Voice: ElevenLabs when the key is set; otherwise timings are estimated from the words.
    const voiced = await step(2, async () => {
      if (!hasTts()) return script.scenes.map((s) => ({ seconds: estimateSeconds(s.narration), audioUrl: null as string | null }));
      mkdirSync(join(dir, "audio"), { recursive: true });
      const out = [];
      for (const [i, s] of script.scenes.entries()) {
        const v = await speak(s.narration);
        const file = join(dir, "audio", `scene-${i + 1}.mp3`);
        copyFileSync(v.file, file);
        writeFileSync(join(dir, "audio", `scene-${i + 1}.json`), JSON.stringify(v.alignment));
        out.push({ seconds: v.seconds + 0.35, audioUrl: url(file) });
      }
      return out;
    });
    done(2, hasTts() ? "done" : "skipped", hasTts() ? undefined : "no ELEVENLABS_API_KEY: timings estimated");

    // [4] Scenes (TSX by claude -p in a sandboxed copy of video-template/): not wired yet.
    await step(3, () => undefined);
    done(3, "skipped", existsSync(TEMPLATE_DIR) ? "video-template found, TSX step not wired yet" : "video-template/ not in the repo yet");

    // [5] Checks
    const seconds = voiced.map((v) => v.seconds);
    const checks = await step(4, () => checkScript(script, plan.facts, seconds));
    writeFileSync(join(dir, "checks.json"), JSON.stringify(checks, null, 2));
    const failed = checks.filter((c) => !c.ok);
    done(4, "done", failed.length ? `warnings: ${failed.map((c) => `${c.name} (${c.detail})`).join("; ")}` : "all passed");
    if (failed.some((c) => c.name === "figures" || c.name === "facts used")) throw new Error(`figure check failed: ${failed.map((c) => c.detail).join("; ")}`);

    // [7] MP4: a pre-rendered demo video if there is one (runs/demo/<case>/<member>.mp4).
    const demo = join(RUNS_DIR, "demo", caseId, `${member}.mp4`);
    const videoUrl = await step(5, () => (existsSync(demo) ? url(demo) : null));
    done(5, videoUrl ? "done" : "skipped", videoUrl ? "pre-rendered demo video" : "no renderer yet: the player shows the script preview");

    let t = 0;
    const scenes = script.scenes.map((s, i) => {
      const start = t;
      t += voiced[i].seconds;
      return { ...s, start, seconds: voiced[i].seconds, audioUrl: voiced[i].audioUrl };
    });
    const m = ctx.move;
    const detailKeys = [...new Set([...(ctx.worry?.detail ?? []), ...script.scenes.flatMap((s) => s.factsUsed)])].filter((k) => plan.facts[k]);
    const result: JobResult = {
      runId: relative(RUNS_DIR, dir).split("\\").join("/"),
      caseId, member,
      name: ctx.name,
      partner: ctx.partner,
      explain: ctx.explain,
      decision: ctx.decision,
      source,
      videoUrl,
      scenes,
      chapters: script.chapters.map((c, i) => ({ ...c, start: scenes[i].start })),
      duration: t,
      cta: script.cta,
      firstStep: { title: m.title, action: m.action ?? null, effort: m.effort ?? null, before: m.before, after: m.after, lift: m.after - m.before },
      detail: detailKeys.map((key) => ({ key, label: plan.facts[key].label, exact: plan.facts[key].exact })),
      checks,
      notes,
    };
    writeFileSync(join(dir, "result.json"), JSON.stringify(result, null, 2));
    clearInterval(tick);
    emit(job, { type: "progress", p: 1, step: "Your video is ready", left: null });
    emit(job, { type: "done", result });
  } catch (err) {
    clearInterval(tick);
    log(`[error] ${(err as Error).stack ?? err}`);
    emit(job, { type: "error", message: (err as Error).message });
  }
}

// Express API for Plan in Motion.
//   GET  /api/cases                         families and their adults (the picker; production has a login)
//   GET  /api/cases/:caseId/:member/survey  what the four questions need for this adult
//   POST /api/jobs                          { caseId, member, survey } -> { id }; generation runs in the background
//   GET  /api/jobs/:id                      status and result
//   GET  /api/jobs/:id/events               progress as Server-Sent Events
//   GET  /runs/...                          the run's outputs (audio, MP4)
import express from "express";
import { join } from "node:path";
import { env, RUNS_DIR } from "./env.js";
import { listCaseIds, loadCase } from "./cases.js";
import { buildPlan } from "./facts.js";
import { JobRequestSchema, surveyFor } from "./survey.js";
import { createJob, getJob, type JobEvent } from "./pipeline/jobs.js";
import { runJob } from "./pipeline/run.js";

const app = express();
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/cases", (_req, res) => {
  const cases = listCaseIds().map((caseId) => {
    const plan = buildPlan(loadCase(caseId));
    return {
      caseId,
      family: plan.adults.map((a) => a.name).join(" & "),
      score: plan.score,
      band: plan.band,
      people: plan.adults.map((a) => ({ id: a.id, name: a.name })),
    };
  });
  res.json({ cases });
});

app.get("/api/cases/:caseId/:member/survey", (req, res) => {
  try {
    res.json(surveyFor(buildPlan(loadCase(req.params.caseId)), req.params.member));
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

app.post("/api/jobs", (req, res) => {
  const parsed = JobRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
    return;
  }
  const job = createJob(parsed.data);
  void runJob(job);
  res.status(202).json({ id: job.id });
});

app.get("/api/jobs/:id", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "No such job" });
    return;
  }
  res.json({ id: job.id, status: job.status, result: job.result ?? null });
});

app.get("/api/jobs/:id/events", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).end();
    return;
  }
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
  const send = (e: JobEvent) => res.write(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
  for (const e of job.events) send(e);
  if (job.status !== "running") {
    res.end();
    return;
  }
  const onEvent = (e: JobEvent) => {
    send(e);
    if (e.type === "done" || e.type === "error") res.end();
  };
  job.bus.on("event", onEvent);
  req.on("close", () => job.bus.off("event", onEvent));
});

app.use("/runs", express.static(RUNS_DIR, { fallthrough: false, dotfiles: "ignore" }));

app.listen(env.API_PORT, () => {
  console.log(`Plan in Motion API on http://localhost:${env.API_PORT} (runs in ${join("runs")}, demo pacing ${env.DEMO_MS} ms)`);
});

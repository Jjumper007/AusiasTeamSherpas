// The script (SPEC §4-5): a fixed five-part arc, chapters under the video and the call to action.
// writeFallbackScript() builds it from the plan alone (no LLM), so a job always has a script.
// Claude's version (step 2, claude -p) must pass the same schema and the same figure check.
import { z } from "zod";
import type { Facts, Move, Plan } from "./facts.js";
import { bestMove, decisionFromPersona, fill, keysIn, worries, type Decision, type Explain, type Survey, type Worry } from "./survey.js";

export const PARTS = ["hook", "where", "matters", "step", "change"] as const;
export type Part = (typeof PARTS)[number];

export const ScriptSchema = z.object({
  scenes: z
    .array(z.object({ part: z.enum(PARTS), narration: z.string().min(1), visualIdea: z.string(), factsUsed: z.array(z.string()) }))
    .length(5)
    .refine((s) => s.every((x, i) => x.part === PARTS[i]), "the five parts must come in order: hook, where, matters, step, change"),
  chapters: z.array(z.object({ title: z.string().min(1).max(40), body: z.string().min(1) })).length(5),
  cta: z.object({ type: z.enum(["just_do_it", "research_first", "ask_trusted", "wait"]), text: z.string().min(1) }),
});
export type Script = z.infer<typeof ScriptSchema>;

export interface ScriptContext {
  plan: Plan;
  member: string;
  name: string;
  partner: string | null;
  explain: Explain;
  decision: Decision;
  worry: Worry | null;
  move: Move;
}

/** Resolves the survey against the plan: defaults for skipped answers, an uncovered worry is dropped. */
export function contextFor(plan: Plan, member: string, survey: Survey): ScriptContext {
  const p = plan.adults.find((a) => a.id === member);
  if (!p) throw new Error(`No adult "${member}" in ${plan.caseId}`);
  const options = worries(plan, p);
  // SPEC §3: a worry the plan doesn't cover is left out; the video centres on the most pressing one instead.
  const worry = options.find((w) => w.id === survey.worry) ?? options[0] ?? null;
  const move = worry ? plan.moves[worry.move] : bestMove(plan);
  return {
    plan,
    member,
    name: survey.nickname?.trim() || p.name,
    partner: plan.adults.find((a) => a.id !== member)?.name ?? null,
    explain: survey.explain ?? "straight",
    decision: survey.decision ?? decisionFromPersona(plan.persona.classification.D5),
    worry,
    move,
  };
}

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Fact key of a move's before/after score. */
const mk = (m: Move, side: "before" | "after" | "lift") => `move.${m.i}.${side}`;

export function ctaFor(ctx: ScriptContext): Script["cta"] {
  const step = ctx.move.title.toLowerCase();
  switch (ctx.decision) {
    case "just_do_it":
      return { type: "just_do_it", text: `Start now: ${step}. It takes about ten minutes.` };
    case "research_first":
      return { type: "research_first", text: "Why this number? Open the detail under the video before you decide." };
    case "ask_trusted":
      return { type: "ask_trusted", text: ctx.partner ? `Send this to ${ctx.partner} and decide together.` : "Send this to someone you trust and decide together." };
    case "wait":
      return { type: "wait", text: `Not today? Fine. Until you ${step}, your score stays at {${mk(ctx.move, "before")}}.` };
  }
}

/** Deterministic script from the plan: the fallback when Claude is off or keeps failing the checks. */
export function writeFallbackScript(ctx: ScriptContext): Script {
  const { plan, name, explain, worry, move } = ctx;
  const f = plan.facts;
  const pillars = plan.pillars.map((p, i) => ({ ...p, i })).filter((p) => p.max > 0);
  const weakest = [...pillars].sort((a, b) => a.points / a.max - b.points / b.max)[0];
  const strongest = [...pillars].sort((a, b) => b.points / b.max - a.points / a.max)[0];
  const lift = move.after - move.before;
  const combo = plan.combos.filter((c) => c.moves.includes(move.title) && c.after > move.after).sort((a, b) => b.after - a.after)[0];
  const cta = ctaFor(ctx);

  const hook = worry ? `${name}, ${worry.hook}` : `${name}, your plan is ready. Here's where you stand, and the one step that matters most.`;

  const where = {
    simple: `Think of your plan as a mountain route. Today you're at {score} out of {score.max}. That's your altitude.`,
    straight: `Your plan puts you at {score} out of {score.max}. Think of it as altitude: the higher, the safer the route. ${strongest ? `Your strongest area is ${strongest.label.toLowerCase()}.` : ""}`,
    nerd: `Your score is {score} out of {score.max}, band ${plan.band}. ${strongest && weakest ? `${strongest.label} is your strongest area at {pillar.${strongest.i}.points} of {pillar.${strongest.i}.max}; ${weakest.label.toLowerCase()} is the weakest at {pillar.${weakest.i}.points} of {pillar.${weakest.i}.max}.` : ""}`,
  }[explain].trim();

  const matters = worry
    ? worry.matters
    : weakest
      ? `The plan's biggest gap is ${weakest.label.toLowerCase()}: {pillar.${weakest.i}.points} of {pillar.${weakest.i}.max}.`
      : "The plan points to one gap before anything else.";

  const step = `Your next step on the trail: ${move.title.toLowerCase()}.${move.effort ? ` The plan rates it ${move.effort} effort.` : ""}`;

  const change = lift > 0
    ? `Take it, and you climb from {${mk(move, "before")}} to {${mk(move, "after")}}.${combo ? ` ${sentence(combo.moves.filter((x) => x !== move.title).join(" and ").toLowerCase())} too, and you reach {combo.${combo.i}.after}.` : ""}${worry ? ` That's ${worry.short}, one step closer.` : ""}`
    : `It doesn't move the score, but it closes a gap the plan flags.${worry ? ` That's ${worry.short}, safer.` : ""}`;

  const close = {
    just_do_it: " It takes about ten minutes. The button is right under this video.",
    research_first: " Want the why behind each number? It's all under this video.",
    ask_trusted: ctx.partner ? ` Watch this again with ${ctx.partner}, then decide together.` : " Share it with someone you trust, then decide together.",
    wait: " Not ready yet? We'll remind you.",
  }[ctx.decision];

  const lines: Record<(typeof PARTS)[number], string> = { hook, where, matters, step, change: change + close };
  const visual: Record<(typeof PARTS)[number], string> = {
    hook: `${name} at the trailhead; the family's names on the map${worry ? `; the worry, ${worry.short}, marked on the route` : ""}.`,
    where: "The altimeter rises to the score; the summit (retirement) far above.",
    matters: explain === "nerd" && worry ? `Table overlay with: ${worry.detail.join(", ")}.` : "The missing gear in the backpack, highlighted.",
    step: "One lit footprint: the next step on the trail.",
    change: lift > 0 ? "The altimeter climbs from before to after; the route segment turns solid." : "The missing gear lands in the backpack.",
  };

  const scenes = PARTS.map((part) => ({
    part,
    narration: fill(lines[part], f, "voice"),
    visualIdea: visual[part],
    factsUsed: [...new Set(keysIn(lines[part]))],
  }));

  const detail = explain === "nerd" && worry ? ` In detail: ${worry.detail.map((k) => `${f[k].label.toLowerCase()} ${f[k].exact}`).join("; ")}.` : "";
  const chapters = [
    { title: `Hi, ${name}`, body: fill(sentence(worry ? worry.hook : "your plan, in about a minute."), f) },
    { title: "Your altitude", body: fill(where, f) },
    { title: "What matters most", body: fill(matters, f) + detail },
    { title: "Your next step", body: fill(step, f) },
    { title: "What changes", body: fill(change, f) },
  ];

  return { scenes, chapters, cta: { type: cta.type, text: fill(cta.text, f) } };
}

/** Rough narration time before the voice exists: about 2.6 words a second. */
export const estimateSeconds = (text: string) => Math.max(2.5, text.split(/\s+/).filter(Boolean).length / 2.6 + 0.4);

export function factsCatalog(facts: Facts): string {
  return Object.entries(facts)
    .map(([k, v]) => `${k} = ${v.exact} (${v.label}${v.period ? `; ${v.period}` : ""})`)
    .join("\n");
}

// Step 1 (SPEC §5.1): the ~8 KB brief Claude writes from. Deterministic: same plan + survey, same brief.
import type { Plan } from "./facts.js";
import { factsCatalog, type ScriptContext } from "./script.js";

const cut = (s: unknown, n: number) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

export function buildBrief(ctx: ScriptContext): string {
  const { plan, member } = ctx;
  const p = plan.adults.find((a) => a.id === member)!;
  const P = plan.persona;
  const narrative = Object.entries(plan.narrative)
    .filter(([, v]) => typeof v === "string")
    .slice(0, 6)
    .map(([k, v]) => `- ${k}: ${cut(v, 420)}`)
    .join("\n");

  return `# Brief: ${p.name}'s video

## Family
- Watching: ${p.name} (${p.role}, age ${p.age}, risk profile ${p.risk ?? "unknown"}, wants to retire at ${p.retirementAge ?? "n/a"})
- Household: ${plan.adults.map((a) => `${a.name} (${a.age})`).join(", ")}${plan.kids.length ? `; children ${plan.kids.map((k) => `${k.name} (${k.age})`).join(", ")}` : ""}
- Location: ${plan.location}

## Survey (answers win over persona.md)
- Call them: ${ctx.name}
- Explain it: ${ctx.explain}
- On their mind: ${ctx.worry ? `${ctx.worry.label} (${ctx.worry.id})` : "not answered: use the plan's most pressing gap"}
- Decision style: ${ctx.decision}${ctx.partner ? ` (partner: ${ctx.partner})` : ""}

## Score
- ${plan.score} of 100, band ${plan.band}
${plan.pillars.map((x) => `- ${x.label}: ${x.points} of ${x.max}`).join("\n")}

## Top moves (score_before -> score_after)
${plan.moves.map((m) => `- [${m.i}] ${m.title} (${m.effort ?? "?"} effort): ${m.before} -> ${m.after}${m.action ? `. ${cut(m.action, 160)}` : ""}`).join("\n")}
- First step for this video: [${ctx.move.i}] ${ctx.move.title}

## Goals
${plan.goals.map((g) => `- ${g.name}${g.date ? ` (${g.date})` : ""}`).join("\n") || "- none listed"}

## Persona (classification, low confidence)
${Object.entries(P.classification).map(([k, v]) => `- ${k}: ${v}`).join("\n")}
- D5 decision style: ${cut(P.sections.D5, 300)}
- D6 motivation: ${cut(P.sections.D6, 300)}

## Narrative (the plan's own words)
${narrative}

## Facts (the ONLY figures you may use; constants in facts.ts)
${cut(factsCatalog(plan.facts), 3200)}
`;
}

export const briefSize = (b: string) => Buffer.byteLength(b, "utf8");

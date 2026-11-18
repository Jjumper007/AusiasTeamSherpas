// The survey (SPEC §3): nickname, how to explain it, what's on your mind (options built from THIS plan),
// and the decision style that picks the call to action.
import { z } from "zod";
import type { Adult, Facts, Move, Plan } from "./facts.js";

export const EXPLAIN = ["simple", "straight", "nerd"] as const;
export const DECISIONS = ["just_do_it", "research_first", "ask_trusted", "wait"] as const;
export type Explain = (typeof EXPLAIN)[number];
export type Decision = (typeof DECISIONS)[number];

/** Every answer is optional: a skipped question falls back to the default. */
export const SurveySchema = z.object({
  nickname: z.string().trim().max(24).optional(),
  explain: z.enum(EXPLAIN).optional(),
  worry: z.string().max(40).optional(),
  decision: z.enum(DECISIONS).optional(),
});
export type Survey = z.infer<typeof SurveySchema>;

export const JobRequestSchema = z.object({
  caseId: z.string().regex(/^[a-z0-9-]+$/),
  member: z.string().regex(/^[a-z]+$/),
  survey: SurveySchema.default({}),
});
export type JobRequest = z.infer<typeof JobRequestSchema>;

// ---------- "What's on your mind most?" ----------

export interface Worry {
  id: string;
  /** Button text, figures filled in: "Retiring at 62". */
  label: string;
  /** For sentences: "retiring at 62". */
  short: string;
  severity: number;
  /** The move from top_moves that answers this worry. */
  move: number;
  /** Lines for the video, with {placeholders} that only facts can fill. */
  hook: string;
  matters: string;
  /** Fact keys the "what matters most" part puts on screen in nerd mode. */
  detail: string[];
}

const has = (f: Facts, k: string) => Boolean(f[k]);
const val = (f: Facts, k: string) => f[k]?.value ?? 0;
const listNames = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
const PLACEHOLDER = /\{([a-zA-Z0-9_.]+)(?:\|(display|exact|spoken))?\}/g;

/** Fills {placeholders} from facts. medium "voice" uses the spoken form ("1.4 million dollars"). */
export function fill(line: string, facts: Facts, medium: "display" | "voice" = "display"): string {
  return line.replace(PLACEHOLDER, (_, key: string, form?: "display" | "exact" | "spoken") => {
    const f = facts[key];
    if (!f) throw new Error(`unknown fact {${key}}`);
    return f[form ?? (medium === "voice" ? "spoken" : "display")];
  });
}
export const keysIn = (line: string) => [...line.matchAll(PLACEHOLDER)].map((m) => m[1]);

export function bestMove(plan: Plan): Move {
  return [...plan.moves].sort((a, b) => b.after - b.before - (a.after - a.before) || a.i - b.i)[0];
}

function moveFor(plan: Plan, ...patterns: RegExp[]): Move {
  for (const re of patterns) {
    const hit = plan.moves.filter((m) => re.test(m.title)).sort((a, b) => b.after - b.before - (a.after - a.before))[0];
    if (hit) return hit;
  }
  return bestMove(plan);
}

/** Up to four options, most pressing first; each one only if the plan has the figures for it. */
export function worries(plan: Plan, p: Adult): Worry[] {
  const f = plan.facts;
  const ret = `${p.slot}.retirementAge`;
  const out: Worry[] = [];

  if (has(f, ret) && (has(f, "retirement.savingsRunOutAge") || has(f, "retirement.incomeShareOfNeed"))) {
    const runOut = has(f, "retirement.savingsRunOutAge");
    out.push({
      id: "retire", label: `Retiring at {${ret}}`, short: `retiring at {${ret}}`,
      severity: runOut ? 3 : val(f, "retirement.incomeShareOfNeed") < 60 ? 2 : 1,
      move: moveFor(plan, /withdraw/i, /saving/i, /glide|growth|allocation/i).i,
      hook: runOut
        ? `you want to retire at {${ret}}. Today, your savings run out at {retirement.savingsRunOutAge}.`
        : `you want to retire at {${ret}}. Income will cover {retirement.incomeShareOfNeed} of what you'll spend.`,
      matters: has(f, "retirement.spendingNeed") && has(f, "retirement.guaranteedIncome")
        ? "In retirement you'll spend about {retirement.spendingNeed}. Guaranteed income covers {retirement.guaranteedIncome}. Your savings have to fill the rest."
        : `Retiring at {${ret}} is the summit of this route. Your savings carry you the last stretch.`,
      detail: ["retirement.spendingNeed", "retirement.guaranteedIncome", "retirement.savingsRunOutAge", "retirement.withdrawalRateAverage", "retirement.incomeShareOfNeed"].filter((k) => has(f, k)),
    });
  }

  if (has(f, "goal.home.year")) {
    const nearTerm = has(f, "cash.nearTerm.home");
    out.push({
      id: "home", label: "The home in {goal.home.year}", short: "the home in {goal.home.year}",
      severity: nearTerm && val(f, "cash.accessibleCash") < val(f, "cash.nearTerm.home") ? 3 : 1.5,
      move: moveFor(plan, /card|debt/i, /saving/i).i,
      hook: nearTerm
        ? "you want to buy a home in {goal.home.year}. The plan sets aside {cash.nearTerm.home} in cash for it."
        : "the plan buys a home in {goal.home.year}.",
      matters: nearTerm && has(f, "cash.accessibleCash")
        ? "The plan holds {cash.nearTerm.home} for the home's next payment. Your accessible cash today is {cash.accessibleCash}."
        : "The home in {goal.home.year} is a camp on the way up. The plan already makes room for it.",
      detail: ["goal.home.amount", "cash.nearTerm.home", "cash.accessibleCash"].filter((k) => has(f, k)),
    });
  }

  if (has(f, "education.fundingGap") && plan.kids.length) {
    const kids = listNames(plan.kids.map((k) => k.name));
    out.push({
      id: "college", label: `College for ${kids}`, short: `college for ${kids}`, severity: 2,
      move: moveFor(plan, /saving/i).i,
      hook: `college for ${kids} still needs {education.fundingGap} beyond what's already saved.`,
      matters: has(f, "education.extraYearlySaving") && val(f, "education.extraYearlySaving") > 0
        ? `College for ${kids} still needs {education.fundingGap}. Saving about {education.extraYearlySaving} extra, starting now, gets you there.`
        : `College for ${kids} still needs {education.fundingGap} beyond what's already saved.`,
      detail: ["education.fundingGap", "education.extraYearlySaving"].filter((k) => has(f, k)),
    });
  }

  if (has(f, "cash.monthsCovered") && has(f, "cash.emergencyReserve.min")) {
    const months = val(f, "cash.monthsCovered");
    out.push({
      id: "cushion", label: "A cushion if things go wrong", short: "your safety cushion",
      severity: months < 2 ? 3 : months < 6 ? 2.5 : 0.5,
      move: moveFor(plan, /saving/i, /cash|emergency|reserve/i).i,
      hook: "if your income stopped tomorrow, your cash would last {cash.monthsCovered}.",
      matters: "You can reach {cash.accessibleCash} in cash. The plan recommends keeping {cash.emergencyReserve.min} to {cash.emergencyReserve.max} aside.",
      detail: ["cash.monthsCovered", "cash.accessibleCash", "cash.emergencyReserve.min", "cash.emergencyReserve.max"].filter((k) => has(f, k)),
    });
  }

  if (has(f, "card.yearlyInterest")) {
    out.push({
      id: "card", label: "The card balance", short: "the card",
      severity: val(f, "card.yearlyInterest") >= 2000 ? 2.5 : 1,
      move: moveFor(plan, /card|debt|revolving/i).i,
      hook: "there's {card.balance} on your card at {card.rate}. That costs you about {card.yearlyInterest} in interest.",
      matters: has(f, "cash.cashAboveReserve")
        ? "The card costs you {card.yearlyInterest}. Meanwhile {cash.cashAboveReserve} sits above your safety cushion."
        : "The card balance is {card.balance} at {card.rate}: about {card.yearlyInterest} a year in interest.",
      detail: ["card.balance", "card.rate", "card.yearlyInterest", "cash.cashAboveReserve"].filter((k) => has(f, k)),
    });
  }

  const who = has(f, `life.cover.${p.slot}`) ? p.slot : "client";
  const ins = plan.pillars.findIndex((x) => /Insurance/i.test(x.label));
  const pillarZero = ins >= 0 && plan.pillars[ins].points === 0;
  if (pillarZero || val(f, `life.shortfall.${who}`) > 0) {
    const family = plan.adults.length > 1 || plan.kids.length > 0;
    out.push({
      id: "protection", label: family ? "The family, if something happens" : "Being covered if something happens",
      short: family ? "protecting the family" : "being covered",
      severity: pillarZero ? 3 : 2,
      move: moveFor(plan, /life|mortality/i, /cover|coverage|umbrella/i).i,
      hook: pillarZero
        ? `if something happened tomorrow, how protected is your family? Your protection score is {pillar.${ins}.points} out of {pillar.${ins}.max}.`
        : `if something happened to you, your life cover pays {life.cover.${who}}. The plan recommends at least {life.recommendedMin.${who}}.`,
      matters: has(f, `life.recommendedMin.${who}`) && has(f, `life.cover.${who}`)
        ? `Your life cover today is {life.cover.${who}}. The plan recommends at least {life.recommendedMin.${who}}. That's the gear missing from the backpack.`
        : "Protection is the gear missing from the backpack: the plan flags it before anything else.",
      detail: [`life.cover.${who}`, `life.recommendedMin.${who}`, `life.shortfall.${who}`].filter((k) => has(f, k)),
    });
  }

  return out
    .map((w, k) => ({ w, k }))
    .sort((a, b) => b.w.severity - a.w.severity || a.k - b.k)
    .slice(0, 4)
    .map(({ w }) => ({ ...w, label: fill(w.label, f), short: fill(w.short, f) }));
}

/** What the frontend needs to ask the four questions for one adult. */
export function surveyFor(plan: Plan, member: string) {
  const p = plan.adults.find((a) => a.id === member);
  if (!p) throw new Error(`No adult "${member}" in ${plan.caseId}`);
  const partner = plan.adults.find((a) => a.id !== member)?.name ?? null;
  return {
    caseId: plan.caseId,
    member: p.id,
    name: p.name,
    partner,
    worries: worries(plan, p).map(({ id, label }) => ({ id, label })),
    /** From persona.md D5, used when the decision question is skipped. */
    defaultDecision: decisionFromPersona(plan.persona.classification.D5),
  };
}

/** persona.md D5 -> our four answers. The survey answer always wins (SPEC §3). */
export function decisionFromPersona(d5?: string): Decision {
  switch ((d5 ?? "").toUpperCase()) {
    case "COLLABORATOR":
    case "DUAL":
    case "DELEGATOR":
      return "ask_trusted";
    case "VALIDATOR":
    case "ANALYTICAL":
      return "research_first";
    case "AVOIDANT":
    case "PROCRASTINATOR":
      return "wait";
    default:
      return "just_do_it";
  }
}

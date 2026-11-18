// Turns a Sherpas case into a flat dictionary of named facts. Every number that can reach the video
// (screen, voice, chapters, the first-step card) comes from here, and validate.ts rejects any other.
// Also writes facts.ts for the video template: SCORE_NOW = 52, RETIREMENT_GAP = 1427456, ...
import type { CaseFiles, Json } from "./cases.js";
import { parsePersona } from "./cases.js";

export type Unit = "USD" | "USD/yr" | "percent" | "months" | "age" | "score" | "points" | "count" | "year" | string;

export interface Fact {
  value: number;
  unit: Unit;
  label: string;
  /** On screen, rounded: "$1.4M". */
  display: string;
  /** Exact: "$1,427,456". */
  exact: string;
  /** For the voice: "1.4 million dollars". */
  spoken: string;
  period?: string;
  note?: string;
  derived?: boolean;
}

export type Facts = Record<string, Fact>;

// ---------- formatting (the `fmt` helper: the only way a figure is rounded) ----------

const num = (v: unknown): number => (typeof v === "string" ? parseFloat(v.replace(/[^0-9.\-]/g, "")) : Number(v));

function money(v: number, compact: boolean): string {
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (compact && a >= 1e6) return `${sign}$${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, "")}M`;
  if (compact && a >= 1e4) return `${sign}$${Math.round(a / 1e3)}K`;
  return `${sign}$${Math.round(a).toLocaleString("en-US")}`;
}

function spokenMoney(v: number): string {
  const a = Math.abs(v);
  const sign = v < 0 ? "minus " : "";
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(1).replace(/\.0$/, "")} million dollars`;
  if (a >= 1e4) return `${sign}${Math.round(a / 1e3)} thousand dollars`;
  return `${sign}${Math.round(a).toLocaleString("en-US")} dollars`;
}

export function formatFact(value: unknown, unit: Unit): Pick<Fact, "display" | "exact" | "spoken"> {
  const v = num(value);
  switch (unit) {
    case "USD":
      return { display: money(v, true), exact: money(v, false), spoken: spokenMoney(v) };
    case "USD/yr":
      return { display: `${money(v, true)}/yr`, exact: `${money(v, false)} a year`, spoken: `${spokenMoney(v)} a year` };
    case "percent": {
      const p = Math.abs(v) <= 1 && String(value).indexOf("%") < 0 ? v * 100 : v;
      const s = `${Number(p.toFixed(1))}%`;
      return { display: s, exact: s, spoken: `${Number(p.toFixed(1))} percent` };
    }
    case "months":
      return { display: `${v} mo`, exact: `${v} months`, spoken: `${v} months` };
    case "age":
      return { display: `${v}`, exact: `age ${v}`, spoken: `${v}` };
    default:
      return { display: `${v}`, exact: `${v}`, spoken: `${v}` };
  }
}

/** fmt.round(RETIREMENT_GAP) -> "$1.4M". The video template gets the same helper. */
export const fmt = {
  round: (v: number) => money(v, true),
  exact: (v: number) => money(v, false),
  pct: (v: number) => formatFact(v, "percent").display,
};

// ---------- the household ----------

export interface Adult {
  id: string;
  name: string;
  role: string;
  age: number;
  risk?: string;
  retirementAge?: number;
  slot: "client" | "coClient";
}

export interface Move {
  i: number;
  title: string;
  action?: string;
  effort?: string;
  before: number;
  after: number;
}

export interface Plan {
  caseId: string;
  location: string;
  adults: Adult[];
  kids: { name: string; age: number }[];
  score: number;
  band: string;
  pillars: { label: string; points: number; max: number }[];
  moves: Move[];
  combos: { i: number; moves: string[]; after: number }[];
  goals: { type: string; name: string; date?: string }[];
  /** projections.yearly, trimmed: year, ages and net worth in today's dollars. */
  yearly: { year: number; ageClient?: number; ageCoClient?: number; netWorth: number; netWorthNeeded?: number }[];
  narrative: Record<string, string>;
  persona: ReturnType<typeof parsePersona>;
  facts: Facts;
}

export function buildPlan(c: CaseFiles): Plan {
  const { fh } = c;
  const facts: Facts = {};
  const put = (key: string, value: unknown, unit: Unit, label: string, extra: Partial<Fact> = {}) => {
    const v = num(value);
    if (value === null || value === undefined || Number.isNaN(v)) return;
    facts[key] = { value: v, unit, label, ...formatFact(value, unit), ...extra };
  };

  const household: Json[] = fh.case.household;
  const adults = household.filter((p) => p.role !== "child");
  const kids = household.filter((p) => p.role === "child");

  const s = fh.score;
  put("score", s.published_score, "score", "Financial health score, 0 to 100");
  put("score.max", 100, "score", "Top of the score scale");
  s.pillars.forEach((p: Json, i: number) => {
    const [pts, max] = String(p.points_shown_in_app).split("/").map(Number);
    put(`pillar.${i}.points`, pts, "points", `${p.pillar}: points earned`);
    put(`pillar.${i}.max`, max, "points", `${p.pillar}: maximum points`);
  });
  s.top_moves.forEach((m: Json, i: number) => {
    put(`move.${i}.before`, m.score_before, "score", `Score today, before "${m.title}"`);
    put(`move.${i}.after`, m.score_after, "score", `Score after "${m.title}"`);
    put(`move.${i}.lift`, m.score_after - m.score_before, "points", `Points gained by "${m.title}"`, { derived: true });
  });
  (s.combined_moves ?? []).forEach((m: Json, i: number) => {
    put(`combo.${i}.after`, m.score_after, "score", `Score after doing together: ${m.moves.join(" + ")}`);
  });

  adults.forEach((p, i) => {
    const k = i === 0 ? "client" : "coClient";
    put(`${k}.age`, p.age, "age", `${p.first_name}'s age today`);
    put(`${k}.retirementAge`, p.retirement_age, "age", `${p.first_name}'s target retirement age`);
  });
  put("kids.count", kids.length, "count", "Number of children");

  for (const [group, entries] of Object.entries<Json>(fh.key_metrics?.facts ?? {})) {
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) continue;
    for (const [k, f] of Object.entries<Json>(entries)) {
      if (!f || typeof f !== "object" || Array.isArray(f) || !f.label) continue;
      if (f.value !== undefined) put(`${group}.${k}`, f.value, f.unit, f.label, { period: f.period, note: f.note });
      if (f.min !== undefined) put(`${group}.${k}.min`, f.min, f.unit, `${f.label} (low end)`, { period: f.period });
      if (f.max !== undefined) put(`${group}.${k}.max`, f.max, f.unit, `${f.label} (high end)`, { period: f.period });
    }
  }

  const runOutAge = fh.key_metrics?.facts?.retirement?.savingsRunOut?.label?.match(/run out at age (\d+)/)?.[1];
  if (runOutAge) put("retirement.savingsRunOutAge", runOutAge, "age", "Age at which savings and investments run out");

  const life = fh.key_metrics?.protection?.lifeInsurance ?? {};
  const lifeBits = { ...life.lifeInsuranceCoverageBasics, ...life.lifeInsuranceCoverageGapsAndExcess, ...life.lifeInsuranceCoverageRecommendations };
  const n0 = adults[0]?.first_name, n1 = adults[1]?.first_name;
  const lifeLabels: Record<string, [string, string]> = {
    lifeInsuranceAmountClient: ["life.cover.client", `${n0}'s life cover today`],
    lifeInsuranceAmountCoClient: ["life.cover.coClient", `${n1}'s life cover today`],
    clientShortfall: ["life.shortfall.client", `${n0}'s life cover shortfall vs the recommended minimum`],
    coClientShortfall: ["life.shortfall.coClient", `${n1}'s life cover shortfall vs the recommended minimum`],
    clientMinRecommendedCoverage: ["life.recommendedMin.client", `Recommended minimum life cover for ${n0}`],
    coClientMinRecommendedCoverage: ["life.recommendedMin.coClient", `Recommended minimum life cover for ${n1}`],
  };
  for (const [field, [key, label]] of Object.entries(lifeLabels)) {
    if (typeof lifeBits[field] === "number") put(key, lifeBits[field], "USD", label);
  }

  // Most expensive card: yearly interest = balance x rate (arithmetic on plan data, flagged as derived).
  const card = (fh.profile?.liabilities ?? [])
    .filter((l: Json) => /CREDIT_CARD/.test(l.type) && l.balance > 0)
    .sort((a: Json, b: Json) => b.interest_rate - a.interest_rate)[0];
  if (card) {
    put("card.balance", card.balance, "USD", `${card.name} balance`);
    put("card.rate", card.interest_rate, "percent", `${card.name} interest rate`);
    put("card.yearlyInterest", card.balance * card.interest_rate, "USD/yr", `Yearly interest on the ${card.name} balance (balance x rate)`, { derived: true });
  }

  const goals = (fh.goals?.chartGoals ?? []).map((g: Json) => ({ type: g.goalType, name: g.name ?? g.goalType, date: g.date?.slice(0, 10) }));
  const homeSummary = (fh.goals?.goalsSummary ?? []).find((g: Json) => g.goalType === "PURCHASE" && /home/i.test(g.value ?? ""));
  const homeChart = goals.find((g: Json) => g.type === "PURCHASE" && /home/i.test(g.name));
  if (homeSummary?.amount) put("goal.home.amount", homeSummary.amount, "USD", "Home purchase price in the plan");
  if (homeChart?.date) put("goal.home.year", homeChart.date.slice(0, 4), "year", "Year of the planned home purchase");
  for (const g of fh.key_metrics?.facts?.cash?.nearTermGoals ?? []) {
    if (/^Purchase a home/i.test(g.label ?? "")) put("cash.nearTerm.home", g.value, "USD", g.label, { period: g.period });
  }

  return {
    caseId: c.caseId,
    location: `${fh.case.city}, ${fh.case.state}`,
    adults: adults.map((p, i) => ({ id: String(p.first_name).toLowerCase(), name: p.first_name, role: p.role, age: p.age, risk: p.risk_profile, retirementAge: p.retirement_age, slot: i === 0 ? "client" : "coClient" })),
    kids: kids.map((k) => ({ name: k.first_name, age: k.age })),
    score: s.published_score,
    band: s.band,
    pillars: s.pillars.map((p: Json, i: number) => ({ label: p.pillar, points: facts[`pillar.${i}.points`]?.value, max: facts[`pillar.${i}.max`]?.value })),
    moves: s.top_moves.map((m: Json, i: number) => ({ i, title: m.title, action: m.action, effort: m.effort, before: m.score_before, after: m.score_after })),
    combos: (s.combined_moves ?? []).map((m: Json, i: number) => ({ i, moves: m.moves, after: m.score_after })),
    goals,
    yearly: (fh.projections?.yearly ?? []).map((y: Json) => ({ year: y.year, ageClient: y.age_client, ageCoClient: y.age_co_client, netWorth: y.net_worth_todays_dollars, netWorthNeeded: y.net_worth_needed })),
    narrative: fh.narrative ?? {},
    persona: parsePersona(c.personaMd),
    facts,
  };
}

// ---------- facts.ts for the video template ----------

/** "retirement.savingsRunOutAge" -> "RETIREMENT_SAVINGS_RUN_OUT_AGE"; "score" -> "SCORE_NOW". */
export function constName(key: string): string {
  if (key === "score") return "SCORE_NOW";
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .toUpperCase();
}

export function factsTs(facts: Facts): string {
  const lines = Object.entries(facts).map(([k, f]) => `/** ${f.label.replace(/\*\//g, "")} (${f.exact}) */\nexport const ${constName(k)} = ${f.value};`);
  return `// Generated from the plan by the backend (facts.ts). Do not edit: every figure in the video comes from here.\n// Round only with fmt: fmt.round(X) -> "$1.4M", fmt.exact(X) -> "$1,427,456", fmt.pct(X) -> "4.2%".\n\n${lines.join("\n\n")}\n`;
}

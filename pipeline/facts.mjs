// Turns a Sherpas case into a flat dictionary of named facts: { "retirement.savingsRunOutAge": { value, unit, label, display, exact, spoken } }.
// Every number that can reach the screen or the voice comes from here. The LLM only ever sees the keys
// and writes {placeholders}; guard.mjs swaps them for these values. That is how we never invent a figure.
import { parsePersona } from "./sherpas-mcp.mjs";

// ---------- formatting ----------

const num = (v) => (typeof v === "string" ? parseFloat(v.replace(/[^0-9.\-]/g, "")) : v);

function money(v, compact) {
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (compact && a >= 1e6) return `${sign}$${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, "")}M`;
  if (compact && a >= 1e4) return `${sign}$${Math.round(a / 1e3)}K`;
  return `${sign}$${Math.round(a).toLocaleString("en-US")}`;
}

function spokenMoney(v) {
  const a = Math.abs(v);
  const sign = v < 0 ? "minus " : "";
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(1).replace(/\.0$/, "")} million dollars`;
  if (a >= 1e4) return `${sign}${Math.round(a / 1e3)} thousand dollars`;
  return `${sign}${Math.round(a).toLocaleString("en-US")} dollars`;
}

export function formatFact(value, unit) {
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

// ---------- extraction ----------

export function buildFacts(c) {
  const { fh } = c;
  const facts = {};
  const put = (key, value, unit, label, extra = {}) => {
    const v = num(value);
    if (value === null || value === undefined || Number.isNaN(v)) return;
    facts[key] = { value: v, unit, label, ...formatFact(value, unit), ...extra };
  };

  const household = fh.case.household;
  const adults = household.filter((p) => p.role !== "child");
  const kids = household.filter((p) => p.role === "child");

  // Score, pillars, moves
  const s = fh.score;
  put("score", s.published_score, "score", "Financial health score, 0 to 100");
  s.pillars.forEach((p, i) => {
    const [pts, max] = String(p.points_shown_in_app).split("/").map(Number);
    put(`pillar.${i}.points`, pts, "points", `${p.pillar}: points earned`);
    put(`pillar.${i}.max`, max, "points", `${p.pillar}: maximum points`);
  });
  s.top_moves.forEach((m, i) => {
    put(`move.${i}.before`, m.score_before, "score", `Score today, before "${m.title}"`);
    put(`move.${i}.after`, m.score_after, "score", `Score after "${m.title}"`);
    put(`move.${i}.lift`, m.score_after - m.score_before, "points", `Points gained by "${m.title}"`, { derived: true });
  });
  (s.combined_moves ?? []).forEach((m, i) => {
    put(`combo.${i}.after`, m.score_after, "score", `Score after doing together: ${m.moves.join(" + ")}`);
  });

  // People
  adults.forEach((p, i) => {
    const k = i === 0 ? "client" : "coClient";
    put(`${k}.age`, p.age, "age", `${p.first_name}'s age today`);
    put(`${k}.retirementAge`, p.retirement_age, "age", `${p.first_name}'s target retirement age`);
  });
  put("kids.count", kids.length, "count", "Number of children");

  // key_metrics.facts: every { value } or { min, max } becomes a fact
  for (const [group, entries] of Object.entries(fh.key_metrics?.facts ?? {})) {
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) continue;
    for (const [k, f] of Object.entries(entries)) {
      if (!f || typeof f !== "object" || Array.isArray(f) || !f.label) continue;
      const unit = f.unit === "percent" ? "percent" : f.unit;
      if (f.value !== undefined) put(`${group}.${k}`, f.value, unit, f.label, { period: f.period, note: f.note });
      if (f.min !== undefined) put(`${group}.${k}.min`, f.min, unit, `${f.label} (low end)`, { period: f.period });
      if (f.max !== undefined) put(`${group}.${k}.max`, f.max, unit, `${f.label} (high end)`, { period: f.period });
    }
  }

  // Derived but stated by the plan: the age savings run out is written in the label itself
  const runOut = fh.key_metrics?.facts?.retirement?.savingsRunOut;
  const runOutAge = runOut?.label?.match(/run out at age (\d+)/)?.[1];
  if (runOutAge) put("retirement.savingsRunOutAge", runOutAge, "age", "Age at which savings and investments run out");

  // Life and umbrella cover
  const life = fh.key_metrics?.protection?.lifeInsurance ?? {};
  const lifeBits = {
    ...life.lifeInsuranceCoverageBasics,
    ...life.lifeInsuranceCoverageGapsAndExcess,
    ...life.lifeInsuranceCoverageRecommendations,
  };
  const lifeLabels = {
    lifeInsuranceAmountClient: [`life.cover.client`, `${adults[0]?.first_name}'s life cover today`],
    lifeInsuranceAmountCoClient: [`life.cover.coClient`, `${adults[1]?.first_name}'s life cover today`],
    clientShortfall: [`life.shortfall.client`, `${adults[0]?.first_name}'s life cover shortfall vs the recommended minimum`],
    coClientShortfall: [`life.shortfall.coClient`, `${adults[1]?.first_name}'s life cover shortfall vs the recommended minimum`],
    clientMinRecommendedCoverage: [`life.recommendedMin.client`, `Recommended minimum life cover for ${adults[0]?.first_name}`],
    clientMaxRecommendedCoverage: [`life.recommendedMax.client`, `Recommended maximum life cover for ${adults[0]?.first_name}`],
    coClientMinRecommendedCoverage: [`life.recommendedMin.coClient`, `Recommended minimum life cover for ${adults[1]?.first_name}`],
    coClientMaxRecommendedCoverage: [`life.recommendedMax.coClient`, `Recommended maximum life cover for ${adults[1]?.first_name}`],
  };
  for (const [field, [key, label]] of Object.entries(lifeLabels)) {
    if (typeof lifeBits[field] === "number") put(key, lifeBits[field], "USD", label);
  }
  const umbrella = fh.key_metrics?.protection?.umbrellaInsurance?.umbrellaCoverage;
  const hasUmbrella = umbrella ? Boolean(umbrella.hasUmbrellaPolicy) : null;

  // Most expensive card: yearly interest = balance x rate (simple arithmetic on plan data, flagged as derived)
  const cards = (fh.profile?.liabilities ?? []).filter((l) => /CREDIT_CARD/.test(l.type) && l.balance > 0);
  const card = cards.sort((a, b) => b.interest_rate - a.interest_rate)[0];
  if (card) {
    put("card.balance", card.balance, "USD", `${card.name} balance`);
    put("card.rate", card.interest_rate, "percent", `${card.name} interest rate`);
    put("card.yearlyInterest", card.balance * card.interest_rate, "USD/yr", `Yearly interest on the ${card.name} balance (balance x rate)`, { derived: true });
  }

  // Projection series for the timeline. Ages are worked out per person in generate.mjs
  // (the projection caps its own age columns at 90, so we don't quote a plan-end age).
  const series = (fh.projections?.yearly ?? []).map((y) => ({
    year: y.year,
    netWorth: y.net_worth_todays_dollars,
    investable: y.investable_assets,
  }));

  // Goals with a date (home purchase, college...)
  const goals = (fh.goals?.chartGoals ?? []).map((g) => ({ type: g.goalType, name: g.name ?? g.goalType, date: g.date?.slice(0, 10) }));

  // The home purchase, if the plan has one: price, year, and the cash the plan holds for its next payment.
  const homeSummary = (fh.goals?.goalsSummary ?? []).find((g) => g.goalType === "PURCHASE" && /home/i.test(g.value ?? ""));
  const homeChart = goals.find((g) => g.type === "PURCHASE" && /home/i.test(g.name));
  if (homeSummary?.amount) put("goal.home.amount", homeSummary.amount, "USD", "Home purchase price in the plan");
  if (homeChart?.date) put("goal.home.year", homeChart.date.slice(0, 4), "year", "Year of the planned home purchase");
  for (const g of fh.key_metrics?.facts?.cash?.nearTermGoals ?? []) {
    if (/^Purchase a home/i.test(g.label ?? "")) put("cash.nearTerm.home", g.value, "USD", g.label, { period: g.period });
  }

  const persona = parsePersona(c.personaMd ?? "");

  return {
    caseId: c.caseId,
    source: c.source,
    location: `${fh.case.city}, ${fh.case.state}`,
    adults: adults.map((p, i) => ({ id: p.first_name.toLowerCase(), name: p.first_name, role: p.role, age: p.age, risk: p.risk_profile, retirementAge: p.retirement_age, slot: i === 0 ? "client" : "coClient" })),
    kids: kids.map((k) => ({ name: k.first_name, age: k.age })),
    band: s.band,
    colour: s.colour,
    pillars: s.pillars.map((p, i) => ({ label: p.pillar, points: facts[`pillar.${i}.points`]?.value, max: facts[`pillar.${i}.max`]?.value, keyPoints: `pillar.${i}.points`, keyMax: `pillar.${i}.max` })),
    moves: s.top_moves.map((m, i) => ({ i, title: m.title, action: m.action, effort: m.effort, before: m.score_before, after: m.score_after })),
    combos: (s.combined_moves ?? []).map((m, i) => ({ i, moves: m.moves, after: m.score_after })),
    hasUmbrella,
    card: card ? { name: card.name } : null,
    series,
    goals,
    narrative: fh.narrative,
    persona,
    facts,
  };
}

/** A compact list the LLM can read: key, label and the value it will become. */
export function factCatalog(f) {
  return Object.entries(f.facts)
    .map(([k, v]) => `{${k}} = ${v.exact}  (${v.label}${v.period ? `; ${v.period}` : ""})`)
    .join("\n");
}

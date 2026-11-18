// Template storyboards: picks scenes and writes lines from rules over the facts, with no LLM.
// This is the floor: every episode works even if the model is down or the budget is gone.
// director.mjs can then rewrite the lines (same placeholders), and guard.mjs keeps them honest.

const has = (f, k) => Boolean(f.facts[k]);

function pillarIndex(f, re) {
  return f.pillars.findIndex((p) => re.test(p.label));
}

function bestMove(f) {
  const effortRank = { low: 0, medium: 1, high: 2 };
  return [...f.moves].sort((a, b) => b.after - b.before - (a.after - a.before) || effortRank[a.effort] - effortRank[b.effort])[0];
}

function personSlot(f, person) {
  return f.adults.find((a) => a.id === person) ?? f.adults[0];
}

// ---------- scene builders ----------

function hookScene(f, p) {
  const n = p.name;
  const ret = `${p.slot}.retirementAge`;
  const ins = pillarIndex(f, /Insurance/i);
  const score = f.facts.score.value;

  if (score >= 70 && has(f, "retirement.savingsRunOutAge")) {
    return {
      type: "hook", theme: "hidden-risk",
      headline: "{score} out of 100. So why do the savings run out at {retirement.savingsRunOutAge}?",
      voice: `${n}, your plan scores {score}. Strong. So why do your savings run out at {retirement.savingsRunOutAge}?`,
      figure: "retirement.savingsRunOutAge",
    };
  }
  if (has(f, "card.yearlyInterest") && has(f, "cash.cashAboveReserve")) {
    return {
      type: "hook", theme: "idle-cash",
      headline: "{card.yearlyInterest} in card interest. {cash.cashAboveReserve} of extra cash, sitting still.",
      voice: `${n}, you pay about {card.yearlyInterest} in card interest, while {cash.cashAboveReserve} sits above your safety cushion.`,
      figure: "card.yearlyInterest",
    };
  }
  if (ins >= 0 && f.pillars[ins].points === 0) {
    return {
      type: "hook", theme: "protection",
      headline: `If something happened tomorrow, who's covered? Protection: {pillar.${ins}.points} of {pillar.${ins}.max}.`,
      voice: `${n}, if something happened tomorrow, how protected is your family? Your protection score is {pillar.${ins}.points} out of {pillar.${ins}.max}.`,
      figure: `pillar.${ins}.points`,
    };
  }
  if (has(f, "retirement.savingsRunOutAge") && has(f, ret)) {
    return {
      type: "hook", theme: "retirement",
      headline: `Retire at {${ret}}? Today, the money runs out at {retirement.savingsRunOutAge}.`,
      voice: `${n}, you want to retire at {${ret}}. Today, your savings run out at {retirement.savingsRunOutAge}.`,
      figure: "retirement.savingsRunOutAge",
    };
  }
  return { type: "hook", theme: "default", headline: "Your plan, in sixty seconds.", voice: `${n}, here's your plan in sixty seconds.`, figure: "score" };
}

function scoreScene(f) {
  const lines = {
    critical: "Your financial health score is {score} out of a hundred. Critical. But it's a starting line, not a verdict.",
    vulnerable: "Your score is {score}. Vulnerable: a few gaps are doing most of the damage.",
    stable: "Your score is {score}. Stable. The base is solid, and a couple of moves would lift it fast.",
    strong: "Your score is {score}. Strong. Which is exactly why the next part matters.",
  };
  return { type: "score", headline: "{score}", voice: lines[f.band] ?? lines.stable, band: f.band, colour: f.colour };
}

function pillarsScene(f) {
  const ratio = (p) => p.points / p.max;
  const sorted = [...f.pillars].map((p, i) => ({ ...p, i })).sort((a, b) => ratio(b) - ratio(a));
  const best = sorted[0];
  const worst = sorted.at(-1);
  return {
    type: "pillars",
    headline: "Where your score comes from",
    voice: `Five areas make up that score. Your strongest is ${best.label.toLowerCase()}. Your weakest is ${worst.label.toLowerCase()}.`,
    best: best.i,
    worst: worst.i,
  };
}

function timelineScene(f, p) {
  const ret = `${p.slot}.retirementAge`;
  if (has(f, "retirement.savingsRunOutAge")) {
    return {
      type: "timeline",
      headline: "Your savings, year by year",
      voice: `This line is your savings, one point per year of your life. You stop working at {${ret}}. Then the line falls, and it hits zero at {retirement.savingsRunOutAge}.`,
      markers: [ret, "retirement.savingsRunOutAge"],
    };
  }
  return {
    type: "timeline",
    headline: "Your savings, year by year",
    voice: `This line is your savings, one point per year of your life. You stop working at {${ret}}, and the line keeps you going all the way.`,
    markers: [ret],
  };
}

function compareScene(f, p) {
  if (has(f, "card.yearlyInterest") && has(f, "cash.cashAboveReserve")) {
    return {
      type: "compare",
      headline: "Two numbers that don't fit together",
      voice: "Same household, two numbers that don't fit together. The card costs you {card.yearlyInterest}. The extra cash could clear it.",
      left: { key: "card.yearlyInterest", label: "Card interest you pay" },
      right: { key: "cash.cashAboveReserve", label: "Cash above your safety cushion" },
    };
  }
  if (has(f, "retirement.savingsRunOutAge") && has(f, "retirement.spendingNeed") && has(f, "retirement.guaranteedIncome")) {
    return {
      type: "compare",
      headline: "Retirement: what you'll spend vs. what's guaranteed",
      voice: "In retirement you'll spend about {retirement.spendingNeed}. Guaranteed income covers {retirement.guaranteedIncome}. Your savings have to fill the rest.",
      left: { key: "retirement.spendingNeed", label: "Yearly spending need" },
      right: { key: "retirement.guaranteedIncome", label: "Guaranteed income" },
    };
  }
  const who = p.slot === "coClient" && has(f, "life.cover.coClient") ? "coClient" : "client";
  if (has(f, `life.cover.${who}`) && has(f, `life.recommendedMin.${who}`)) {
    const name = f.adults.find((a) => a.slot === who)?.name ?? p.name;
    return {
      type: "compare",
      headline: `${name}'s life cover vs. what the plan recommends`,
      voice: `${name}'s life cover today is {life.cover.${who}}. The plan recommends at least {life.recommendedMin.${who}}.`,
      left: { key: `life.cover.${who}`, label: "Life cover today" },
      right: { key: `life.recommendedMin.${who}`, label: "Recommended minimum" },
    };
  }
  return null;
}

function moveScene(f, m) {
  const combo = [...f.combos].filter((c) => c.moves.includes(m.title) && c.after > m.after).sort((a, b) => b.after - a.after)[0];
  const pair = combo ? ` Pair it with ${combo.moves.filter((x) => x !== m.title).join(" and ").toLowerCase()}, and it reaches {combo.${combo.i}.after}.` : "";
  // Some moves close a gap without moving the score (e.g. Weah's life cover: 60 -> 60). Say so plainly.
  const voice = m.after > m.before
    ? `One move changes the picture: ${m.title.toLowerCase()}. Your score goes from {move.${m.i}.before} to {move.${m.i}.after}.${pair}`
    : `The move for this: ${m.title.toLowerCase()}. It doesn't change the score, it closes a gap the plan flags.${pair}`;
  return { type: "move", headline: m.title, voice, move: m.i, combo: combo?.i ?? null };
}

/** The move whose title matches `re` with the biggest lift; otherwise the plan's best move. */
function moveFor(f, ...patterns) {
  for (const re of patterns) {
    const hit = [...f.moves].filter((m) => re.test(m.title)).sort((a, b) => b.after - b.before - (a.after - a.before))[0];
    if (hit) return hit;
  }
  return bestMove(f);
}

const listNames = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
const value = (f, k) => f.facts[k]?.value;

// ---------- "What's on your mind most?" ----------
// Each option is built from THIS family's plan, and only offered when the plan has the figures for it.
// Picking one swaps the hook, the comparison and the move. Severity orders the options (max 4 shown).

export function worryVariants(f, p) {
  const n = p.name;
  const ret = `${p.slot}.retirementAge`;
  const out = [];
  const add = (w) => out.push({ ...w, move: w.move.i, scenes: { hook: { type: "hook", ...w.hook }, compare: w.compare ? { type: "compare", ...w.compare } : null, move: moveScene(f, w.move) } });

  // Retirement
  if (has(f, ret) && (has(f, "retirement.savingsRunOutAge") || has(f, "retirement.incomeShareOfNeed"))) {
    const runOut = has(f, "retirement.savingsRunOutAge");
    add({
      id: "retire", emoji: "🏖️", label: `Retiring at {${ret}}`, short: `retiring at {${ret}}`,
      severity: runOut ? 3 : value(f, "retirement.incomeShareOfNeed") < 60 ? 2 : 1,
      hook: runOut
        ? { theme: "retirement", headline: `Retire at {${ret}}? Today, the money runs out at {retirement.savingsRunOutAge}.`, voice: `${n}, you want to retire at {${ret}}. Today, your savings run out at {retirement.savingsRunOutAge}.`, figure: "retirement.savingsRunOutAge" }
        : { theme: "retirement", headline: `Retire at {${ret}}? Income covers {retirement.incomeShareOfNeed} of what you'll spend.`, voice: `${n}, you want to retire at {${ret}}. Income will cover {retirement.incomeShareOfNeed} of what you'll spend. Your savings pay the rest.`, figure: "retirement.incomeShareOfNeed" },
      compare: has(f, "retirement.spendingNeed") && has(f, "retirement.guaranteedIncome")
        ? { headline: "Retirement: what you'll spend vs. what's guaranteed", voice: "In retirement you'll spend about {retirement.spendingNeed}. Guaranteed income covers {retirement.guaranteedIncome}. Your savings have to fill the rest.", left: { key: "retirement.spendingNeed", label: "Yearly spending need" }, right: { key: "retirement.guaranteedIncome", label: "Guaranteed income" } }
        : null,
      move: moveFor(f, /withdraw/i, /saving/i, /glide|growth|allocation/i),
    });
  }

  // The home
  if (has(f, "goal.home.year")) {
    const nearTerm = has(f, "cash.nearTerm.home");
    add({
      id: "home", emoji: "🏠", label: "The home in {goal.home.year}", short: "the home in {goal.home.year}",
      severity: nearTerm && value(f, "cash.accessibleCash") < value(f, "cash.nearTerm.home") ? 3 : 1.5,
      hook: nearTerm
        ? { theme: "home", headline: "The home in {goal.home.year} needs {cash.nearTerm.home} set aside. You hold {cash.accessibleCash}.", voice: `${n}, you want to buy a home in {goal.home.year}. The plan sets aside {cash.nearTerm.home} in cash for it. Today you hold {cash.accessibleCash}.`, figure: "cash.nearTerm.home" }
        : has(f, "cash.cashAboveTotalNeeded")
          ? { theme: "home", headline: "A {goal.home.amount} home in {goal.home.year}. Cash that's free today: {cash.cashAboveTotalNeeded}.", voice: `${n}, the plan buys a home in {goal.home.year}, priced at {goal.home.amount}. After your safety cushion and near-term goals, {cash.cashAboveTotalNeeded} of your cash is free today.`, figure: "goal.home.amount" }
          : { theme: "home", headline: "A {goal.home.amount} home in {goal.home.year}.", voice: `${n}, the plan buys a home in {goal.home.year}, priced at {goal.home.amount}. Here's what stands between you and it.`, figure: "goal.home.amount" },
      compare: nearTerm
        ? { headline: "The home: cash it needs vs. cash you have", voice: "The plan holds {cash.nearTerm.home} for the home's next payment. Your accessible cash today is {cash.accessibleCash}.", left: { key: "cash.nearTerm.home", label: "Cash to set aside for the home" }, right: { key: "cash.accessibleCash", label: "Accessible cash today" } }
        : null,
      move: moveFor(f, /card|debt/i, /saving/i),
    });
  }

  // College
  if (has(f, "education.fundingGap") && f.kids.length) {
    const kids = listNames(f.kids.map((k) => k.name));
    const extra = value(f, "education.extraYearlySaving") > 0 ? " Saving about {education.extraYearlySaving} extra, starting now, gets you there." : "";
    add({
      id: "college", emoji: "🎓", label: `College for ${kids}`, short: `college for ${kids}`, severity: 2,
      hook: { theme: "college", headline: `College for ${kids}: {education.fundingGap} still to fund.`, voice: `${n}, college for ${kids} still needs {education.fundingGap} beyond what's already saved.${extra}`, figure: "education.fundingGap" },
      compare: null,
      move: moveFor(f, /saving/i),
    });
  }

  // A cushion if things go wrong
  if (has(f, "cash.monthsCovered") && has(f, "cash.emergencyReserve.min")) {
    const months = value(f, "cash.monthsCovered");
    const minMonths = Number(f.facts["cash.emergencyReserve.min"].label.match(/\((\d+)/)?.[1] ?? 6);
    add({
      id: "cushion", emoji: "🛟", label: "A cushion if things go wrong", short: "your safety cushion",
      severity: months < 2 ? 3 : months < minMonths ? 2.5 : 0.5,
      hook: { theme: "cushion", headline: "If your income stopped, your cash would last {cash.monthsCovered}.", voice: `${n}, if your income stopped tomorrow, your cash would last {cash.monthsCovered}. The plan recommends keeping {cash.emergencyReserve.min} to {cash.emergencyReserve.max} aside.`, figure: "cash.monthsCovered" },
      compare: { headline: "Your cash vs. the cushion the plan recommends", voice: "You can reach {cash.accessibleCash} in cash. The plan's recommended cushion starts at {cash.emergencyReserve.min}.", left: { key: "cash.accessibleCash", label: "Accessible cash today" }, right: { key: "cash.emergencyReserve.min", label: "Recommended cushion (low end)" } },
      move: moveFor(f, /saving/i, /cash|emergency|reserve/i),
    });
  }

  // The card
  if (has(f, "card.yearlyInterest")) {
    const idle = has(f, "cash.cashAboveReserve");
    add({
      id: "card", emoji: "💳", label: "The card balance", short: "the card",
      severity: value(f, "card.yearlyInterest") >= 2000 ? 2.5 : 1,
      hook: idle
        ? { theme: "idle-cash", headline: "{card.yearlyInterest} in card interest. {cash.cashAboveReserve} of extra cash, sitting still.", voice: `${n}, you pay about {card.yearlyInterest} in card interest, while {cash.cashAboveReserve} sits above your safety cushion.`, figure: "card.yearlyInterest" }
        : { theme: "idle-cash", headline: "{card.balance} on the card at {card.rate}: {card.yearlyInterest} in interest.", voice: `${n}, there's {card.balance} on your card at {card.rate}. That costs you about {card.yearlyInterest} in interest.`, figure: "card.yearlyInterest" },
      compare: idle
        ? { headline: "Two numbers that don't fit together", voice: "Same household, two numbers that don't fit together. The card costs you {card.yearlyInterest}. The extra cash could clear it.", left: { key: "card.yearlyInterest", label: "Card interest you pay" }, right: { key: "cash.cashAboveReserve", label: "Cash above your safety cushion" } }
        : null,
      move: moveFor(f, /card|debt|revolving/i),
    });
  }

  // Protection
  const who = has(f, `life.cover.${p.slot}`) ? p.slot : "client";
  const ins = pillarIndex(f, /Insurance/i);
  const pillarZero = ins >= 0 && f.pillars[ins].points === 0;
  if (pillarZero || value(f, `life.shortfall.${who}`) > 0) {
    const family = f.adults.length > 1 || f.kids.length;
    add({
      id: "protection", emoji: "🛡️", label: family ? "The family, if something happens" : "Being covered if something happens", short: family ? "protecting the family" : "being covered",
      severity: pillarZero ? 3 : 2,
      hook: pillarZero
        ? { theme: "protection", headline: `If something happened tomorrow, who's covered? Protection: {pillar.${ins}.points} of {pillar.${ins}.max}.`, voice: `${n}, if something happened tomorrow, how protected is your family? Your protection score is {pillar.${ins}.points} out of {pillar.${ins}.max}.`, figure: `pillar.${ins}.points` }
        : { theme: "protection", headline: `Life cover: {life.cover.${who}}. The plan recommends at least {life.recommendedMin.${who}}.`, voice: `${n}, if something happened to you, your life cover pays {life.cover.${who}}. The plan recommends at least {life.recommendedMin.${who}}.`, figure: `life.cover.${who}` },
      compare: has(f, `life.recommendedMin.${who}`)
        ? { headline: "Life cover today vs. what the plan recommends", voice: `Your life cover today is {life.cover.${who}}. The plan recommends at least {life.recommendedMin.${who}}.`, left: { key: `life.cover.${who}`, label: "Life cover today" }, right: { key: `life.recommendedMin.${who}`, label: "Recommended minimum" } }
        : null,
      move: moveFor(f, /life|mortality/i, /cover|coverage/i),
    });
  }

  return out.map((w, k) => ({ ...w, k })).sort((a, b) => b.severity - a.severity || a.k - b.k).slice(0, 4).map(({ k, ...w }) => w);
}

// ---------- nerd mode: the numbers behind the score ----------

const METRICS = [
  ["retirement.savingsRunOutAge", "Age savings run out"],
  ["retirement.withdrawalRateAverage", "Average withdrawal rate in retirement"],
  ["retirement.incomeShareOfNeed", "Retirement spending covered by income"],
  ["retirement.spendingGap", "Yearly gap your savings must fill"],
  ["cash.monthsCovered", "Months of expenses in cash"],
  ["education.fundingGap", "College still to fund"],
  ["life.shortfall.@", "Life cover shortfall"],
  ["card.rate", "Card interest rate"],
  ["retirement.savingsLeftAtPlanEnd", "Savings left at the end of the plan"],
  ["retirement.netCashFlowThisYear", "Net cash flow this year"],
];

export function metricsScene(f, p) {
  const tiles = METRICS.map(([k, label]) => [k.replace("@", has(f, k.replace("@", p.slot)) ? p.slot : "client"), label])
    .filter(([k]) => has(f, k) && !(k.startsWith("life.shortfall") && value(f, k) <= 0))
    .slice(0, 6)
    .map(([key, label]) => ({ key, label }));
  if (tiles.length < 3) return null;
  return {
    type: "metrics",
    headline: "The numbers behind it",
    voice: "For the detail-minded: the numbers behind your score. Tap any of them for the exact figure and where it comes from.",
    tiles,
    modes: ["nerd"],
  };
}

function actionScene(f, mode = "choose", m = null) {
  if (mode === "checkin") {
    return {
      type: "action", mode,
      headline: "Did you take your step?",
      voice: "So, did you take your step?",
      options: [m.i],
      cta: ["Yes, done", "Not yet"],
    };
  }
  const order = [...f.moves].sort((a, b) => b.after - b.before - (a.after - a.before)).map((x) => x.i);
  return {
    type: "action", mode,
    headline: "Your turn. Pick your first step.",
    voice: "Your turn. Pick your first step. Just one.",
    options: order,
    cta: ["I'll do this one", "Talk to my advisor"],
  };
}

function stepsScene(f, m) {
  const recs = String(f.narrative?.summary_recommendations ?? "").split(/\n-\s*/).map((s) => s.replace(/^-\s*/, "").trim()).filter(Boolean);
  const words = m.title.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const related = recs.find((r) => words.some((w) => r.toLowerCase().includes(w)));
  return {
    type: "steps",
    headline: `How to: ${m.title.toLowerCase()}`,
    voice: `Here's how to ${m.title.toLowerCase()}, in three steps. You can start the first one today.`,
    steps: [m.action, related ?? "Check how it fits with the rest of your plan.", "Book a short call with your advisor to confirm the details."],
  };
}

// ---------- episodes ----------

export const EPISODES = {
  1: { title: "Your plan in 60 seconds", day: 0 },
  2: { title: "Your first step", day: 3 },
  3: { title: "Did it work?", day: 30 },
};

export function templateStoryboard(f, person, episode = 1, moveIndex = null) {
  const p = personSlot(f, person);
  const m = moveIndex != null ? f.moves[moveIndex] : bestMove(f);
  let scenes;
  let variants = null;
  if (episode === 1) {
    // Pillars are skipped in "keep it simple"; the metrics scene only plays in "nerd mode".
    const pillars = { ...pillarsScene(f), modes: ["straight", "nerd"] };
    scenes = [hookScene(f, p), scoreScene(f), pillars, metricsScene(f, p), timelineScene(f, p), compareScene(f, p), moveScene(f, m), actionScene(f)].filter(Boolean);
    variants = moveIndex == null ? worryVariants(f, p) : [];
  } else if (episode === 2) {
    scenes = [
      { type: "hook", theme: "first-step", headline: `Your first step: ${m.title.toLowerCase()}`, voice: `${p.name}, a few days ago you picked one move: ${m.title.toLowerCase()}. Here's how to actually do it.`, figure: `move.${m.i}.after` },
      stepsScene(f, m),
      moveScene(f, m),
      { type: "action", mode: "commit", headline: "Ready?", voice: "Tap done when it's done. We'll check in with you in a few weeks.", options: [m.i], cta: ["Done", "Remind me tomorrow"] },
    ];
  } else {
    scenes = [
      { type: "hook", theme: "check-in", headline: "A month ago, your score was {score}.", voice: `${p.name}, a month ago your score was {score}. You picked one move: ${m.title.toLowerCase()}.`, figure: "score" },
      actionScene(f, "checkin", m),
      moveScene(f, m),
    ];
  }
  return { caseId: f.caseId, person: p.id, personName: p.name, episode, ...EPISODES[episode], moveIndex: m.i, scenes, variants };
}

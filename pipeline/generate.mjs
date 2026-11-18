// Generates episodes: case -> facts -> storyboard -> (LLM director) -> guard -> (TTS) -> web/episodes/*.json
//
//   node pipeline/generate.mjs --case michael-carter                 (episode 1, every adult)
//   node pipeline/generate.mjs --case timothy-melanie-weah --person melanie --episode 2
//   node pipeline/generate.mjs --all --episode all                   (everything)
//   flags: --no-llm  --no-tts  --no-mcp  --move <index of top_move>
import { mkdirSync, readdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { EPISODES_DIR } from "./env.mjs";
import { listLocalCases, loadCase } from "./sherpas-mcp.mjs";
import { buildFacts } from "./facts.mjs";
import { templateStoryboard, EPISODES } from "./storyboard.mjs";
import { direct } from "./director.mjs";
import { fill, keysIn } from "./guard.mjs";
import { audioName, speak, ttsEnabled } from "./tts.mjs";
import { voiceVariants } from "../web/lib/personalize.js";

// Q1 "What should I call you?" offers the plan's first name plus a common short form.
const NICK = { Michael: "Mike", Timothy: "Tim", Melanie: "Mel", Daniel: "Dan", Emily: "Em", Samantha: "Sam" };

// Plain-English fallbacks for the "tap a number" card when the LLM gave none.
const SIMPLE = {
  score: "A 0 to 100 check-up of your whole financial life. Higher is healthier.",
  "retirement.savingsRunOutAge": "The age when, if nothing changes, your savings and investments would be used up.",
  "retirement.spendingNeed": "What you're expected to spend each year once you stop working, in today's money.",
  "retirement.guaranteedIncome": "Money that keeps arriving in retirement no matter what markets do, like Social Security.",
  "card.yearlyInterest": "What the card balance costs you each year just in interest.",
  "cash.cashAboveReserve": "Cash beyond the safety cushion the plan recommends keeping for emergencies.",
  "plan.endAge": "How far ahead the plan looks.",
};

const MARKER_LABEL = (key) =>
  /retirementAge/.test(key) ? "Retire" : key === "retirement.savingsRunOutAge" ? "Savings run out" : key === "plan.endAge" ? "Plan ends" : key;

function factOut(f, key, label) {
  const x = f.facts[key];
  if (!x) return null;
  return { key, value: x.value, display: x.display, exact: x.exact, label: label ?? x.label };
}

function resolveScene(s, f, p) {
  const out = {
    type: s.type,
    headline: fill(s.headline, f.facts, "display"),
    caption: fill(s.voice, f.facts, "display"),
    voice: fill(s.voice, f.facts, "voice"),
    keys: [...new Set([...keysIn(s.headline), ...keysIn(s.voice)])],
    from: { headline: s.headlineFrom ?? "template", voice: s.voiceFrom ?? "template" },
  };
  if (s.modes) out.modes = s.modes;
  const moveOut = (i) => {
    const m = f.moves[i];
    return { i, title: m.title, action: m.action, effort: m.effort, before: m.before, after: m.after, beforeKey: `move.${i}.before`, afterKey: `move.${i}.after` };
  };
  switch (s.type) {
    case "hook":
      out.theme = s.theme;
      out.figure = factOut(f, s.figure);
      break;
    case "score":
      Object.assign(out, { score: f.facts.score.value, band: s.band, colour: s.colour });
      out.keys.push("score");
      break;
    case "pillars":
      out.items = f.pillars.map((p) => ({ label: p.label, points: p.points, max: p.max, key: p.keyPoints }));
      Object.assign(out, { best: s.best, worst: s.worst });
      out.keys.push(...out.items.map((p) => p.key));
      break;
    case "timeline":
      // Savings and investments (clipped at zero), plotted against this person's own age.
      out.series = f.series.map((y) => ({ year: y.year, age: p.age + (y.year - f.series[0].year), value: Math.max(0, y.investable) }));
      out.seriesLabel = "Savings and investments";
      out.markers = s.markers.map((k) => factOut(f, k, MARKER_LABEL(k))).filter(Boolean);
      // The run-out age is stated for the plan's client: shift it onto this person's age axis.
      if (p.slot === "coClient") {
        const shift = p.age - f.adults[0].age;
        out.markers = out.markers.map((m) => (m.key === "retirement.savingsRunOutAge" ? { ...m, axisAge: m.value + shift } : m));
      }
      out.keys.push(...out.markers.map((m) => m.key));
      break;
    case "compare":
      out.left = factOut(f, s.left.key, s.left.label);
      out.right = factOut(f, s.right.key, s.right.label);
      out.keys.push(s.left.key, s.right.key);
      break;
    case "move":
      out.move = moveOut(s.move);
      out.combo = s.combo != null ? { after: f.combos[s.combo].after, moves: f.combos[s.combo].moves, key: `combo.${s.combo}.after` } : null;
      out.keys.push(out.move.beforeKey, out.move.afterKey, ...(out.combo ? [out.combo.key] : []));
      break;
    case "steps":
      out.steps = s.steps;
      break;
    case "metrics":
      out.tiles = s.tiles.map((t) => factOut(f, t.key, t.label)).filter(Boolean);
      out.keys.push(...out.tiles.map((t) => t.key));
      break;
    case "action":
      Object.assign(out, { mode: s.mode, cta: s.cta, options: s.options.map(moveOut) });
      out.keys.push(...out.options.flatMap((o) => [o.beforeKey, o.afterKey]));
      break;
  }
  out.keys = [...new Set(out.keys)].filter((k) => f.facts[k]);
  return out;
}

function explainFor(keys, f, llmExplain) {
  const map = {};
  for (const k of keys) {
    const x = f.facts[k];
    const simple = llmExplain[k] ? fill(llmExplain[k], f.facts, "display") : SIMPLE[k] ?? (/^pillar\./.test(k) ? "Points this area adds to your score." : /^move\./.test(k) ? "Your score before and after this one move, as the plan calculates it." : x.label + ".");
    map[k] = {
      label: x.label,
      value: x.exact,
      simple,
      expert: `${x.label}: ${x.exact}${x.period ? ` (${x.period})` : ""}.${x.derived ? " Calculated from figures in the plan." : " Straight from the Sherpas plan."}${x.note ? ` ${x.note}` : ""}`,
    };
  }
  return map;
}

export async function generateEpisode(caseId, person, episode, opts = {}) {
  const c = await loadCase(caseId, { useMcp: opts.mcp !== false });
  const f = buildFacts(c);
  const people = person ? [person] : f.adults.map((a) => a.id);
  const written = [];
  for (const who of people) {
    let sb = templateStoryboard(f, who, episode, opts.move ?? null);
    let explain = {};
    let report = [];
    if (opts.llm !== false) ({ storyboard: sb, explain, report } = await direct(sb, f));
    const p = f.adults.find((a) => a.id === sb.person);
    const scenes = sb.scenes.map((s) => resolveScene(s, f, p));

    // Personalization: everything the 4 onboarding questions can switch to, pre-built and pre-checked.
    const names = [p.name, ...(NICK[p.name] ? [NICK[p.name]] : [])];
    const worries = (sb.variants ?? []).map((v) => ({
      id: v.id, emoji: v.emoji, move: v.move,
      label: fill(v.label, f.facts, "display"),
      short: fill(v.short, f.facts, "display"),
      scenes: {
        hook: resolveScene(v.scenes.hook, f, p),
        compare: v.scenes.compare ? resolveScene(v.scenes.compare, f, p) : null,
        move: resolveScene(v.scenes.move, f, p),
      },
    }));
    const personalize = {
      names,
      household: [...f.adults.filter((a) => a.id !== p.id).map((a) => a.name), ...f.kids.map((k) => k.name)],
      d6: String(f.persona.D6 ?? "").match(/^([A-Z]+)/)?.[1] ?? null,
      d6Text: String(f.persona.D6 ?? "").split(/(?<=\.)\s/)[0] || null,
      worries,
    };
    const allScenes = [...scenes, ...worries.flatMap((w) => [w.scenes.hook, w.scenes.compare, w.scenes.move].filter(Boolean))];

    // Voice: one clip per distinct line, including every name variant a viewer can pick.
    const audio = {};
    if (opts.tts !== false && ttsEnabled()) {
      const lines = [...new Set(allScenes.flatMap((s) => voiceVariants(s.voice, names)))];
      let created = 0, chars = 0;
      for (const text of lines) {
        const name = audioName(text);
        try {
          if ((await speak(text, join(EPISODES_DIR, caseId, "audio", name))) === "created") { created++; chars += text.length; }
          audio[text] = `${caseId}/audio/${name}`;
        } catch (err) {
          report.push(`tts: ${err.message}`);
          break;
        }
      }
      report.push(`tts: ${lines.length} lines, ${created} new clips, ${chars} new characters`);
      for (const s of scenes) s.audio = audio[s.voice] ?? null;
    }
    const ep = {
      caseId, person: sb.person, personName: sb.personName, episode, title: sb.title, day: sb.day,
      source: c.source, generatedAt: new Date().toISOString(),
      family: { adults: f.adults.map(({ id, name, role }) => ({ id, name, role })), location: f.location, score: f.facts.score.value, band: f.band },
      scenes,
      personalize,
      audio,
      explain: explainFor([...new Set(allScenes.flatMap((s) => s.keys))], f, explain),
      report,
    };
    const dir = join(EPISODES_DIR, caseId, sb.person);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `ep${episode}.json`);
    writeFileSync(file, JSON.stringify(ep, null, 2));
    written.push({ file, ep });
    console.log(`✓ ${caseId}/${sb.person}/ep${episode}  (${c.source}, ${scenes.length} scenes${report.length ? `, ${report.length} notes` : ""})`);
    for (const r of report) console.log(`    · ${r}`);
  }
  writeManifest();
  return written;
}

export function writeManifest() {
  const cases = [];
  if (!existsSync(EPISODES_DIR)) return;
  for (const caseId of readdirSync(EPISODES_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
    const people = [];
    let family = null;
    for (const p of readdirSync(join(EPISODES_DIR, caseId), { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== "audio")) {
      const eps = readdirSync(join(EPISODES_DIR, caseId, p.name)).map((n) => n.match(/^ep(\d)\.json$/)?.[1]).filter(Boolean).map(Number).sort();
      if (!eps.length) continue;
      const first = JSON.parse(readFileSync(join(EPISODES_DIR, caseId, p.name, `ep${eps[0]}.json`), "utf8"));
      family = first.family;
      people.push({ id: p.name, name: first.personName, episodes: eps });
    }
    if (people.length) cases.push({ caseId, family, people });
  }
  writeFileSync(join(EPISODES_DIR, "index.json"), JSON.stringify({ episodes: EPISODES, cases }, null, 2));
}

// ---------- CLI ----------

function parseArgs(argv) {
  const a = { flags: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith("--no-")) a.flags.add(t.slice(5));
    else if (t === "--all") a.all = true;
    else if (t.startsWith("--")) a[t.slice(2)] = argv[++i];
  }
  return a;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = parseArgs(process.argv.slice(2));
  const cases = a.all ? listLocalCases() : a.case ? [a.case] : [];
  if (!cases.length) {
    console.log("Usage: node pipeline/generate.mjs --case <caseId> | --all  [--person <name>] [--episode 1|2|3|all] [--no-llm] [--no-tts] [--no-mcp] [--move <i>]");
    console.log("Cases:", listLocalCases().join(", "));
    process.exit(1);
  }
  const episodes = a.episode === "all" ? [1, 2, 3] : [Number(a.episode ?? 1)];
  const opts = { llm: !a.flags.has("llm"), tts: !a.flags.has("tts"), mcp: !a.flags.has("mcp"), move: a.move != null ? Number(a.move) : null };
  for (const caseId of cases) for (const ep of episodes) await generateEpisode(caseId, a.person?.toLowerCase(), ep, opts);
}

// The director: an LLM rewrites the template lines so they sound made for this person
// (risk profile, decision style, motivations, tensions from persona.md), keeping the same scenes.
// It never writes numbers: only {placeholders} from the fact catalog. guard.mjs enforces that.
import { env, hasKey } from "./env.mjs";
import { factCatalog } from "./facts.mjs";
import { choose, checkLine } from "./guard.mjs";

const SYSTEM = `You are the scriptwriter of "Plan in Motion": 60-second, short-video-style episodes that explain a family's existing financial plan (made by Sherpas) to one person in that family.

Hard rules:
- English only. Speak directly to the person ("you"), by first name in the opening line.
- NEVER write a number with digits or in words when it is a money amount, age, score, percentage or count from the plan. Every such figure must be a placeholder copied exactly from the FACTS list, e.g. {score} or {retirement.savingsRunOutAge}. Small words like "one step" or "three steps" are fine.
- Use only facts from the list. Do not invent figures, products, dates or advice that is not in the plan.
- Keep every scene: same order, same type, same meaning. Rewrite only "headline" (on screen, max 12 words) and "voice" (spoken, max 28 words).
- Scene 0 is the hook: it must create curiosity in the first three seconds.
- Hard news: say it plainly, then give the person agency. Never shame.
- Match tone to the person: growth-minded people get direct, opportunity framing; moderate or cautious people get calm, safety-first framing. Respect their decision style.
- Output JSON only: {"scenes":[{"i":0,"headline":"...","voice":"..."}],"explain":{"<fact key>":"one plain sentence a beginner understands, no digits"}}. Give "explain" for every fact key used in your lines.`;

function personaBrief(f, p) {
  const pick = (k, n = 900) => (f.persona[k] ? `${k}: ${f.persona[k].slice(0, n)}` : "");
  const tensions = Object.entries(f.persona).find(([k]) => /^Tensions/i.test(k))?.[1] ?? "";
  const subjective = Object.entries(f.persona).find(([k]) => /^Subjective/i.test(k))?.[1] ?? "";
  return [
    `Person: ${p.name} (${p.role}, age ${p.age}, risk profile ${p.risk ?? "unknown"}).`,
    `Household: ${f.adults.map((a) => `${a.name} (${a.age})`).join(", ")}${f.kids.length ? `; children ${f.kids.map((k) => `${k.name} (${k.age})`).join(", ")}` : ""}. ${f.location}.`,
    pick("D4"), pick("D5"), pick("D6"),
    subjective && `Subjective concerns: ${subjective.slice(0, 500)}`,
    tensions && `Tensions: ${tensions.slice(0, 1400)}`,
  ].filter(Boolean).join("\n\n");
}

export async function chat(messages, { json = true } = {}) {
  const res = await fetch(`${env.LLM_PROXY_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.TEAM_KEY}` },
    body: JSON.stringify({ model: env.TEXT_MODEL, messages, ...(json ? { response_format: { type: "json_object" } } : {}) }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/** Returns the storyboard with lines rewritten where the LLM passed the guard, plus an explain map. */
export async function direct(storyboard, f) {
  if (!hasKey(env.TEAM_KEY)) return { storyboard, explain: {}, report: ["no TEAM_KEY: template lines kept"] };
  const p = f.adults.find((a) => a.id === storyboard.person);
  // Base scenes first, then the alternative hook / comparison / move for each "what's on your mind" answer.
  const flatten = (sb) => [...sb.scenes, ...(sb.variants ?? []).flatMap((v) => [v.scenes.hook, v.scenes.compare, v.scenes.move].filter(Boolean))];
  const alt = new Map((storyboard.variants ?? []).flatMap((v) => [v.scenes.hook, v.scenes.compare, v.scenes.move].filter(Boolean).map((s) => [s, v.id])));
  const scenes = flatten(storyboard).map((s, i) => ({ i, type: s.type, headline: s.headline, voice: s.voice, ...(alt.has(s) ? { alt: alt.get(s) } : {}) }));
  const user = [
    `EPISODE ${storyboard.episode}: "${storyboard.title}" (day ${storyboard.day} after the plan arrives).`,
    `PERSON\n${personaBrief(f, p)}`,
    `PLAN SUMMARY\n${String(f.narrative?.summary_main ?? "").slice(0, 1800)}`,
    `FACTS (the only figures you may use, as placeholders)\n${factCatalog(f)}`,
    `SCENES TO REWRITE (keep order and meaning)\n${JSON.stringify(scenes, null, 1)}`,
    ...(alt.size ? ['Scenes with "alt" are alternative versions of the hook, comparison or move, played when the person says that topic is what worries them most. Rewrite them the same way; an "alt" hook is still the first scene they see.'] : []),
  ].join("\n\n");

  let out;
  try {
    out = JSON.parse(await chat([{ role: "system", content: SYSTEM }, { role: "user", content: user }]));
  } catch (err) {
    return { storyboard, explain: {}, report: [`LLM failed (${err.message}): template lines kept`] };
  }

  const report = [];
  const next = structuredClone(storyboard);
  const flat = flatten(next);
  for (const s of out.scenes ?? []) {
    const scene = flat[s.i];
    if (!scene) continue;
    for (const field of ["headline", "voice"]) {
      const r = choose(s[field], scene[field], f.facts);
      if (r.problems.length) report.push(`scene ${s.i} ${field}: kept template (${r.problems.join("; ")})`);
      scene[field] = r.line;
      scene[`${field}From`] = r.from;
    }
  }
  const explain = {};
  for (const [k, line] of Object.entries(out.explain ?? {})) {
    if (f.facts[k] && !checkLine(line, f.facts).length) explain[k] = line;
  }
  return { storyboard: next, explain, report };
}

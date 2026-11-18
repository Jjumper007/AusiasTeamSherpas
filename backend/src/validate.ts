// Deterministic checks (SPEC §5.5). The figure check is the one that matters most:
// no number with more than two digits may appear unless it is one of the plan's facts, as fmt writes it.
import type { Facts } from "./facts.js";
import type { Script } from "./script.js";

const NUMBER = /\$?\d[\d,]*(?:\.\d+)?(?:[KMk%]|\/yr)?/g;
const digits = (t: string) => t.replace(/\D/g, "").length;

/** Every way a fact may be written: display ("$1.4M"), exact ("$1,427,456"), spoken ("1.4 million"). */
export function allowedNumbers(facts: Facts): Set<string> {
  const ok = new Set<string>();
  for (const f of Object.values(facts)) {
    for (const form of [f.display, f.exact, f.spoken, String(f.value)]) {
      for (const t of form.match(NUMBER) ?? []) ok.add(t.replace(/\/yr$/, ""));
    }
  }
  return ok;
}

/** Returns the numbers in `text` that don't come from the facts. */
export function checkFigures(text: string, facts: Facts, ok = allowedNumbers(facts)): string[] {
  return (text.match(NUMBER) ?? [])
    .map((t) => t.replace(/[.,]$/, "").replace(/\/yr$/, ""))
    .filter((t) => digits(t) > 2 && !ok.has(t));
}

export interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}

export function checkScript(script: Script, facts: Facts, seconds: number[]): Check[] {
  const ok = allowedNumbers(facts);
  const texts = [...script.scenes.map((s) => s.narration), ...script.chapters.flatMap((c) => [c.title, c.body]), script.cta.text];
  const bad = [...new Set(texts.flatMap((t) => checkFigures(t, facts, ok)))];
  const unknown = [...new Set(script.scenes.flatMap((s) => s.factsUsed).filter((k) => !facts[k]))];
  const total = seconds.reduce((a, b) => a + b, 0);
  return [
    { name: "figures", ok: bad.length === 0, detail: bad.length ? `numbers not in the plan: ${bad.join(", ")}` : undefined },
    { name: "facts used", ok: unknown.length === 0, detail: unknown.length ? `unknown facts: ${unknown.join(", ")}` : undefined },
    { name: "hook under 8 s", ok: (seconds[0] ?? 0) <= 8, detail: `${(seconds[0] ?? 0).toFixed(1)} s` },
    // SPEC: 60-90 s target, the validator accepts up to 120 s. The plan-only fallback runs shorter: a warning, not a failure.
    { name: "length 60-120 s", ok: total >= 60 && total <= 120, detail: `${total.toFixed(1)} s` },
  ];
}

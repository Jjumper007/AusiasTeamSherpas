// The guard: lines are written with {placeholders}; this fills them from facts and rejects any
// line that carries a number of its own. Result: no invented figures, by construction.
//
//   {score}            -> the default form for the medium ("26" on screen, "26" in the voice)
//   {card.balance}     -> "$18K" on screen, "18 thousand dollars" in the voice
//   {card.balance|exact} -> "$18,000" (forms: display, exact, spoken)

const PLACEHOLDER = /\{([a-zA-Z0-9_.]+)(?:\|(display|exact|spoken))?\}/g;

export function checkLine(line, facts) {
  const problems = [];
  if (typeof line !== "string" || !line.trim()) return ["empty line"];
  for (const [, key] of line.matchAll(PLACEHOLDER)) {
    if (!facts[key]) problems.push(`unknown fact {${key}}`);
  }
  const bare = line.replace(PLACEHOLDER, "");
  if (/\d/.test(bare)) problems.push(`raw number in "${bare.match(/\S*\d\S*/)?.[0]}"`);
  return problems;
}

export function fill(line, facts, medium = "display") {
  return line.replace(PLACEHOLDER, (_, key, form) => {
    const f = facts[key];
    if (!f) throw new Error(`unknown fact {${key}}`);
    return f[form ?? (medium === "voice" ? "spoken" : "display")];
  });
}

/** Keys used in a line, so the player can make those numbers tappable. */
export function keysIn(line) {
  return [...String(line ?? "").matchAll(PLACEHOLDER)].map((m) => m[1]);
}

/**
 * Picks the LLM line when it passes the checks, otherwise the template line.
 * Returns { line, from: "llm" | "template", problems }.
 */
export function choose(llmLine, templateLine, facts) {
  if (llmLine) {
    const problems = checkLine(llmLine, facts);
    if (!problems.length) return { line: llmLine, from: "llm", problems };
    return { line: templateLine, from: "template", problems };
  }
  return { line: templateLine, from: "template", problems: [] };
}

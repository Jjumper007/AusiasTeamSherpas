// Number helpers for count-up animations. They mirror pipeline/facts.mjs so a number
// that animates lands exactly on the string the pipeline wrote.

export function money(v, compact = true) {
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (compact && a >= 1e6) return `${sign}$${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, "")}M`;
  if (compact && a >= 1e4) return `${sign}$${Math.round(a / 1e3)}K`;
  return `${sign}$${Math.round(a).toLocaleString("en-US")}`;
}

/** Formats an in-between value the same way as `display` (e.g. "$66K", "$3,240/yr", "85"). */
export function like(display, value) {
  const suffix = display.endsWith("/yr") ? "/yr" : display.endsWith("%") ? "%" : display.endsWith(" mo") ? " mo" : "";
  const decimals = /\.\d/.test(display) ? 1 : 0;
  if (display.startsWith("$")) return money(value) + suffix;
  if (suffix === "%") return `${value.toFixed(decimals)}%`;
  if (suffix === " mo") return `${value.toFixed(decimals)} mo`;
  return `${Math.round(value)}`;
}

/** Animates el's text from `from` to fact.value, formatted like fact.display. */
export function countUp(tl, el, fact, { from = 0, duration = 1.2, at = 0 } = {}) {
  const o = { v: from };
  el.textContent = like(fact.display, from);
  tl.to(o, {
    v: fact.value,
    duration,
    ease: "power3.out",
    onUpdate: () => (el.textContent = like(fact.display, o.v)),
    onComplete: () => (el.textContent = fact.display),
  }, at);
  return tl;
}

/** Splits text into word spans for kinetic type; words with digits get the "hl" class. */
export function words(text) {
  return text
    .split(/\s+/)
    .map((w) => `<span class="w${/[\d$]/.test(w) ? " hl" : ""}"><span>${escapeHtml(w)}</span></span>`)
    .join(" ");
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

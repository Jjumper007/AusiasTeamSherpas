// personalize(episode, answers): turns a generated episode into THIS viewer's episode.
// Pure function, no DOM: the player uses it, the pipeline uses it to pre-voice the variants,
// and a Remotion composition can call it on its inputProps.
//
// answers = {
//   name:   "Mike" | any text           Q1 "What should I call you?"
//   mode:   "simple" | "straight" | "nerd"   Q3 "How should I explain it?"
//   worry:  "<variant id>" | "other"   Q4 "What's on your mind most?"   (+ worryText when "other")
//   anchor: "freedom" | "security" | "family" | "experiences"   Q5 "Money, for you, is mostly about…"
// }
//
// It never touches a figure: every number on screen still comes from the pipeline's facts.
// Answers only choose between pre-built, pre-checked scenes and change words, order and colour.

export const MODES = {
  simple: { emoji: "🌱", label: "Keep it simple", sub: "No jargon, fewer numbers" },
  straight: { emoji: "🙂", label: "Straight talk", sub: "The plan, plainly" },
  nerd: { emoji: "📊", label: "Nerd mode", sub: "Every number, exact" },
};

export const ANCHORS = {
  freedom: { emoji: "🕊️", label: "Freedom", why: "Every point here is more room to choose later.", whyGap: "Fewer bad surprises means more room to choose later.", pick: "Pick your first step toward more freedom." },
  security: { emoji: "🛡️", label: "Security", why: "Every point here is one less thing that can go wrong.", whyGap: "One less thing that can go wrong.", pick: "Pick your first step toward feeling secure." },
  family: { emoji: "👨‍👩‍👧", label: "Family", why: null, whyGap: null, pick: "Pick your first step for your family." },
  experiences: { emoji: "🌍", label: "Experiences", why: "Every point here keeps the trips and plans on the calendar.", whyGap: "It keeps the trips and plans safe from a bad surprise.", pick: "Pick your first step toward the life you want." },
};

// What the plan's persona (D6, low confidence) guessed, mapped onto our four answers.
const D6_MATCH = { FREEDOM: ["freedom", "experiences"], PROTECTION: ["security", "family"], SECURITY: ["security"], DUTY: ["family"], FAMILY: ["family"], LEGACY: ["family"] };

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Replaces the person's first name (also in "Michael's") with the name they chose. */
export function renameText(text, formal, chosen) {
  if (!text || !chosen || chosen === formal) return text;
  return text.replace(new RegExp(`\\b${escRe(formal)}\\b`, "g"), chosen);
}

/** Drops the name: "Michael, you want…" -> "You want…". Used for voice when no clip exists for a typed name. */
export function dropName(text, formal) {
  if (!text) return text;
  const t = text.replace(new RegExp(`^${escRe(formal)},\\s*`), "");
  return t === text ? text : t.charAt(0).toUpperCase() + t.slice(1);
}

/** Every voice line a viewer could end up hearing for this line (formal, nickname, no name). */
export function voiceVariants(text, names) {
  const [formal, ...others] = names;
  return [...new Set([text, ...others.map((n) => renameText(text, formal, n)), dropName(text, formal)])];
}

export function familyWhy(P, lifts = true) {
  const lead = lifts ? "Every point here protects" : "This one protects";
  return P?.household?.length ? `${lead} ${listNames(P.household)}.` : `${lead} the people who count on you.`;
}

const listNames = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

/** "Mike's plan, starting with the home in 2027" */
export function recipeTitle(ep, a = {}) {
  const name = a.name || ep.personName;
  const w = ep.personalize?.worries?.find((x) => x.id === a.worry);
  if (w) return `${name}'s plan, starting with ${w.short}`;
  return `${name}'s plan${ep.episode === 1 ? " in 60 seconds" : `: ${ep.title.toLowerCase()}`}`;
}

/** Does the anchor the person picked match the plan's own guess (persona D6)? */
export function anchorVsPersona(P, anchor) {
  const guess = P?.d6;
  if (!guess || !anchor) return null;
  return { guess, matches: (D6_MATCH[guess] ?? []).includes(anchor) };
}

export function personalize(ep, a = {}) {
  const out = structuredClone(ep);
  const P = out.personalize ?? {};
  const formal = ep.personName;
  const hasAudio = ep.audio && Object.keys(ep.audio).length > 0;
  out.answers = { ...a };

  // Q4: what's on your mind -> swap hook, comparison and move for the pre-built variant.
  const w = (P.worries ?? []).find((x) => x.id === a.worry);
  if (w) {
    out.scenes = out.scenes.map((s) => (s.type === "hook" ? w.scenes.hook : s.type === "move" ? w.scenes.move : s));
    if (w.scenes.compare) {
      const at = out.scenes.findIndex((s) => s.type === "compare");
      if (at >= 0) out.scenes[at] = w.scenes.compare;
      else out.scenes.splice(out.scenes.findIndex((s) => s.type === "move"), 0, w.scenes.compare);
    }
    // The move that fits their worry goes first in the final choice, tagged.
    for (const s of out.scenes.filter((s) => s.type === "action" && s.mode === "choose")) {
      s.options = [...s.options].sort((x, y) => (y.i === w.move) - (x.i === w.move)).map((o) => ({ ...o, match: o.i === w.move }));
    }
  }

  // Q3: how should I explain it -> which scenes play and what the number card opens with.
  const mode = MODES[a.mode] ? a.mode : "straight";
  out.scenes = out.scenes.filter((s) => !s.modes || s.modes.includes(mode));
  out.explainOpen = mode === "nerd" ? "expert" : "simple";

  // Q5: what money is about -> colour theme, the "why" under the move, the final question.
  const anchor = ANCHORS[a.anchor] ? a.anchor : null;
  out.anchor = anchor;
  if (anchor) {
    for (const s of out.scenes) {
      if (s.type === "move") {
        const lifts = s.move.after > s.move.before; // a move that closes a gap without moving the score
        s.why = anchor === "family" ? familyWhy(P, lifts) : lifts ? ANCHORS[anchor].why : ANCHORS[anchor].whyGap;
      }
      if (s.type === "action" && s.mode === "choose") s.headline = ANCHORS[anchor].pick;
    }
  }

  // Q1: what should I call you -> name on screen; in the voice too, if we have that clip (or no clips at all).
  const name = (a.name || "").trim();
  if (name && name !== formal) {
    for (const s of out.scenes) {
      s.headline = renameText(s.headline, formal, name);
      const spoken = renameText(s.voice, formal, name);
      if (!hasAudio || ep.audio[spoken] || spoken === s.voice) {
        s.voice = spoken;
        s.caption = renameText(s.caption, formal, name);
      } else {
        s.voice = dropName(s.voice, formal);
        s.caption = dropName(s.caption, formal);
      }
    }
  }

  // One clip per distinct voice line (the pipeline voices every variant); none -> browser voice.
  for (const s of out.scenes) s.audio = ep.audio ? ep.audio[s.voice] ?? null : s.audio ?? null;
  out.recipeTitle = recipeTitle(ep, a);
  return out;
}

// Move: the one action that changes the picture, with the score jumping from before to after.
// Some moves close a gap without moving the score: then we say that, instead of "+0 points".
// scene.why (from the "Money, for you, is about…" answer) says why it matters to this person.
import { countUp, escapeHtml } from "../lib/format.js";

export default function move(scene, el, { gsap }) {
  const m = scene.move;
  const lifts = m.after > m.before;
  el.className = "scene-layer s-move";
  el.innerHTML = `
    <h1 class="headline">${escapeHtml(m.title)}</h1>
    ${lifts ? `
      <div class="jump">
        <span class="big from" data-key="${m.beforeKey}">${m.before}</span>
        <span class="arrow" aria-label="to">→</span>
        <span class="big to" data-key="${m.afterKey}">${m.after}</span>
      </div>
      <div><span class="lift">+${m.after - m.before} points</span></div>` : `
      <p class="gap-note">Score stays at <b data-key="${m.afterKey}">${m.after}</b>. It closes a gap the plan flags.</p>`}
    ${scene.combo ? `<p class="combo">Together with ${escapeHtml(scene.combo.moves.filter((t) => t !== m.title).join(" + ").toLowerCase())}: <b data-key="${scene.combo.key}">${scene.combo.after}</b></p>` : ""}
    ${scene.why ? `<p class="why">${escapeHtml(scene.why)}</p>` : ""}`;

  const tl = gsap.timeline({ paused: true });
  tl.from(el.querySelectorAll(".headline"), { y: 30, opacity: 0, duration: 0.5, stagger: 0.1 }, 0);
  if (lifts) {
    tl.from(el.querySelector(".jump"), { opacity: 0, duration: 0.3 }, 0.5);
    countUp(tl, el.querySelector(".to"), { value: m.after, display: String(m.after) }, { from: m.before, duration: 1.4, at: 0.8 });
    tl.from(el.querySelector(".lift"), { scale: 0, duration: 0.4, ease: "back.out(3)" }, 2.0);
  } else {
    tl.from(el.querySelector(".gap-note"), { y: 16, opacity: 0, duration: 0.4 }, 0.6);
  }
  if (scene.combo) tl.from(el.querySelector(".combo"), { y: 16, opacity: 0, duration: 0.4 }, 2.6);
  if (scene.why) tl.from(el.querySelector(".why"), { y: 16, opacity: 0, duration: 0.45 }, scene.combo ? 3.1 : 2.6);
  return tl;
}

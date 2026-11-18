// Compare: two figures face off. Turns abstract numbers into "this vs that".
import { countUp, escapeHtml } from "../lib/format.js";

export default function compare(scene, el, { gsap }) {
  const { left, right } = scene;
  el.className = "scene-layer s-compare";
  el.innerHTML = `
    <h1 class="headline">${escapeHtml(scene.headline)}</h1>
    <div class="versus">
      <div class="side left"><div class="big" data-key="${left.key}">${left.display}</div><p>${escapeHtml(left.label)}</p></div>
      <div class="vs">vs</div>
      <div class="side right"><div class="big" data-key="${right.key}">${right.display}</div><p>${escapeHtml(right.label)}</p></div>
    </div>`;

  const tl = gsap.timeline({ paused: true });
  tl.from(el.querySelector(".headline"), { y: 30, opacity: 0, duration: 0.5 }, 0);
  tl.from(el.querySelector(".side.left"), { x: -60, opacity: 0, duration: 0.6, ease: "power3.out" }, 0.3);
  tl.from(el.querySelector(".side.right"), { x: 60, opacity: 0, duration: 0.6, ease: "power3.out" }, 0.9);
  tl.from(el.querySelector(".vs"), { scale: 0, duration: 0.4, ease: "back.out(3)" }, 0.7);
  countUp(tl, el.querySelector(".side.left .big"), left, { duration: 1, at: 0.4 });
  countUp(tl, el.querySelector(".side.right .big"), right, { duration: 1, at: 1.0 });
  return tl;
}

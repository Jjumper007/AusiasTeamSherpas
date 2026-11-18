// Hook: the first three seconds. A big number counts up and the headline lands word by word.
import { countUp, words } from "../lib/format.js";

export default function hook(scene, el, { gsap }) {
  const fig = scene.figure;
  el.className = `scene-layer s-hook theme-${scene.theme ?? "default"}`;
  el.innerHTML = `
    ${fig ? `<div class="big figure" data-key="${fig.key}" style="--len:${fig.display.length}">${fig.display}</div>` : ""}
    <h1 class="headline">${words(scene.headline)}</h1>`;

  const tl = gsap.timeline({ paused: true });
  if (fig) {
    const figEl = el.querySelector(".figure");
    tl.from(figEl, { scale: 0.6, opacity: 0, duration: 0.5, ease: "back.out(2)" }, 0);
    countUp(tl, figEl, fig, { from: 0, duration: 1.1, at: 0.05 });
  }
  tl.from(el.querySelectorAll(".headline .w > span"), { yPercent: 110, duration: 0.55, ease: "power4.out", stagger: 0.06 }, 0.25);
  return tl;
}

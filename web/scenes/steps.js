// Steps: a short how-to for the chosen move (episode 2).
import { escapeHtml } from "../lib/format.js";

export default function steps(scene, el, { gsap }) {
  el.className = "scene-layer s-steps";
  el.innerHTML = `
    <h1 class="headline">${escapeHtml(scene.headline)}</h1>
    <ol class="steps">${scene.steps.map((s) => `<li><span>${escapeHtml(s)}</span></li>`).join("")}</ol>`;

  const tl = gsap.timeline({ paused: true });
  tl.from(el.querySelector(".headline"), { y: 30, opacity: 0, duration: 0.5 }, 0);
  tl.from(el.querySelectorAll(".steps li"), { x: 40, opacity: 0, duration: 0.5, stagger: 0.9, ease: "power3.out" }, 0.4);
  return tl;
}

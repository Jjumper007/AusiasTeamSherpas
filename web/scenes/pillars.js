// Pillars: the five areas behind the score fill up one by one; strongest and weakest are called out.
import { escapeHtml } from "../lib/format.js";

export default function pillars(scene, el, { gsap }) {
  el.className = "scene-layer s-pillars";
  el.innerHTML = `
    <h1 class="headline">${escapeHtml(scene.headline)}</h1>
    <div class="bars">
      ${scene.items.map((p, i) => `
        <div class="bar-row ${i === scene.best ? "best" : ""} ${i === scene.worst ? "worst" : ""}">
          <span class="lbl">${escapeHtml(p.label)}</span>
          <span class="pts"><span data-key="${p.key}">${p.points}</span> / ${p.max}</span>
          <div class="bar"><i style="--w:${(100 * p.points) / p.max}%"></i></div>
        </div>`).join("")}
    </div>`;

  const tl = gsap.timeline({ paused: true });
  tl.from(el.querySelector(".headline"), { y: 30, opacity: 0, duration: 0.5, ease: "power3.out" }, 0);
  tl.from(el.querySelectorAll(".bar-row"), { x: -30, opacity: 0, duration: 0.45, stagger: 0.12, ease: "power3.out" }, 0.2);
  el.querySelectorAll(".bar i").forEach((bar, i) => {
    tl.to(bar, { width: bar.style.getPropertyValue("--w"), duration: 0.9, ease: "power2.out" }, 0.35 + i * 0.12);
  });
  return tl;
}

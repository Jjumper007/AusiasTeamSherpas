// Score: a 0-100 ring fills to the score, coloured by band.
import { countUp } from "../lib/format.js";

const BAND_COLOUR = { critical: "var(--critical)", vulnerable: "var(--vulnerable)", stable: "var(--stable)", strong: "var(--strong)" };

export default function score(scene, el, { gsap }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  el.className = "scene-layer s-score";
  el.innerHTML = `
    <div class="ring">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle class="track" cx="50" cy="50" r="${r}" fill="none" stroke-width="7"></circle>
        <circle class="fill" cx="50" cy="50" r="${r}" fill="none" stroke-width="7" stroke-linecap="round"
          stroke="${BAND_COLOUR[scene.band] ?? "var(--accent)"}" stroke-dasharray="${c}" stroke-dashoffset="${c}"></circle>
      </svg>
      <div class="ring-num big"><div><span class="n" data-key="score">0</span><small>out of 100</small></div></div>
    </div>
    <div>
      <span class="band ${scene.band}">${scene.band}</span>
      <p class="score-label">Financial health score</p>
    </div>`;

  const tl = gsap.timeline({ paused: true });
  tl.to(el.querySelector(".fill"), { strokeDashoffset: c * (1 - scene.score / 100), duration: 1.6, ease: "power3.out" }, 0.2);
  countUp(tl, el.querySelector(".n"), { value: scene.score, display: String(scene.score) }, { duration: 1.6, at: 0.2 });
  tl.from(el.querySelector(".band"), { y: 20, opacity: 0, duration: 0.4, ease: "back.out(2)" }, 1.4);
  tl.from(el.querySelector(".score-label"), { opacity: 0, duration: 0.4 }, 0.1);
  return tl;
}

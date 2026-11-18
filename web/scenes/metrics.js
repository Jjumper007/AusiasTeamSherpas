// Metrics (nerd mode only): the numbers behind the score, as tiles. Each one opens its explanation card.
import { countUp, escapeHtml } from "../lib/format.js";

export default function metrics(scene, el, { gsap }) {
  el.className = "scene-layer s-metrics";
  el.innerHTML = `
    <h1 class="headline">${escapeHtml(scene.headline)}</h1>
    <div class="tiles">
      ${scene.tiles.map((t) => `
        <div class="tile">
          <div class="big" data-key="${t.key}">${t.display}</div>
          <p>${escapeHtml(t.label)}</p>
        </div>`).join("")}
    </div>`;

  const tl = gsap.timeline({ paused: true });
  tl.from(el.querySelectorAll(".headline"), { y: 24, opacity: 0, duration: 0.45, stagger: 0.08 }, 0);
  const tiles = [...el.querySelectorAll(".tile")];
  tl.from(tiles, { y: 26, opacity: 0, duration: 0.4, stagger: 0.12, ease: "power3.out" }, 0.3);
  tiles.forEach((tile, i) => countUp(tl, tile.querySelector(".big"), scene.tiles[i], { duration: 0.9, at: 0.35 + i * 0.12 }));
  return tl;
}

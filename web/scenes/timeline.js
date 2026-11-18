// Timeline: savings and investments by age, drawn left to right. Markers (retire, savings run out)
// pop in as the line reaches them. The y axis is the shape of the story, not a figure to read.
import { escapeHtml } from "../lib/format.js";

export default function timeline(scene, el, { gsap }) {
  const pts = scene.series;
  const W = 1000, H = 420;
  const minAge = pts[0].age, maxAge = pts.at(-1).age;
  const maxV = Math.max(...pts.map((p) => p.value)) || 1;
  const x = (age) => ((age - minAge) / (maxAge - minAge)) * W;
  const y = (v) => H - (v / maxV) * (H - 30);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p.age).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${d} L${W},${H} L0,${H} Z`;
  const ticks = pts.filter((p) => p.age % 10 === 0);

  el.className = "scene-layer s-timeline";
  el.innerHTML = `
    <h1 class="headline">${escapeHtml(scene.headline)}</h1>
    <div class="chart">
      <svg viewBox="0 0 ${W} ${H + 30}" preserveAspectRatio="none" aria-label="${escapeHtml(scene.seriesLabel ?? "")} by age">
        <defs>
          <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.35"></stop>
            <stop offset="1" stop-color="currentColor" stop-opacity="0"></stop>
          </linearGradient>
        </defs>
        <path class="area" d="${area}"></path>
        <path class="line" d="${d}"></path>
        ${scene.markers.map((m) => `<g class="marker"><line x1="${x(m.axisAge ?? m.value)}" x2="${x(m.axisAge ?? m.value)}" y1="0" y2="${H}"></line></g>`).join("")}
        <g class="axis">${ticks.map((t) => `<text x="${x(t.age)}" y="${H + 22}" text-anchor="middle">${t.age}</text>`).join("")}</g>
      </svg>
      ${scene.markers.map((m) => `<span class="marker-tag ${/run out/i.test(m.label) ? "warn" : ""}" data-key="${m.key}" style="left:${(x(m.axisAge ?? m.value) / W) * 100}%">${escapeHtml(m.label)} · ${m.display}</span>`).join("")}
      <span class="chart-label">${escapeHtml(scene.seriesLabel ?? "")} · by age</span>
    </div>`;

  const line = el.querySelector(".line");
  const len = line.getTotalLength();
  gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
  const draw = 2.6;
  const tl = gsap.timeline({ paused: true });
  tl.from(el.querySelector(".headline"), { y: 30, opacity: 0, duration: 0.5 }, 0);
  tl.to(line, { strokeDashoffset: 0, duration: draw, ease: "none" }, 0.3);
  tl.to(el.querySelector(".area"), { opacity: 1, duration: 0.8 }, 0.3 + draw * 0.6);
  el.querySelectorAll(".marker-tag").forEach((tag, i) => {
    const m = scene.markers[i];
    const at = 0.3 + draw * ((m.axisAge ?? m.value) - minAge) / (maxAge - minAge);
    tl.from(tag, { y: -12, opacity: 0, scale: 0.8, duration: 0.35, ease: "back.out(2.5)" }, at);
    tl.from(el.querySelectorAll(".marker line")[i], { opacity: 0, duration: 0.3 }, at);
  });
  return tl;
}

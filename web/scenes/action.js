// Action: the episode ends on a decision, not a fade-out.
//   mode "choose"  (ep1): pick ONE first step from the plan's top moves, then commit or ask the advisor
//   mode "commit"  (ep2): mark the step as done, or be reminded
//   mode "checkin" (ep3): did you do it? yes -> celebrate; not yet -> what's in the way?
// Choices are kept in localStorage (per viewer). In a real product they would go to Sherpas / the advisor.
import { escapeHtml } from "../lib/format.js";

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

export default function action(scene, el, ctx) {
  const { gsap, episode } = ctx;
  ctx.waitForUser = true;
  const key = `pim:${episode.caseId}:${episode.person}`;
  const saved = store.get(key) ?? {};
  const save = (v) => store.set(key, v);

  el.className = "scene-layer s-action";
  el.innerHTML = `
    <h1 class="headline">${escapeHtml(scene.headline)}</h1>
    <div class="options">
      ${scene.options.map((o) => `
        <button class="option${o.match ? " match" : ""}" data-i="${o.i}">
          ${o.match ? `<span class="match-tag">Fits what's on your mind</span>` : ""}
          <span class="t">${escapeHtml(o.title)}</span>
          <span class="meta"><span class="effort">${escapeHtml(o.effort)} effort</span>
            <span class="gain"><span data-key="${o.beforeKey}">${o.before}</span> → <span data-key="${o.afterKey}">${o.after}</span></span></span>
        </button>`).join("")}
    </div>
    <div class="cta-row" hidden>
      ${scene.cta.map((c, i) => `<button class="${i === 0 ? "primary" : ""}" data-cta="${i}">${escapeHtml(c)}</button>`).join("")}
    </div>
    <div class="toast" hidden></div>`;

  const options = [...el.querySelectorAll(".option")];
  const ctaRow = el.querySelector(".cta-row");
  const toast = el.querySelector(".toast");
  let picked = scene.mode === "choose" ? null : scene.options[0];

  const showToast = (html) => {
    toast.innerHTML = html;
    toast.hidden = false;
    gsap.from(toast, { y: 16, opacity: 0, duration: 0.35 });
  };
  const showCta = () => {
    if (!ctaRow.hidden) return;
    ctaRow.hidden = false;
    gsap.from(ctaRow.children, { y: 16, opacity: 0, duration: 0.35, stagger: 0.08 });
  };

  options.forEach((btn) =>
    btn.addEventListener("click", (e) => {
      if (e.target.closest("[data-key]")) return; // tapping the number explains it instead
      if (scene.mode !== "choose") return;
      picked = scene.options.find((o) => o.i === Number(btn.dataset.i));
      options.forEach((b) => b.classList.toggle("picked", b === btn));
      options.forEach((b) => b.classList.toggle("dim", b !== btn));
      showCta();
    }));

  ctaRow.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cta]");
    if (!b) return;
    const i = Number(b.dataset.cta);
    const now = new Date().toISOString();
    if (scene.mode === "choose") {
      save({ ...saved, move: picked.i, moveTitle: picked.title, pickedAt: now, askedAdvisor: i === 1 });
      showToast(i === 0
        ? `Locked in: <b>${escapeHtml(picked.title)}</b>. That's your first step, and your advisor will see it.`
        : `Sent to your advisor: your pick (<b>${escapeHtml(picked.title)}</b>) and what you just watched, so the meeting starts where you are.`);
    } else if (scene.mode === "commit") {
      save({ ...saved, done: i === 0, doneAt: i === 0 ? now : null });
      showToast(i === 0
        ? `Done. Your plan moves from <b>${picked.before}</b> to <b>${picked.after}</b>. We'll check in on day 30. <button data-next="3">Preview it</button>`
        : "We'll remind you tomorrow at a good time. One step, no rush.");
    } else {
      if (i === 0) {
        save({ ...saved, done: true, doneAt: now });
        showToast(`That's how plans move. From <b>${picked.before}</b> to <b>${picked.after}</b>. Your advisor will see it too.`);
      } else {
        showToast(`What's in the way? <span class="cta-row">${["Time", "Money", "Not sure how", "Need to talk with my partner"].map((r) => `<button data-reason="${r}">${r}</button>`).join("")}</span>`);
      }
    }
  });

  toast.addEventListener("click", (e) => {
    const reason = e.target.closest("[data-reason]");
    if (reason) {
      save({ ...saved, blocker: reason.dataset.reason });
      showToast(`Got it: “${escapeHtml(reason.dataset.reason)}”. We'll send a 30-second episode about exactly that, and flag it for your advisor.`);
    }
  });

  if (scene.mode !== "choose") showCta();

  const tl = gsap.timeline({ paused: true });
  tl.from(el.querySelector(".headline"), { y: 30, opacity: 0, duration: 0.5 }, 0);
  tl.from(options, { y: 30, opacity: 0, duration: 0.45, stagger: 0.12, ease: "power3.out" }, 0.25);
  return tl;
}

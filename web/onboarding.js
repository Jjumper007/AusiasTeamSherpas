// Onboarding: four one-tap questions before episode 1, one per page, inside the stage.
// Light Sherpas app screen for the questions; beside them the episode card fills in with each answer.
// After the last answer the stage wipes to navy and the yak runs (game.js) while the episode is
// prepared (prepare(), from the player); when it is ready the yak runs off and the episode starts.
// Returns { done: Promise<answers | null>, cancel() }. null = cancelled (the viewer switched episode).
import { MODES, ANCHORS } from "./lib/personalize.js";
import { escapeHtml } from "./lib/format.js";
import { icon } from "./lib/icons.js";
import { yakRun } from "./game.js";

// One line icon per answer (the JSON keeps emoji for text-only uses such as the MCP server).
const ICONS = {
  name: "user-round",
  mode: { simple: "sprout", straight: "message-square-text", nerd: "chart-column" },
  worry: { retire: "tree-palm", home: "house", college: "graduation-cap", cushion: "life-buoy", card: "credit-card", protection: "shield" },
  anchor: { freedom: "bird", security: "shield-check", family: "users-round", experiences: "earth" },
  other: "pencil-line",
};
const WAIT_STEPS = ["Reading your plan", "Writing your script", "Recording the voice", "Rendering your video"];
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function runOnboarding({ host, ep, gsap, initial = {}, prepare = async () => {} }) {
  const P = ep.personalize ?? {};
  const formal = ep.personName;
  const answers = { ...initial };
  let resolve;
  const done = new Promise((r) => (resolve = r));

  const pages = [
    {
      id: "name",
      title: () => `Hi ${escapeHtml(formal)}. What should I call you?`,
      // A box to write in, filled with the name on the plan: keep it or type the one they go by.
      input: { value: () => answers.name || formal, label: "Your name", max: 24, action: "Continue" },
      options: () => [],
      set: (v) => (answers.name = v),
      clear: () => delete answers.name,
      line: () => ({ icon: ICONS.name, text: answers.name }),
    },
    {
      id: "mode",
      title: () => "How should I explain it?",
      options: () => Object.entries(MODES).map(([value, m]) => ({ value, icon: ICONS.mode[value], label: m.label, sub: m.sub })),
      set: (v) => (answers.mode = v),
      clear: () => delete answers.mode,
      line: () => ({ icon: ICONS.mode[answers.mode], text: MODES[answers.mode].label }),
    },
    {
      id: "worry",
      title: () => `What's on your mind most, ${escapeHtml(answers.name || formal)}?`,
      sub: "These come from your plan.",
      options: () => (P.worries ?? []).map((w) => ({ value: w.id, icon: ICONS.worry[w.id] ?? "clipboard-list", label: w.label })),
      custom: { label: "Something else", placeholder: "In your own words", max: 120 },
      set: (v, typed) => {
        answers.worry = typed ? "other" : v;
        answers.worryText = typed ? v : undefined;
      },
      clear: () => { delete answers.worry; delete answers.worryText; },
      line: () => {
        const w = (P.worries ?? []).find((x) => x.id === answers.worry);
        return w ? { icon: ICONS.worry[w.id] ?? "clipboard-list", text: w.label } : { icon: ICONS.other, text: `“${answers.worryText}”` };
      },
      skip: () => !(P.worries ?? []).length,
    },
    {
      id: "anchor",
      title: () => "Money, for you, is mostly about…",
      options: () => Object.entries(ANCHORS).map(([value, a]) => ({ value, icon: ICONS.anchor[value], label: a.label })),
      set: (v) => {
        answers.anchor = v;
        host.dataset.anchor = v; // the episode takes their colour
      },
      clear: () => { delete answers.anchor; delete host.dataset.anchor; },
      line: () => ({ icon: ICONS.anchor[answers.anchor], text: ANCHORS[answers.anchor].label }),
    },
  ].filter((p) => !p.skip?.());

  const root = document.createElement("div");
  root.className = "onboard";
  root.innerHTML = `
    <div class="ob-top">
      <button class="ob-back" type="button" hidden>${icon("arrow-left")}<span>Back</span></button>
      <div class="ob-progress">
        <div class="ob-segs" aria-hidden="true">${pages.map(() => "<i></i>").join("")}</div>
        <span class="ob-count"></span>
      </div>
      <button class="ob-skip" type="button" aria-label="Skip this question"><span>Skip</span>${icon("chevron-right")}</button>
    </div>
    <div class="ob-body">
      <section class="ob-page" aria-live="polite"></section>
      <aside class="recipe" aria-label="Your video so far">
        <p class="recipe-title"><span class="yak-mark" aria-hidden="true"></span><span class="t"></span></p>
        <ul class="recipe-lines"></ul>
      </aside>
    </div>`;
  host.append(root);

  const $ = (s) => root.querySelector(s);
  const pageEl = $(".ob-page"), backBtn = $(".ob-back"), lines = $(".recipe-lines"), titleEl = $(".recipe-title .t");
  let at = 0;
  let finished = false;
  const skipped = new Set(); // questions passed over with Skip: no answer, the video uses its default
  let wait = null; // the navy wait screen, once the questions are done

  function renderRecipe(animateLast = false) {
    const answered = pages.slice(0, at).filter((p) => !skipped.has(p.id)).map((p) => p.line());
    lines.innerHTML = answered.map((l) => `<li>${icon(l.icon)}<span>${escapeHtml(l.text)}</span></li>`).join("");
    titleEl.textContent = `${answers.name || formal}'s video`;
    if (animateLast && lines.lastElementChild && !reducedMotion()) gsap.fromTo(lines.lastElementChild, { x: 20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: "expo.out", clearProps: "transform,opacity" });
  }

  function show(i, dir = 1) {
    at = i;
    [...$(".ob-segs").children].forEach((d, k) => d.classList.toggle("on", k <= i));
    $(".ob-count").textContent = `${i + 1} of ${pages.length}`;
    backBtn.hidden = i === 0;
    const p = pages[i];
    const opts = p.options();
    const count = opts.length + (p.custom ? 1 : 0);
    if (p.input) {
      pageEl.innerHTML = `
        <div class="ob-head"><h1 class="ob-q">${p.title()}</h1></div>
        <form class="ob-custom ob-write">
          <input type="text" name="name" autocomplete="given-name" maxlength="${p.input.max}" value="${escapeHtml(p.input.value())}" aria-label="${p.input.label}" />
          <button class="solid" type="submit"><span>${p.input.action}</span>${icon("chevron-right")}</button>
        </form>`;
      const input = pageEl.querySelector("input");
      input.focus({ preventScroll: true });
      input.select();
      if (!reducedMotion()) gsap.fromTo(pageEl.querySelectorAll(".ob-head, .ob-write"), { x: 28 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: "expo.out", clearProps: "transform,opacity" });
      return;
    }
    pageEl.innerHTML = `
      <div class="ob-head">
        <h1 class="ob-q">${p.title()}</h1>
        ${p.sub ? `<p class="ob-sub">${p.sub}</p>` : ""}
      </div>
      <div class="ob-opts${count > 3 ? " many" : ""}">
        ${opts.map((o, k) => `
          <button class="ob-opt" type="button" data-v="${escapeHtml(o.value)}">
            <span class="ob-ic">${icon(o.icon)}</span>
            <span class="l">${escapeHtml(o.label)}${o.sub ? `<small>${escapeHtml(o.sub)}</small>` : ""}</span>
            <kbd class="ob-k" aria-hidden="true">${k + 1}</kbd>
          </button>`).join("")}
        ${p.custom ? `
          <button class="ob-opt ob-other" type="button">
            <span class="ob-ic">${icon(ICONS.other)}</span><span class="l">${p.custom.label}</span>
            <kbd class="ob-k" aria-hidden="true">${opts.length + 1}</kbd>
          </button>` : ""}
      </div>
      ${p.custom ? `
        <form class="ob-custom" hidden>
          <input type="text" maxlength="${p.custom.max}" placeholder="${p.custom.placeholder}" aria-label="${p.custom.placeholder}" />
          <button class="solid" type="submit">OK</button>
        </form>` : ""}`;
    if (!reducedMotion()) gsap.fromTo(pageEl.querySelectorAll(".ob-head, .ob-opt"), { x: 28 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, stagger: 0.04, ease: "expo.out", clearProps: "transform,opacity" });
  }

  function answer(value, typed = false, from = null) {
    const p = pages[at];
    p.set(value, typed);
    skipped.delete(p.id);
    at += 1;
    renderRecipe(true);
    if (at < pages.length) show(at);
    else startWait(from);
  }

  // ---------- the wait: navy curtain, yak run, real preparation steps ----------

  async function startWait(from) {
    finished = true;
    const still = reducedMotion();
    const who = escapeHtml(answers.name || formal);
    wait = document.createElement("div");
    wait.className = "wait";
    wait.innerHTML = `
      <canvas class="yak-game" role="img" aria-label="Mini game while your video is generated: the Sherpas yak runs a mountain trail. Press Space or tap to jump over the rocks."></canvas>
      <div class="wait-top">
        <div class="wait-row">
          <p class="wait-title"><span class="yak-mark" aria-hidden="true"></span><span class="t">Generating ${who}'s video</span></p>
          <p class="wait-pct"><b>0%</b><span class="left"></span></p>
        </div>
        <div class="wait-bar" role="progressbar" aria-label="Video generation" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
        <div class="wait-row wait-sub">
          <p class="wait-step">${WAIT_STEPS[0]}</p>
          <p class="wait-hint">Space or tap to jump the rocks</p>
        </div>
      </div>
      <span class="wordmark wait-brand" role="img" aria-label="Sherpas"></span>
      <p class="sr-only" aria-live="polite"></p>`;
    host.append(wait);
    const card = root.querySelector(".recipe").getBoundingClientRect();
    const $w = (sel) => wait.querySelector(sel);

    // The curtain opens from the tapped row.
    const box = host.getBoundingClientRect(), r = from?.getBoundingClientRect();
    const cx = r ? r.left + r.width / 2 - box.left : box.width / 2, cy = r ? r.top + r.height / 2 - box.top : box.height / 2;
    const reach = Math.hypot(Math.max(cx, box.width - cx), Math.max(cy, box.height - cy));
    if (!still) {
      await gsap.fromTo(wait, { clipPath: `circle(0px at ${cx}px ${cy}px)` }, { clipPath: `circle(${reach + 2}px at ${cx}px ${cy}px)`, duration: 0.75, ease: "expo.inOut" });
      wait.style.clipPath = "none";
    }
    root.remove();
    if (!wait) return; // cancelled during the wipe

    const game = (wait.game = yakRun($w("canvas"), { autorun: !still }));
    if (!still) {
      // The episode card docks into the progress strip.
      const top = $w(".wait-top"), to = top.getBoundingClientRect();
      if (card.width) gsap.from(top, { x: card.left - to.left, y: card.top - to.top, scaleX: card.width / to.width, scaleY: card.height / to.height, transformOrigin: "0 0", opacity: 0.4, duration: 0.7, ease: "expo.out" });
    }

    // Progress of the video generation, reported by the player: { p: 0..1, step, left: seconds | null }.
    const bar = $w(".wait-bar"), fill = $w(".wait-bar i"), pct = $w(".wait-pct b"), left = $w(".wait-pct .left"), stepEl = $w(".wait-step");
    const report = ({ p, step, left: secs }) => {
      if (!wait) return;
      const n = Math.round(p * 100);
      fill.style.width = `${n}%`;
      pct.textContent = `${n}%`;
      bar.setAttribute("aria-valuenow", String(n));
      left.textContent = secs == null ? "" : secs > 0 ? ` · about ${secs} s left` : " · almost there";
      if (step && stepEl.textContent !== step) stepEl.textContent = step;
    };
    try { await prepare(answers, report); } catch (e) { console.warn("prepare failed, starting anyway", e); }
    if (!wait) return;
    report({ p: 1, step: "Your video is ready", left: null });
    $w(".wait-title .t").textContent = `${who}'s video is ready`;
    $w(".sr-only").textContent = "Your video is ready. Starting now.";
    await game.exit({ instant: true });
    if (!still) await gsap.to(wait, { opacity: 0, duration: 0.4, delay: 0.35, ease: "power2.out" });
    if (!wait) return;
    close(answers);
  }

  function close(result) {
    window.removeEventListener("keydown", onKey, true);
    root.remove();
    if (wait) { wait.game?.stop(); wait.remove(); wait = null; }
    resolve(result);
  }

  root.addEventListener("click", (e) => {
    if (finished) return; // the curtain is already closing
    const opt = e.target.closest(".ob-opt");
    if (opt && !opt.classList.contains("ob-other")) return answer(opt.dataset.v, false, opt);
    if (opt) {
      const form = $(".ob-custom");
      form.hidden = false;
      opt.classList.add("picked");
      form.querySelector("input").focus();
      return;
    }
    if (e.target.closest(".ob-back") && at > 0) {
      at -= 1;
      if (pages[at].id === "anchor") delete host.dataset.anchor;
      renderRecipe();
      return show(at, -1);
    }
    if (e.target.closest(".ob-skip")) {
      // Skip this question only: the next one, or the game after the last.
      const p = pages[at];
      p.clear();
      skipped.add(p.id);
      at += 1;
      renderRecipe();
      return at < pages.length ? show(at) : startWait(null);
    }
  });
  root.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = e.target.querySelector("input").value.trim().replace(/\s+/g, " ");
    if (v) answer(v, !pages[at].input, e.target);
  });

  // 1-9 picks an option, so a keyboard demo is as fast as a thumb.
  function onKey(e) {
    if (e.target.closest?.("input") || finished) return;
    const n = Number(e.key);
    if (n >= 1) {
      const opt = root.querySelectorAll(".ob-opt")[n - 1];
      if (opt) { e.preventDefault(); e.stopPropagation(); opt.click(); }
    }
    if (e.key === " " || e.key.startsWith("Arrow")) e.stopPropagation();
  }
  window.addEventListener("keydown", onKey, true);

  renderRecipe();
  show(0);
  return { done, cancel: () => close(null) };
}

// Plan in Motion player: plays one person's video (web/episodes/<case>/<person>/ep1.json): one video made
// of parts (scenes), animated in sync with the voice. Voice = pre-generated mp3 (scene.audio) or, as a
// fallback, the browser's own speech. Tap any underlined number to pause and see what it means.
// Shareable links: ?case=michael-carter&person=michael (always 16:9)
// Before the video, four one-tap questions personalize it (onboarding.js + lib/personalize.js).
// A link can carry the answers too (&name=Mike&mode=nerd&worry=home&anchor=freedom): then there are no questions.
import { SCENES } from "./scenes/index.js";
import { personalize } from "./lib/personalize.js";
import { runOnboarding } from "./onboarding.js";
import { icon } from "./lib/icons.js";

const gsap = window.gsap;
const $ = (id) => document.getElementById(id);
const stage = $("stage"), sceneEl = $("scene"), captionEl = $("caption"), progressEl = $("progress");
const startBtn = $("start"), toggleBtn = $("toggle");

const params = new URLSearchParams(location.search);
const state = {
  manifest: null,
  caseId: params.get("case"),
  person: params.get("person"),
  raw: null, // the episode as generated
  ep: null, // the episode as this viewer sees it: personalize(raw, answers)
  answers: null,
  onboarding: null,
  idx: 0,
  started: false,
  playing: false,
  run: null, // everything that belongs to the scene on screen
};

// ---------------- answers (per viewer, per person) ----------------

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const profileKey = () => `pim:${state.caseId}:${state.person}:you`;
const ANSWER_KEYS = ["name", "mode", "worry", "anchor"];
const urlAnswers = ANSWER_KEYS.some((k) => params.has(k)) ? Object.fromEntries(ANSWER_KEYS.filter((k) => params.has(k)).map((k) => [k, params.get(k)])) : null;
const onboardOff = params.get("onboard") === "0";

// ---------------- voice ----------------

function pickVoice() {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang?.startsWith("en"));
  return voices.find((v) => /natural|neural|google us|aria|jenny|samantha/i.test(v.name)) ?? voices[0] ?? null;
}

function estimate(text) {
  return Math.max(3.2, text.split(/\s+/).length / 2.6 + 0.6);
}

// ---------------- scene lifecycle ----------------

function stopRun() {
  const r = state.run;
  if (!r) return;
  r.tl?.kill();
  r.bar?.kill();
  clearTimeout(r.timer);
  clearTimeout(r.fallback);
  if (r.audio) { r.audio.pause(); r.audio.src = ""; }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  state.run = null;
}

function renderProgress() {
  progressEl.innerHTML = state.ep.scenes.map(() => '<div class="seg"><i></i></div>').join("");
}

function markProgress(i) {
  [...progressEl.children].forEach((s, k) => {
    s.classList.toggle("done", k < i);
    if (k >= i) s.firstElementChild.style.width = "0";
  });
}

function playScene(i) {
  stopRun();
  const ep = state.ep;
  if (i < 0 || i >= ep.scenes.length) return;
  state.idx = i;
  const scene = ep.scenes[i];
  const ctx = { gsap, episode: ep, player: api, waitForUser: false };
  const render = SCENES[scene.type];
  if (!render) { console.warn("No scene renderer for", scene.type); return next(); }

  const tl = render(scene, sceneEl, ctx);
  captionEl.textContent = scene.caption;
  gsap.fromTo(captionEl, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3 });
  markProgress(i);

  const run = (state.run = { scene, ctx, tl, voiceDone: false });
  const seg = progressEl.children[i]?.firstElementChild;
  const startBar = (seconds) => {
    run.bar?.kill();
    run.bar = gsap.fromTo(seg, { width: "0%" }, { width: "100%", duration: seconds, ease: "none" });
    if (!state.playing) run.bar.pause();
  };
  const voiceEnded = (run.voiceEnded = () => {
    if (run !== state.run || run.voiceDone) return;
    run.voiceDone = true;
    clearTimeout(run.fallback);
    const remaining = Math.max(0, tl.duration() - tl.time());
    run.timer = setTimeout(() => {
      if (run !== state.run) return;
      if (ctx.waitForUser) { seg && (seg.style.width = "100%"); return; }
      next();
    }, (remaining + 0.7) * 1000);
  });

  tl.play(0);
  if (scene.audio) {
    const audio = (run.audio = new Audio(`episodes/${scene.audio}`));
    audio.addEventListener("loadedmetadata", () => startBar(audio.duration), { once: true });
    audio.addEventListener("ended", voiceEnded, { once: true });
    audio.addEventListener("error", () => { run.audio = null; speakFallback(); }, { once: true });
    audio.play().catch(() => speakFallback());
  } else {
    speakFallback();
  }

  function speakFallback() {
    if (run !== state.run) return;
    const secs = estimate(scene.voice);
    startBar(secs);
    if ($("browser-voice").checked && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(scene.voice);
      const v = pickVoice();
      if (v) u.voice = v;
      u.lang = "en-US";
      u.rate = 1.04;
      u.onend = voiceEnded;
      run.utterance = u;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
      run.fallback = setTimeout(voiceEnded, secs * 1800); // if the browser never fires onend
    } else {
      run.fallback = setTimeout(voiceEnded, secs * 1000);
    }
  }
}

function next() { if (state.idx < state.ep.scenes.length - 1) playScene(state.idx + 1); }
function prev() { playScene(Math.max(0, state.idx - 1)); }

function setPlaying(on) {
  state.playing = on;
  toggleBtn.innerHTML = icon(on ? "pause" : "play");
  const r = state.run;
  if (!r) return;
  if (on) {
    r.tl.resume(); r.bar?.resume();
    if (r.audio && !r.voiceDone) r.audio.play().catch(() => {});
    if (r.utterance && !r.voiceDone) {
      speechSynthesis.resume();
      r.fallback = setTimeout(r.voiceEnded, estimate(r.scene.voice) * 1800);
    }
    if (!r.audio && !r.utterance && !r.voiceDone) r.fallback = setTimeout(r.voiceEnded, 1500);
    if (r.voiceDone && !r.ctx.waitForUser) r.timer = setTimeout(() => r === state.run && next(), 700);
  } else {
    r.tl.pause(); r.bar?.pause();
    r.audio?.pause();
    if (r.utterance) speechSynthesis.pause();
    clearTimeout(r.timer); clearTimeout(r.fallback);
    r.timer = r.fallback = null;
  }
}

// ---------------- explain a number ----------------

const explainEl = $("explain");
function openExplain(key) {
  const x = state.ep?.explain?.[key];
  if (!x) return;
  setPlaying(false);
  $("explain-label").textContent = x.label;
  $("explain-value").textContent = x.value;
  $("explain-simple").textContent = x.simple;
  $("explain-expert").textContent = x.expert;
  const expert = state.ep.explainOpen === "expert"; // nerd mode opens on the full detail
  $("explain-expert").hidden = !expert;
  $("explain-more").hidden = expert;
  explainEl.hidden = false;
  $("explain-close").focus();
}
$("explain-more").onclick = () => { $("explain-expert").hidden = false; $("explain-more").hidden = true; };
$("explain-close").onclick = () => { explainEl.hidden = true; setPlaying(true); };
explainEl.addEventListener("click", (e) => { if (e.target === explainEl) $("explain-close").click(); });

stage.addEventListener("click", (e) => {
  const k = e.target.closest("[data-key]");
  if (k && state.started) { e.stopPropagation(); openExplain(k.dataset.key); }
});

// ---------------- loading + pickers ----------------

async function loadEpisode() {
  stopRun();
  state.onboarding?.cancel();
  document.body.classList.remove("asking");
  const url = `episodes/${state.caseId}/${state.person}/ep1.json`; // one video per person
  const res = await fetch(url);
  if (!res.ok) { captionEl.textContent = `Video not generated yet: ${url}`; return; }
  state.raw = await res.json();
  // Answers in a link (made by the advisor, or our MCP server) become this person's starting answers, once.
  if (urlAnswers && !state.linkApplied && params.get("case") === state.caseId && params.get("person") === state.person) {
    store.set(profileKey(), urlAnswers);
    state.linkApplied = true;
  }
  state.answers = store.get(profileKey());
  applyAnswers();
  sceneEl.innerHTML = "";
  sceneEl.className = "scene-layer";
  captionEl.textContent = "";
  syncUrl();
  const forced = state.forceAsk;
  state.forceAsk = false;
  if (state.raw.personalize && (forced || (!state.answers && !onboardOff))) return ask();
  if (state.started) { startBtn.hidden = true; setPlaying(true); playScene(0); }
  else startBtn.hidden = false;
}

function applyAnswers() {
  state.ep = personalize(state.raw, state.answers ?? {});
  stage.dataset.anchor = state.ep.anchor ?? "";
  renderProgress();
  $("start-title").textContent = state.answers ? state.ep.recipeTitle : `${state.ep.personName}: ${state.ep.title}`;
  $("start-sub").textContent = "Tap to play · tap any number to learn what it means";
}

// ---------------- getting the episode ready (the wait screen) ----------------
// While the viewer plays the yak run, a bar above the game shows how the video generation is going.
// In production the video (Remotion mp4) takes a while: that renderer joins with
// window.planInMotion.whenReady(({ episode, answers, progress }) => promise), calling progress(0..1)
// as it renders; the episode starts when every registered promise resolves.
// DEMO: with nothing registered, the generation is simulated: a fixed DEMO_MS of progress and play,
// then straight to the episode (it was generated ahead of time and plays live in this page).
// ?wait=fast skips the simulated wait.

const DEMO_MS = 8000;
const GEN_STEPS = ["Reading your plan", "Writing your script", "Recording the voice", "Rendering your video"];
const readyHooks = [];
window.planInMotion = { whenReady(fn) { readyHooks.push(fn); } };

function preloadVoice(ep, count = 2) {
  const clips = ep.scenes.map((s) => s.audio).filter(Boolean).slice(0, count);
  return Promise.all(clips.map((src) => new Promise((done) => {
    const a = new Audio();
    a.preload = "auto";
    const t = setTimeout(done, 5000);
    a.addEventListener("canplaythrough", () => { clearTimeout(t); done(); }, { once: true });
    a.addEventListener("error", () => { clearTimeout(t); done(); }, { once: true });
    a.src = `episodes/${src}`;
  })));
}

function prepare(answers, report) {
  const t0 = performance.now();
  const demo = !readyHooks.length;
  const total = demo && params.get("wait") !== "fast" ? DEMO_MS : 0;
  const ep = personalize(state.raw, answers);
  let hookP = null, workDone = false;
  const progress = (p) => { hookP = Math.max(0, Math.min(1, Number(p) || 0)); };
  Promise.all([preloadVoice(ep), document.fonts?.ready, ...readyHooks.map((fn) => fn({ episode: ep, answers, progress }))])
    .catch((e) => console.warn("a renderer failed; starting anyway", e))
    .finally(() => (workDone = true));
  return new Promise((resolve) => {
    const tick = () => {
      const elapsed = performance.now() - t0;
      let p = demo ? (total ? Math.min(1, elapsed / total) : 1) : hookP ?? 0;
      if (!workDone) p = Math.min(p, 0.97); // never show 100% before the work is really done
      const left = demo ? Math.max(0, Math.ceil((total - elapsed) / 1000)) : null;
      report({ p, step: GEN_STEPS[Math.min(GEN_STEPS.length - 1, Math.floor(p * GEN_STEPS.length))], left });
      if (p >= 1 && workDone) return resolve();
      setTimeout(tick, 100);
    };
    tick();
  });
}

/** The four questions, then straight into the episode (the last tap is the user gesture audio needs). */
async function ask() {
  stopRun();
  state.onboarding?.cancel();
  startBtn.hidden = true;
  sceneEl.innerHTML = "";
  sceneEl.className = "scene-layer";
  captionEl.textContent = "";
  stage.dataset.anchor = "";
  document.body.classList.add("asking");
  const ob = (state.onboarding = runOnboarding({ host: stage, ep: state.raw, gsap, prepare }));
  const answers = await ob.done;
  if (state.onboarding === ob) document.body.classList.remove("asking");
  if (state.onboarding !== ob) return;
  state.onboarding = null;
  if (!answers) return;
  state.answers = answers;
  store.set(profileKey(), answers);
  applyAnswers();
  state.started = true;
  setPlaying(true);
  playScene(0);
}

$("personalize-btn").onclick = () => {
  if (state.raw) ask();
};

function syncUrl() {
  const p = new URLSearchParams({ case: state.caseId, person: state.person });
  history.replaceState(null, "", `?${p}`);
}

function currentCase() { return state.manifest.cases.find((c) => c.caseId === state.caseId); }

function renderPickers() {
  // One picker for family and adult: production has a login instead.
  const sel = $("pick-case");
  sel.innerHTML = state.manifest.cases.map((c) =>
    `<optgroup label="${c.family.adults.map((a) => a.name).join(" & ")} · score ${c.family.score}">` +
    c.people.map((p) => `<option value="${c.caseId}/${p.id}">${p.name}</option>`).join("") + "</optgroup>").join("");
  sel.value = `${state.caseId}/${state.person}`;
}

function choose(update) {
  Object.assign(state, update);
  const c = currentCase();
  if (!c.people.some((p) => p.id === state.person)) state.person = c.people[0].id;
  renderPickers();
  loadEpisode();
}

$("pick-case").onchange = (e) => {
  const [caseId, person] = e.target.value.split("/");
  choose({ caseId, person });
  syncUrl();
};

startBtn.onclick = () => { state.started = true; startBtn.hidden = true; setPlaying(true); playScene(0); };
toggleBtn.onclick = () => state.started && setPlaying(!state.playing);
$("next").onclick = () => state.started && next();
$("prev").onclick = () => state.started && prev();
document.addEventListener("keydown", (e) => {
  if (e.target.closest("select, input") || state.onboarding) return;
  if (e.key === " ") { e.preventDefault(); state.started ? setPlaying(!state.playing) : startBtn.click(); }
  if (e.key === "ArrowRight") next();
  if (e.key === "ArrowLeft") prev();
  if (e.key === "Escape" && !explainEl.hidden) $("explain-close").click();
});

const api = {};

// ---------------- boot ----------------

(async function boot() {
  document.querySelectorAll("[data-icon]").forEach((el) => el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon)));
  if ("speechSynthesis" in window) speechSynthesis.getVoices(); // warm up the voice list
  const res = await fetch("episodes/index.json");
  if (!res.ok) { captionEl.textContent = "No videos yet. Run: npm run generate:all"; return; }
  state.manifest = await res.json();
  if (!state.manifest.cases.some((c) => c.caseId === state.caseId)) {
    // Michael (score 26) is the strongest demo: hard news turned into one clear move.
    state.caseId = state.manifest.cases.find((c) => c.caseId === "michael-carter")?.caseId ?? state.manifest.cases[0].caseId;
  }
  choose({});
})();

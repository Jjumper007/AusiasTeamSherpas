// Yak run: the little game on the wait screen while the video is generated (ported from the static player).
// The Sherpas yak runs a mountain trail; Space, ↑, tap or click jumps (hold for a higher jump).
// yakRun(canvas, { autorun, remember }) -> { exit(): Promise (the yak runs off to the right), stop() }.
// remember: keep the best distance in this browser (off in the demo, which keeps nothing).
// With reduced motion it waits for the first jump instead of starting by itself.

const YAK_SRC = "/sherpas-yak.png"; // design/assets is Vite's public dir
const BEST_KEY = "pim:yak:best";
const C = {
  skyTop: "#161827", skyBottom: "#0B0F2E",
  far: "#283063", near: "#1B2146", snow: "rgba(224, 238, 255, 0.5)", star: "rgba(224, 238, 255, 0.55)",
  ground: "#0E1233", groundLine: "#3A4372", pebble: "#2A3160",
  rock: "#46519A", rockLit: "#5F6CB8", ice: "#7F97D9", iceLit: "rgba(224, 238, 255, 0.7)",
  text: "#E0EEFF", muted: "#9EA6C4",
};

// Loaded once, when the app starts: the host makes every later request revalidate, and during the wait
// that request would queue behind the video's download, leaving the trail without its yak.
const YAK_IMAGE = typeof Image === "undefined" ? null : Object.assign(new Image(), { src: YAK_SRC });

const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
const saveBest = (v: number) => { try { localStorage.setItem(BEST_KEY, String(v)); } catch {} };

interface Obstacle { x: number; w: number; h: number; kind: "rock" | "ice" }

export interface YakRun { exit(opts?: { instant?: boolean }): Promise<void>; stop(): void }

export function yakRun(canvas: HTMLCanvasElement, { autorun = true, remember = true }: { autorun?: boolean; remember?: boolean } = {}): YakRun {
  const ctx = canvas.getContext("2d")!;

  let W = 0, H = 0, u = 1, m = 1, gy = 0, dpr = 1;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; m = H / 100; gy = H * 0.8;
    u = Math.min(m, W / 130); // sprites follow the narrow side, so a phone keeps room to react
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // Game logic is in "u" (about a hundredth of the canvas, capped by its width) measured from the ground
  // line; scenery uses "m" (a hundredth of the height) so the mountains still fill a tall phone screen.
  const GROUND = 80, YAK_H = 19, YAK_W = YAK_H * 407 / 324;
  const GRAVITY = 420, JUMP = 158, CUT = 60;
  let running = autorun, over = false;
  let exiting: { t: number; x: number; resolve: () => void } | null = null;
  let dist = 0, speed = 55, y = autorun ? 14 : 0, vy = 0, holding = false, bob = 0;
  let rocks: Obstacle[] = [], nextRock = 0.9, best = remember ? readBest() : 0;
  const firstRock = (): Obstacle[] => [{ x: W / u * 0.72, w: 8, h: 7, kind: "rock" }]; // something to jump right away
  let raf = 0, last = performance.now();

  const yakX = () => Math.min(16, (W / u) * 0.12);
  const metres = () => Math.floor(dist / 4);

  function reset() { rocks = firstRock(); dist = 0; speed = 55; nextRock = 0.9; over = false; y = 0; vy = 0; }

  function press() {
    if (exiting) return;
    if (over) { reset(); running = true; return; }
    running = true;
    if (y <= 0.01) { vy = JUMP; holding = true; }
  }
  function release() { holding = false; if (vy > CUT) vy = CUT; }

  const isJumpKey = (e: KeyboardEvent) => e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW";
  // Jump keys belong to the game unless focus is on a control outside it (topbar buttons, selects).
  const ownsKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    return !t.closest?.("button, select, input, a, textarea") || (canvas.parentElement!.contains(t) && !t.closest("button"));
  };
  const onKeyDown = (e: KeyboardEvent) => { if (!isJumpKey(e) || !ownsKey(e)) return; e.preventDefault(); e.stopPropagation(); if (!e.repeat) press(); };
  const onKeyUp = (e: KeyboardEvent) => { if (isJumpKey(e)) release(); };
  const onDown = (e: PointerEvent) => { e.preventDefault(); press(); };
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", release);

  function step(dt: number) {
    if (exiting) {
      exiting.t += dt;
      exiting.x += (40 + exiting.t * 160) * dt;
      if (y > 0 || vy > 0) { vy -= GRAVITY * dt; y = Math.max(0, y + vy * dt); if (y === 0) vy = 0; }
      dist += speed * dt;
      bob += dt * 18;
      if (exiting.x > W / u + 4 || exiting.t > 1.8) exiting.resolve();
      return;
    }
    if (!running || over) return;
    if (y > 0 && !holding && vy <= 0 && dist === 0) { vy -= GRAVITY * dt; y = Math.max(0, y + vy * dt); if (y === 0) { vy = 0; dist = 0.01; } return; } // the drop onto the trail
    speed = Math.min(98, speed + dt * 1.6);
    dist += speed * dt;
    bob += dt * 18;
    vy -= (holding && vy > 0 ? GRAVITY * 0.62 : GRAVITY) * dt;
    y = Math.max(0, y + vy * dt);
    if (y === 0 && vy < 0) vy = 0;

    nextRock -= dt;
    if (nextRock <= 0) {
      // Obstacles: small and big rocks, ice blocks, now and then a pair close together.
      const r = hash(dist), x = W / u + 4;
      if (r < 0.22) rocks.push({ x, w: 7 + hash(dist + 1) * 2, h: 8 + hash(dist + 2) * 3, kind: "ice" });
      else if (r < 0.4) rocks.push({ x, w: 6, h: 5.5, kind: "rock" }, { x: x + 7.5, w: 7, h: 7, kind: "rock" });
      else { const big = r > 0.75; rocks.push({ x, w: big ? 10 + hash(dist + 3) * 3 : 6 + hash(dist + 4) * 3, h: big ? 9 + hash(dist + 5) * 2 : 5 + hash(dist + 6) * 3, kind: "rock" }); }
      nextRock = (0.75 + hash(dist + 7) * 0.8) * (60 / speed) + 0.2;
    }
    for (const r of rocks) r.x -= speed * dt;
    rocks = rocks.filter((r) => r.x + r.w > -2);

    // Forgiving hit boxes: only the yak's body and the rock's core count.
    const x0 = yakX(), top = GROUND - y - YAK_H;
    const yb = { l: x0 + YAK_W * 0.22, r: x0 + YAK_W * 0.8, t: top + YAK_H * 0.3, b: GROUND - y };
    for (const r of rocks) {
      if (yb.r > r.x + r.w * 0.15 && yb.l < r.x + r.w * 0.85 && yb.b > GROUND - r.h * 0.8) {
        over = true; running = false;
        if (metres() > best) { best = metres(); if (remember) saveBest(best); }
      }
    }
  }

  // A ridge of uneven peaks: each one has its own height, summit position and width; tall ones get snow.
  function ridge(offset: number, period: number, amp: number, seed: number, fill: string, snow: string | null) {
    const first = Math.floor(offset / period) - 1;
    const peaks: { l: number; top: number; r: number; h: number }[] = [];
    for (let i = first; i * period - offset < W / u + period; i++) {
      const x = i * period - offset, w = period * (0.9 + 0.5 * hash(i + seed + 0.5));
      const h = amp * (0.45 + 0.55 * hash(i + seed));
      peaks.push({ l: x - (w - period) / 2, top: x + w * (0.3 + 0.4 * hash(i + seed + 0.25)), r: x + period + (w - period) / 2, h });
    }
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    for (const p of peaks) { ctx.lineTo(p.l * u, gy); ctx.lineTo(p.top * u, gy - p.h * m); ctx.lineTo(p.r * u, gy); }
    ctx.lineTo(W, gy);
    ctx.closePath();
    ctx.fill();
    if (!snow) return;
    ctx.fillStyle = snow;
    for (const p of peaks) {
      if (p.h < amp * 0.7) continue;
      const k = 0.2; // the cap covers the top fifth
      ctx.beginPath();
      ctx.moveTo(p.top * u, gy - p.h * m);
      ctx.lineTo((p.top + (p.r - p.top) * k) * u, gy - p.h * (1 - k) * m);
      ctx.lineTo((p.top + (p.r - p.top) * k * 0.45) * u, gy - p.h * (1 - k * 0.7) * m);
      ctx.lineTo((p.top - (p.top - p.l) * k * 0.5) * u, gy - p.h * (1 - k * 0.8) * m);
      ctx.lineTo((p.top - (p.top - p.l) * k) * u, gy - p.h * (1 - k) * m);
      ctx.closePath();
      ctx.fill();
    }
  }

  function stars(offset: number) {
    ctx.fillStyle = C.star;
    for (let i = 0; i < 40; i++) {
      const x = ((hash(i + 0.1) * W * 1.2 - offset * u) % (W * 1.2) + W * 1.2) % (W * 1.2);
      const y = hash(i + 0.7) * gy * 0.55, r = 0.6 + hash(i + 0.3) * 0.9;
      ctx.globalAlpha = 0.35 + 0.65 * hash(i + 0.9);
      ctx.fillRect(x, y, r, r);
    }
    ctx.globalAlpha = 1;
  }

  function drawIce(r: Obstacle) {
    const x = r.x * u, w = r.w * u, h = r.h * u, top = gy - h, k = Math.min(w, h) * 0.18;
    ctx.fillStyle = C.ice;
    ctx.beginPath();
    ctx.moveTo(x, gy); ctx.lineTo(x, top + k); ctx.lineTo(x + k, top); ctx.lineTo(x + w - k, top);
    ctx.lineTo(x + w, top + k); ctx.lineTo(x + w, gy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.iceLit;
    ctx.fillRect(x + k, top + k * 0.6, w * 0.18, h - k * 1.6);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, C.skyTop); sky.addColorStop(1, C.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    stars(dist * 0.02);
    ridge(dist * 0.12, 46, 42, 3, C.far, C.snow);
    ridge(dist * 0.35, 30, 24, 11, C.near, null);

    ctx.fillStyle = C.ground;
    ctx.fillRect(0, gy, W, H - gy);
    ctx.fillStyle = C.groundLine;
    ctx.fillRect(0, gy, W, Math.max(1, 0.4 * u));
    ctx.fillStyle = C.pebble;
    const gap = 11;
    for (let x = -(dist % gap); x < W / u; x += gap) ctx.fillRect(x * u, gy + (4 + hash(Math.floor((x + dist) / gap)) * 6) * u, 2.4 * u, 0.5 * u);

    for (const r of rocks) {
      if (r.kind === "ice") { drawIce(r); continue; }
      const g = gy, x = r.x * u, w = r.w * u, h = r.h * u;
      ctx.fillStyle = C.rock;
      ctx.beginPath();
      ctx.moveTo(x, g); ctx.lineTo(x + w * 0.12, g - h * 0.62); ctx.lineTo(x + w * 0.42, g - h);
      ctx.lineTo(x + w * 0.78, g - h * 0.78); ctx.lineTo(x + w, g); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.rockLit;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.12, g - h * 0.62); ctx.lineTo(x + w * 0.42, g - h); ctx.lineTo(x + w * 0.36, g - h * 0.45); ctx.closePath(); ctx.fill();
    }

    const yak = YAK_IMAGE;
    if (yak?.complete && yak.naturalWidth) {
      const x = (exiting ? yakX() + exiting.x : yakX()) * u;
      const lift = y === 0 && (running || exiting) ? Math.abs(Math.sin(bob)) * 0.7 : 0;
      const top = gy - (y + YAK_H + lift) * u;
      ctx.save();
      ctx.globalAlpha = over ? 0.55 : 1;
      ctx.translate(x + YAK_W * u, top);
      ctx.scale(-1, 1); // the banner's yak faces left; on the trail it runs right
      ctx.drawImage(yak, 0, 0, YAK_W * u, YAK_H * u);
      ctx.restore();
    }

    const fs = Math.max(12, 3.6 * m);
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    ctx.font = `600 ${fs * 1.2}px Poppins, Inter, system-ui, sans-serif`;
    ctx.fillStyle = C.text;
    ctx.fillText(`${metres()} m`, W - 4 * m, gy + 10 * m);
    if (best) {
      ctx.font = `500 ${fs * 0.85}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = C.muted;
      ctx.fillText(`best ${best} m`, W - 4 * m, gy + 15.5 * m);
    }
    if ((!running && !exiting) || over) {
      ctx.textAlign = "center";
      const size = Math.min(fs * 1.15, W / 13); // two short lines, so it fits a phone too
      ctx.font = `600 ${size}px Poppins, Inter, system-ui, sans-serif`;
      ctx.fillStyle = C.text;
      const [l1, l2] = over ? ["Bumped a rock.", "Tap to run again"] : ["Press Space", "or tap to run"];
      ctx.fillText(l1, W / 2, gy - 30 * m - size * 0.7);
      ctx.fillText(l2, W / 2, gy - 30 * m + size * 0.7);
    }
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }
  rocks = firstRock();
  raf = requestAnimationFrame(frame);

  return {
    /** The episode is ready: no more rocks, the yak runs off to the right. */
    exit({ instant = false } = {}) {
      if (instant) return Promise.resolve();
      return new Promise<void>((resolve) => {
        if (metres() > best) { best = metres(); if (remember) saveBest(best); }
        over = false; running = true;
        let settled = false;
        const finish = () => { if (!settled) { settled = true; resolve(); } };
        exiting = { t: 0, x: 0, resolve: finish };
        setTimeout(finish, 2200); // wall clock: a throttled or hidden tab never holds the episode back
      });
    },
    stop() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("pointerup", release);
      canvas.removeEventListener("pointerdown", onDown);
    },
  };
}

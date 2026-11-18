// Scene registry: one file per scene type. To add a scene, create web/scenes/<type>.js
// exporting `default function (scene, el, ctx) -> gsap timeline (paused)` and register it here.
import hook from "./hook.js";
import score from "./score.js";
import pillars from "./pillars.js";
import timeline from "./timeline.js";
import compare from "./compare.js";
import move from "./move.js";
import steps from "./steps.js";
import action from "./action.js";
import metrics from "./metrics.js";

export const SCENES = { hook, score, pillars, metrics, timeline, compare, move, steps, action };

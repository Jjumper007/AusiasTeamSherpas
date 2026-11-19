# 0001 · A Live run plays in the browser, not from an MP4

Status: accepted, 2026-11-19. Spec: `docs/specs/live-run.md`. Issues #12–#18.

## Context

In the pitch we want the jury to answer the survey and watch the video that those answers produce. A full run takes 5 to 7.5 minutes (script ~25 s, voice ~13 s, Claude's scenes 1.5–2 min, visual review 0.8–2.3 min, MP4 render ~2 min), so on stage the only option was the demo, which plays demo videos made earlier and says so.

The target was a video that starts about 20 seconds after the survey is sent, 30 seconds at most, without changing `npm run dev` or `npm run demo`.

## Decision

A third mode, `npm run live`. A **Live run** plays the template's locked composition in the browser with `@remotion/player` as soon as the five voices exist, and fills in the rest while it plays:

- The script is read while Claude writes it. Each part is checked alone as it closes and its narration is recorded at once, all in parallel. A part that fails its checks is replaced by the same part of the script without Claude. Nothing is retried.
- Parts 1 and 2 always play their **standard scene**. Claude designs parts 3, 4 and 5 in parallel, one call per part without tools, while the video plays. A scene that passes its checks (locked files, number guard, `tsc`, compilation for the browser) is compiled once into a module and sent to the page.
- The page decides on the player's own clock: a Claude scene is swapped in only if it is ready at least 2 seconds before its part starts, and a part that has started never changes.
- The MP4 is rendered in the background and kept only if the page stays open until it finishes.
- If the video has not started after 40 seconds, or the run fails, the page plays that member's demo video and says so.

Two decisions inside it were taken from measurements, after the spec:

- **The script and the scenes run at `--effort low`.** At the CLI's default effort Sonnet reasoned about 16 seconds before its first word.
- **A compiled scene shares the page's modules through one global.** The page fills `globalThis.__SHERPAS_LIVE_HOST__` with its own React, Remotion, `@sherpas/shared`, `lucide-react` and template modules; esbuild turns every import of a scene into a read of it. A scene module holds only its own file (5–8 KB).

## Alternatives considered

- **Make the MP4 itself in 20 seconds.** Not feasible: the render runs at about 16–21 frames per second whatever the concurrency, so an 85-second video needs about 2.5 minutes.
- **Start playing before the five voices exist.** The length of each part comes from its audio, and the camera plan and the sound cues are computed from all five. Starting earlier would mean lengthening the video while it plays and touching the locked camera plan.
- **Claude designs every part, as in the normal run.** Parts 1 and 2 play before any Claude scene could be ready (a scene takes 10–24 s after its voice).
- **Keep the visual review.** It adds 1 to 2 minutes.
- **Haiku for speed.** Slower in practice: 33 s for the script against 22 s with Sonnet, and 39–59 s per scene.
- **Decide on the server which scene plays.** The server can only estimate where the player is. The 2-second margin is real only on the player's clock.
- **How a compiled scene reaches React and Remotion:**
  - An import map: Vite gives no stable URL for the page's own instance of React, in development or in a build.
  - Bundling React or Remotion into the module: two copies break hooks and contexts such as `useCurrentFrame`.
  - Bundling `lucide-react` into the module: 450–900 ms per scene instead of about 10 ms.
  - A React context added to the locked `Screen`: not needed. A Vite plugin, active only in live mode, redirects the one import of the scene table to slots owned by the page, so nothing under `video-template/` changes and the MP4 render never sees it.

## Measurements

This laptop, 2026-11-19. Times are seconds after the survey is sent.

| | Default effort | `--effort low` |
|---|---|---|
| Claude's first text (script) | 16.0 | 0.9–1.7 (once 10.4) |
| The five scenes of the script closed | 21.6 | 6.8–8.3 (once 16.1) |
| Five voices recorded, `live-ready` | 24.7 | 9.2–12.7 (once 19.5) |
| **First frame** | **26.4** | **11.4–16.9 (once 20.9)** |

Eight Live runs played a video, seven of them at `--effort low`. The one at 20.9 s waited 10.4 s for Claude's first text; ten later calls with the same prompt all started in 1.6 s, so it was the API that time and not the prompt.

| Measurement | Result |
|---|---|
| One voice (speech, then word timings) | 1.8–7.4 s each, in parallel |
| `live-ready` to first frame | 1.4–4.2 s (the longer ones when the scene calls start at the same moment) |
| A Claude scene: answer | 9.0–23.8 s |
| A Claude scene: checks (`tsc` 0.2–0.5 s, compilation 6–30 ms) | 0.3–0.5 s |
| Margin of part 3 (ready before its part starts), six runs | 11.0, 21.5, 11.9, 13.2, 14.5, 16.2 s |
| Scene swap asked to new scene on screen | 36–132 ms, no jump of the player's clock |
| Claude scenes accepted, six runs | 15 of 18; the 3 refused were all `first_step`, by `tsc` |
| MP4 in the background: bundle, render | 12.5–12.9 s, 144.6 s (15.8 fps, concurrency 4) |
| Render cancelled after the page closes | 5 s of grace, then stops at once |
| Safety net, forced delay | demo video at 39.6–40.0 s |

Two defects found in the rehearsal and fixed in the prompts, both measured with real calls:

- The hook came out at 21–23 words (the limit is 20) in 3 of 4 runs at low effort, so the hook without Claude played. A reminder appended to the script prompt in the Live run only gives 15–19 words (10 of 10 calls, and the three rehearsal runs).
- `first_step` failed `tsc` in 3 of 5 runs with the same error: a property written twice in one style object, copied from the badge of `StepCard.tsx`. One rule in `prompts/live-scene.md` (version 2) gives 4 of 4.

## Consequences

- There are now two ways to play the same composition: Remotion's renderer for the MP4 and `@remotion/player` in the page. The template must stay the same in both: a compiled scene uses the page's copy of every template module, so a scene cannot depend on a new or changed component.
- The MP4 of a Live run exists only if the page stays open about 2.5 minutes after the scenes are ready. Until then the run holds the single slot: on stage, press "Start over" before the next run.
- The Live run depends on the network twice in its first seconds (Claude and the voice proxy). The demo video of each member must be in the demo folder for the safety net to have something to play.
- The video starts with sound only because the survey's taps happen in the same page. A reload before the video shows a start card instead.
- Chapters or the call to action that close after `live-ready` are right under the video but keep the text without Claude in the chapter wipe inside it.
- `npm run dev` and `npm run demo` are unchanged: the shared code gained optional parameters only (`model`, `effort`, streaming, a render cancel signal).

# Spec · Live run: the video starts playing in about 20 seconds

Branch `live-run` (worktree `../sherpass-live`). Vocabulary from `GLOSSARY.md`: **Run**, **Live run**, **Standard scene**, **Demo**, **Demo video**, **Member**, **Survey**. In Spanish like the rest of the team's documents; product, UI and code stay in English.

## Problem Statement

In the pitch we want to show that the video **really is generated from the survey answers**, in front of the jury. Today a full run takes 5 to 7.5 minutes: script ~25 s, voice ~13 s, Claude's scenes 1.5–2 min, visual review 0.8–2.3 min and the MP4 render ~2 min. Nobody waits that long on stage, so today the only option is the Demo, which plays videos made earlier and says so. The presenter needs a version in which the jury answers the survey and the video starts playing in about 20 seconds, without breaking what already works (`npm run dev` and `npm run demo`).

## Solution

A new **Live run** mode, started with `npm run live`. The member answers the survey as usual and, after the wait with the yak, **the video starts playing in the browser in ~18–20 s** (a ceiling of 30 s is acceptable):

- The script is read **while Claude writes it**, and each narration is recorded as soon as it is complete, all in parallel.
- The video plays with `@remotion/player` once all 5 voices exist; it does not wait for a finished MP4.
- Claude designs parts 3, 4 and 5 (`what_matters`, `first_step`, `what_changes`) **in parallel while the video is already playing**. Each Claude scene that is ready, and has passed the checks, at least 2 s before its part starts is swapped in. Otherwise the **Standard scene** of that part plays, with the facts it declares.
- Parts 1 and 2 (`hook`, `where_you_are`) are always Standard scenes, because they play before any Claude scene could be ready.
- If the video has not started after 40 s, or something fails, the page switches to that member's **Demo video** and says so.
- The MP4 is rendered in the background. It is only kept if it finishes before the session ends.

Measurements that make it feasible (this machine, Daniel's run, 2026-11-19):

| Measurement | Result |
|---|---|
| `claude -p` trivial (CLI startup + API) | 2.3 s (0.9 s of API) |
| Full script with Sonnet / Haiku | 22 s / 33 s, both pass `checkScript` |
| 3 scenes in parallel, one answer without tools, Sonnet | 17–25 s each, 0 number guard errors, 1 of 3 compiled first time (the others lacked context in the prompt) |
| The same with Haiku | 39–59 s, 3 of 3 compiled |
| `tsc` on a run's copy of the template (TypeScript 7) | 0.2 s |
| Bundling the template with webpack | 10 s |
| Rendering 600 frames, concurrency 8 and 16 | 28.5 s in both cases → an ~85 s MP4 needs ~2 min: an MP4 in 20 s is not feasible |

Estimated timeline (Daniel: logo 2.2 s, hook 5 s, part 2 17 s → part 3 starts 24.5 s after the first frame):

| t | What happens |
|---|---|
| 0 s | The survey is sent |
| ~3–14 s | Narrations arrive by streaming; each one is recorded as soon as it closes |
| ~8–17 s | Each Claude scene starts as soon as the duration of its part is known |
| **~18–20 s** | 5 voices ready → **first frame** |
| ~22 s | Chapters and CTA → the page under the video is filled |
| ~35–40 s | Claude's scenes ready |
| ~43 s / ~65 s / ~83 s | Parts 3, 4 and 5 start |

The only estimated (not measured) figure: that the 5 narrations are complete at ~13–14 s of the stream.

## User Stories

1. As the pitch presenter, I want to start the app with a single command (`npm run live`), so that I can prepare the demo on stage without touching configuration.
2. As the presenter, I want `npm run dev` to keep working exactly as it does now, so that the full pipeline (Claude's scenes, visual review, MP4) is not put at risk.
3. As the presenter, I want `npm run demo` and the public link to keep working exactly as they do now, so that I always have the static version.
4. As a member of the jury, I want to answer the four survey questions freely, so that I can see that the video depends on what I answer.
5. As a member of the jury, I want the video to start playing in about 20 seconds, so that the demo keeps up the pace of the pitch.
6. As a member of the jury, I want to see the yak wait with the real progress of the steps, so that I understand something is being generated and not replayed.
7. As a member of the jury, I want the video to sound like the normal videos (brand voice, music, effects, captions), so that the live version is credible.
8. As a member of the jury, I want the video to open with the Sherpas logo and close with it, so that it looks like the finished product.
9. As a member of the jury, I want the hook to say my nickname and what I said worries me most, so that I notice it is for me.
10. As a member of the jury, I want parts 3, 4 and 5 to be designed for my case and my explain level, so that I see the personalization working.
11. As a member of the jury, I want the video never to stop or jump when a new scene arrives, so that it looks like a single film.
12. As a member of the jury, I want a part whose Claude design did not arrive in time to play its Standard scene with the right figures, so that I never see an empty screen.
13. As a member of the jury, I want every figure on screen and in the narration to come from the plan's facts, so that the live mode keeps the same "we don't invent numbers" promise.
14. As a member of the jury, I want the chapters and the first-step card to appear under the video as soon as they are ready, so that I can see the whole experience.
15. As a member of the jury, I want the chapters to jump to their moment in the video, as they do in the normal videos, so that the experience is the same.
16. As a member of the jury, I want the first-step card to follow my decision style, so that the call to action is the right one.
17. As the presenter, I want that if the video has not started after 40 s, or the run fails, the page plays that member's Demo video with a visible notice ("Showing the video made earlier"), so that the pitch never gets stuck.
18. As the presenter, I want that if that member has no Demo video, the page says so clearly and lets me try again, so that I know what is happening.
19. As the presenter, I want only one Live run at a time, with a second attempt politely rejected, so that two runs do not share CPU and calls and both arrive late.
20. As the presenter, I want the Live run never to retry a part, so that the timing is predictable.
21. As the presenter, I want a narration, a chapter or the CTA that fails the checks to be replaced by the no-Claude version of that same part, so that I do not lose the target time over one bad sentence.
22. As the presenter, I want that if Claude's script fails entirely, the run continues with the whole no-Claude script, so that there is always a video.
23. As the presenter, I want the MP4 to be saved in `runs/` if it finishes before the session ends, so that a good Live run can later become a Demo video.
24. As the presenter, I want that closing or reloading the page cancels the background MP4 and leaves no video or result, so that no unwatched half-runs pile up.
25. As the presenter, I want the run folder to keep the logs of every step with their times (script stream, every voice, every Claude scene and whether it was used, first frame), so that I can measure and rehearse.
26. As a developer on the team, I want the Live run to reuse the brief, the facts, the script prompt, the script checks, the narrator and the number guard, so that there are not two versions of the rules.
27. As a developer, I want the shared zod schemas to stay frozen, so that the Live run does not touch the team's contracts.
28. As a developer, I want the live scene prompt to be versioned on its first line like the others, so that I know which version produced each scene.
29. As a developer, I want the live scene prompt to include everything Claude needs to compile first time (helpers, components, the shape of a fact, the props of `ImpactRing`), so that fewer scenes are lost to type errors.
30. As a developer, I want a Claude scene to be accepted only if it passes the number guard, `tsc` and compilation for the browser, so that nothing broken reaches the screen.
31. As a developer, I want a Claude scene not to be able to touch locked files (tokens, Root, camera, audio, logo), so that the base video stays intact.
32. As a developer, I want the decision of "Claude scene or Standard scene" to be taken by the browser on the player's own clock, so that the 2-second margin is real and not estimated by the server.
33. As a developer, I want the visual review switched off in the Live run, so that it does not add one to two minutes.
34. As a developer, I want the Live run to use Sonnet explicitly for the script and the scenes, so that the timing does not depend on the CLI's default model.
35. As a developer, I want the voice of the 5 narrations recorded in parallel only in the Live run, so that the normal pipeline does not change.
36. As a developer, I want to first run a technical test (spike) of the player with Daniel's existing run, so that the riskiest part is proven before building the rest.
37. As a developer, I want tests of the deterministic pieces with fakes for Claude, the voice, the compiler and the renderer, so that I can iterate without spending proxy or Claude quota.
38. As the presenter, I want to be able to rehearse up to 15 Live runs within the agreed budget (~1.2 $ of proxy), so that I arrive at the pitch having practised.
39. As the presenter, I want to run the pitch from this laptop with the backend local and with phone data as a fallback, so that I depend on the venue's network as little as possible.

## Implementation Decisions

**Modes and isolation**

- A third mode, `npm run live`, alongside `npm run dev` (full pipeline, unchanged) and `npm run demo` (static site, unchanged). The live backend is a different server entry that mounts the same case and survey routes, the Live run's jobs, and access to the Demo folder for the safety net.
- The current pipeline (`runJob`, `createScenesWriter`, visual review, narrator, renderer) is not modified. The Live run is a new module that **reuses** its pieces: brief and facts generation, `prompts/script.md`, `checkScript` and its per-text parts (number guard, hook length, valid `factsUsed`, `SCORE_NOW` and `SCORE_AFTER_<MOVE>` rules), `buildFallbackScript`, narration of one scene (proxy, cache, captions), copy of the template, locked-file check, `tsc` and the existing render queue.
- The frozen schemas in `shared/` do not change. `VideoProps` is reused as it is.
- The Claude CLI wrapper gains, without changing its current behaviour, two options: a model (`--model sonnet`) and a streaming mode (`--output-format stream-json --include-partial-messages`) that hands the text over as it arrives. The non-streaming mode stays as it is.

**API contract (live mode)**

- `POST /api/jobs` creates a Live run with the same request as today. If one is already running: `409` with "A live run is already playing".
- The job's SSE (`GET /api/jobs/:id/events`) keeps the `step`, `progress` and `error` events. The Live run adds:
  - `live-ready`: the 5 voices exist. It carries the complete `VideoProps` (with the run's audio URLs and captions; every part with its Standard scene) and what the page needs that is already known (name, partner, survey, first step and its figures).
  - `page`: chapters (with `startSec` from the real timings), CTA and "Why this number?" details, once they are accepted or replaced.
  - `scene`: one per part 3–5, with `{ part, status: 'ready', moduleUrl }` or `{ part, status: 'standard', reason }`.
  - `done`: the MP4 is saved in the run folder (only if the session is still open).
- A new step label for the voice in parallel is not needed: the Wait reuses the existing labels via its `ProgressSource`.

**Script by streaming**

- Same prompt (`prompts/script.md`) and same system prompt as the normal script. Sonnet, streaming.
- An incremental extractor reads the JSON as it arrives and hands over each `scenes[i]` as soon as its object closes, then `chapters` and `cta`. It must handle escaped quotes, braces inside strings and chunks cut at any point.
- Each scene is checked on its own as it arrives. If it fails, that part is replaced by the same part of `buildFallbackScript` (narration, `visualIdea`, `factsUsed`). The same goes for each chapter and for the CTA. `cta.type` is always the survey answer.
- If the stream dies, or does not finish within a limit well below the 40 s safety net (e.g. 25 s), the missing parts are replaced the same way. If the CLI cannot even start, the whole no-Claude script is used.
- No retries.

**Voice**

- Each accepted narration is recorded at once, in parallel with the others (same narrator: proxy, brand voice, cache, captions aligned by Scribe). The duration of each scene is still audio + 0.5 s, with the same hook and minimum-length rules.
- With the 5 timings known, `VideoProps` is validated and `live-ready` is sent.

**Claude's scenes in the Live run**

- Parts `what_matters`, `first_step` and `what_changes`. One `claude -p` per part, Sonnet, **no tools**, all three in parallel. Each starts as soon as its narration is accepted and its duration is known.
- New prompt `prompts/live-scene.md` (version 1), derived from `scenes.md` without the tool section. It includes in the prompt the current part file, the editable helpers (`types`, `motion`, `content`, `scene-facts`, `ui`, components), the tokens, the shape of a fact and the props of `ImpactRing`. The answer is only the content of the file.
- Checks: the file is the only one that changes (the rest of the copy is checked by hash, as today), number guard (`validateTsx`), `tsc` on the part's copy, and compilation with esbuild into a browser module. If it passes, a `scene ready` event with the module's URL; if not, `scene standard` with the reason. **No retries.**
- The compiled module does not bring its own copy of React, Remotion, `@sherpas/shared` or the template's components: those imports resolve to the instances the page already has. The exact mechanism (import map, globals or a scene registry) is decided by the spike.
- No visual review.

**Player and decision in the browser**

- Live view in the web, only in live mode: the template's composition (the locked part is imported from the template, it is not copied) inside `@remotion/player`, with a per-part scene registry that starts with the Standard scenes. The template's music and effects are served to the browser.
- A pure decision module says, given the start of each part on the player's clock, the current time and the arrival of each module, which version plays: a Claude scene is swapped in only if it arrives **≥ 2 s before** its part starts; a part that has already started never changes.
- Safety net: if there is no `live-ready` 40 s after sending, or an `error` arrives, the page plays that member's Demo video with the notice "Showing the video made earlier". If they have none, a clear message and "Try again".
- Chapters and the first-step card reuse the current components, filled with `live-ready` and `page`.

**Background MP4**

- When the three parts are resolved (ready or standard), the final copy is built with the accepted scenes, bundled and rendered in the existing render queue.
- If the browser closes the SSE connection before it ends, the render is cancelled and neither `result.json` nor `video.mp4` is written; only `log.txt` remains. If it finishes in time: `video.mp4`, `result.json` (same `JobResult` as today) and a `done` event.
- As built (#17): `done` is the last event of a run that kept its MP4; `end` is the last one when it kept none (render cancelled or failed); the page keeps the stream open until either, and the single-run slot stays taken until then (~2.5 min after the three parts resolve: bundle ~12 s, render ~144 s for an 85 s video at concurrency 4, which renders as fast as 8). The render writes `video.partial.mp4`, renamed to `video.mp4` only when complete. The MP4 carries the accepted scenes except those the page reported as `load-failed` or `threw` (a refusal during the render restarts it without that scene); a scene that arrived `late` or after its part `started` still goes in. With no Claude scene the template itself renders, as in a normal run. The log says which scenes went in and why, and writes the normal `[script]`, `[scenes]` and `[render] video.mp4 written with …` lines that `demo:check` and `demo:add` read. `npm run live:mp4 -w backend -- <run folder>` makes the MP4 of a Live run afterwards (the live server must be serving its narration).

**Run folder**

- Same layout as the other runs (`runs/<case>/<member>/<date>/`) plus the live logs: the script stream (raw text and when each part closed), each voice with its time, each Claude scene (prompt, answer, problems, result and time) and the moments `live-ready`, first frame (reported by the browser) and each swap.

**Phases**

1. Isolated branch: worktree `../sherpass-live`, branch `live-run`, `node_modules` with `cp -al`, a copy of `.env`, ports 3016/5186.
2. **Spike (1–2 h, no spend)** with Daniel's existing run. Exit criterion: the composition plays in `@remotion/player` with logo, office, camera, music, voice and captions; a part is swapped mid-playback for a module compiled on the server with no jump; the start time is measured. If it fails, we stop and rethink it with the user.
3. Live backend. 4. Live web. 5. Verification with real Live runs. 6. ADR and glossary.

## Testing Decisions

- A good test checks external behaviour (events emitted, files written, which version plays), never the internals. Claude, the voice, the compiler, the renderer and the clock are injected and replaced by fakes, as the current pipeline already does.
- **Seam 1 (backend): the Live run from end to end through its job events.** The run is started with fakes and the sequence of SSE events and the files in the run folder are checked. Cases:
  - happy path: `live-ready` with 5 timings, `page`, three `scene ready`, render with the three scenes and `done`;
  - the stream arrives in uneven chunks (cut mid-string, escaped quotes, braces inside strings) and the result is the same;
  - a narration with an invented figure, a hook that is too long or an unknown `factsUsed` → only that part is replaced by the no-Claude version;
  - the stream dies after 3 scenes → parts 4 and 5 replaced; the CLI fails to start → the whole no-Claude script;
  - a scene that fails the number guard, `tsc` or compilation, or that touches a locked file → `scene standard` with its reason;
  - the client disconnects before the render ends → render cancelled, no `result.json` or `video.mp4`;
  - the MP4 only includes the scenes the run accepted.
  - Prior art: `run-job.test.ts` (pipeline with fakes) and `write-scenes.test.ts` (fake Claude, locked files, number guard, `tsc`).
- **API: `409`** for a second Live run while the first is running. Prior art: `app.test.ts`.
- **Seam 2 (web): the pure "which version plays" module and the safety net.** Given part starts, the clock and arrivals: swap if it arrives ≥ 2 s before; not if it arrives later or the part has already started; switch to the Demo video at 40 s without `live-ready` or on `error`; message if there is no Demo video. Prior art: `first-step-card.test.ts` and `demo/replay.test.ts`.
- No E2E and no UI tests. Manual verification: Live runs with Daniel and Emily, measuring the first frame in at least 3 runs (target ≤ 20 s, maximum 30 s) and checking in Chrome that there are no jumps when a scene is swapped. Up to 15 Live runs in total (~1.2 $ of proxy); ask before going beyond that.
- After writing code: an independent review (code-reviewer), fix what is HIGH.

## Out of Scope

- Any change to `npm run dev` (pipeline, scenes with tools, visual review, voice one after another) and to `npm run demo` / the public link.
- Changes to the frozen `shared/` schemas.
- Retries in the Live run, visual review in the Live run, Haiku.
- Starting playback before the 5 voices exist (that would mean lengthening the video while it plays and touching the locked camera plan).
- Parts 1 and 2 designed by Claude in the Live run.
- More than one Live run at a time, and hosting the Live run outside this laptop.
- Making the MP4 itself in ~20 s (render ~2 min measured; not feasible).
- Day 3 and day 30 follow-up videos (slides only).

## Further Notes

- Risks the spike covers: that the player finds the music and effects of the template's `public/` folder (the web does not serve them today); that the scene loaded live shares React and Remotion with the page; that swapping a scene does not restart the player or the camera.
- Remaining risk after the spike: the margin of part 3 (~5–10 s). The first-frame and swap logs measure it in the rehearsals.
- Each Live run makes ~4 calls to Claude (with the user's Claude Code session, not the proxy) and ~10 to the proxy (voice and Scribe), many in parallel. Before the pitch: check that the Claude Code session is logged in and that the proxy has credit.
- Pending in the branch: ADR `0001-live-run-plays-in-browser` with the measurements in this document, and the glossary terms already added (Live run, Standard scene).
- Decided with the user in the grilling session of 2026-11-18/19 (Q1–Q24).

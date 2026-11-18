# Plan in Motion

**One personal video for each adult in the family, explaining their Sherpas plan.** Built for the *Bring the plan to life* hackathon (Sherpas × UPV Sigma Data Club, November 2026). The original brief is in [`docs/BRIEF.md`](docs/BRIEF.md).

It is made for families who will never sit down with an advisor: the plan has to explain itself.

## The idea

Each adult answers four quick questions (one per screen; each one can be skipped). While the video is generated, they play a small game with the Sherpas yak, with the generation's real progress above it. Then the video plays, with **chapters** under it and a **"Your first step"** card.

| Question | What it changes |
|---|---|
| *What should I call you?* (a box to write in, holding the name on the plan) | The name in the narration |
| *How should I explain it?* Keep it simple · Straight talk · Nerd mode | The depth of the middle of the video: no jargon, or exact figures with tables |
| *What's on your mind most?* Options built from **their own plan** (retiring at 62, the home in 2027, college, a cushion, the card, protecting the family), or their own words | What the video opens on and centres on. If the plan doesn't cover it, it's left out |
| *When you make a big money decision, you…* just do it · research first · ask someone I trust · wait | The call to action, in the card and at the end of the video. It wins over the plan's own guess (persona D5) |

The video is a fixed five-part arc on a mountain-route metaphor: **a personal hook** (8 s max) → **where you are** (the score as altitude) → **what matters most** → **your first step** (the next step on the trail) → **what changes** (score before → after).

**No invented figures.** Every number comes from the plan's facts (`facts.ts`); a validator rejects any number with more than two digits that isn't one of them.

## How it works

```
survey + case ─► [1] brief + facts.ts ─► [2] script (claude -p) ─► [3] voice (ElevenLabs)
              ─► [4] scenes (TSX, claude -p) ─► [5] checks ─► [6] retries / fallback ─► [7] MP4
```

Express runs the pipeline as a background job and streams its progress over SSE; the React app shows that progress on the wait screen.

| Folder | What's inside |
|---|---|
| `backend/` | Express + TypeScript: `cases.ts`, `facts.ts` (facts + `facts.ts` generator + `fmt`), `survey.ts`, `brief.ts`, `script.ts` (schema + plan-only script), `validate.ts`, `tts.ts`, `claude.ts`, `pipeline/` (jobs, SSE, the steps), unit tests in `test/` |
| `frontend/` | Vite + React + TypeScript: picker, survey, wait screen with the yak run, player with chapters and the first-step card |
| `prompts/` | Prompts for `claude -p`, with `{{MARKERS}}` |
| `video-template/` | *(to do)* Remotion: locked tokens, components, fallback composition |
| `design/` | The Sherpas design system: `sherpas-tokens.css`, the yak, the wordmark, the favicon. Rules in [DESIGN.md](DESIGN.md) |
| `cases/` | The four Sherpas cases |
| `runs/` | Outputs per run (git-ignored), except `runs/demo/` for pre-rendered demo videos |
| `web/`, `pipeline/`, `mcp-server/` | The first, static version (HTML + GSAP). Kept as a reference until the new one replaces it: `npm run legacy:serve` |

**State of each step today**

| Step | Status |
|---|---|
| 1 Brief + `facts.ts` | Done |
| 2 Script | Plan-only script by default; `USE_CLAUDE=1` uses `claude -p` with `prompts/script.md` and up to 3 retries |
| 3 Voice | ElevenLabs `/with-timestamps` with a cache, when `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` are set; otherwise timings are estimated |
| 4 Scenes (TSX) | Waiting for `video-template/` |
| 5 Checks | Figures, facts used, hook ≤ 8 s, length 60–120 s |
| 7 MP4 | Plays `runs/demo/<case>/<member>.mp4` if present; otherwise the player shows a preview of the script on the same clock |

## Run it

Requires Node 22 or later.

```bash
npm install
cp .env.example .env     # optional: ElevenLabs key and voice, USE_CLAUDE=1
npm run dev              # API on :3001, app on http://localhost:5180
npm test                 # unit tests (backend)
```

Without any keys everything still works, from `cases/`, with the plan-only script.

## Design

Plan in Motion is a Sherpas feature, so it uses Sherpas' own look: light app screens for the questions and the panels, the navy hero for the video and the wait, Poppins and Inter, the brand blue and the yak. Everything reusable lives in `design/` and is described in [DESIGN.md](DESIGN.md). `.claude/skills/sherpas-design` points Claude at it whenever someone on the team builds a new screen.

Keys stay in `.env` on the machine running the backend. They never reach the browser or the repo.

Plan in Motion
Your Sherpas financial plan, as a short video made for you.

Built by AusiasTeam for the Bring the plan to life hackathon (Sherpas Wealth × UPV Sigma Data Club, November 2026).

A Sherpas plan already holds every figure a family needs: a score, five pillars, goals, projections and the moves that would raise the score. Many families never read it, and the ones who won't sit down with an advisor have nobody to explain it to them. Plan in Motion turns that plan into a personal MP4 for each adult in the household, and ends it on one concrete first step.

What the user sees
Pick a person. The prototype opens on a case and member picker. In production this would be the Sherpas login.
Answer four questions, one tap each:
Name: what the narrator calls you.
How should I explain it? Keep it simple · Straight talk · Nerd mode.
What's on your mind most? The options come from the goals and concerns in that person's own plan.
When you make a big money decision, you… just do it · research first · ask someone I trust · wait.
Wait, but play. While the video renders, a yak runner game fills the wait, with live progress above it: reading your plan, writing your script, recording the narration, designing your scenes, rendering your video.
Watch. A 16:9 video with chapters underneath that are synced to playback.
Take the first step. A card with the top move from the plan, shaped by the person's decision style:
Decision style	First-step card
just_do_it	One big button to start now
research_first	An expandable "Why this number?" breakdown
ask_trusted	"Send this to partner"
wait	What waiting costs, and a reminder
"I did it" and "Remind me" are saved in localStorage and confirm with a nudge ("We'll nudge you on day 3").

Two people in the same household get two different videos from the same plan. In the Johnson case, Daniel (nerd mode, retirement, researches first) gets the detail behind every number. Emily (keep it simple, being covered, talks it over with Daniel) gets the essentials and a button to decide it together.

How it works
survey + case ─▶ 1 brief + facts.ts ─▶ 2 script (Claude) ─▶ 3 voice (ElevenLabs)
              ─▶ 4 scene code (Claude, sandboxed) ─▶ 5 checks ─▶ 6 retry or fallback ─▶ 7 render MP4
Brief (deterministic). The case JSON, persona.md and the survey answers become a brief of about 8 KB, plus facts.ts: every figure in the plan as a named constant (for example SCORE_NOW = 52), with how to say it.

Script. claude -p writes the narration and chapters for a fixed five-part arc:

a personal hook in 8 seconds or less;
where you stand;
what matters most to you;
your first step;
what changes if you take it.
The output is validated with zod and retried with the error if it doesn't match the schema.

Voice. ElevenLabs narration through the hackathon proxy (eleven-multilingual-v2), cached by text hash. Word timings (scribe-v2) drive the captions and fix each scene's length.

Scenes. claude -p writes Remotion scene code inside a sandboxed copy of video-template/. It may edit and add components. Design tokens, Root.tsx, the audio and caption layer, music and voice are locked.

Checks (deterministic):

The locked files are unchanged.
tsc --noEmit passes.
Five still frames render without errors.
The duration is between 60 and 120 s.
The number guard (below) passes.
A visual review looks at the frames for clipped text, overlaps and unreadable contrast.
Retries. Up to three attempts, each with the errors fed back to Claude. If every attempt fails, a fixed fallback composition renders with the case's data, so an MP4 always ships.

Render. Remotion renders the final MP4. Progress streams to the wait screen over Server-Sent Events.

The number guard
The AI writes the film, not the numbers. No number with more than two digits may appear in the narration or the scene code unless it comes from facts.ts. Rounding goes through the shared fmt helper (fmt.round(RETIREMENT_GAP) → "$1.4M"), so "$1.4M" is accepted only when it really is the rounded plan figure. A figure that isn't in the plan never reaches the video. The guard lives in shared/src/number-guard/.

Repository layout
npm workspaces, TypeScript everywhere.

Path	What it holds
backend/	Express API: jobs, SSE, the pipeline, validators, ElevenLabs, claude -p
frontend/	Vite + React: picker, survey, wait screen with the yak game, player with chapters, first-step card
video-template/	Remotion: locked tokens and layers, editable components, the fallback composition
shared/	Contracts shared by everything: brief, script, survey, video props, the number guard
prompts/	script.md, scenes.md, visual-review.md
cases/	The challenge data: four households (daniel-emily-johnson, michael-carter, samantha-lewis, timothy-melanie-weah)
design/	Sherpas design tokens and brand assets (the frontend serves design/assets/)
docs/architecture/	Architecture pages: pipeline, brief, contracts, number guard, video
SPEC.md	The product spec (in Spanish, for the team)
DESIGN.md	The Sherpas design system
Each run writes to runs/<caseId>/<member>/<timestamp>/: the survey, brief, script, audio, scene code, logs and the MP4. runs/ is not committed.

Run it
Requirements
Node.js and npm.
Claude Code installed and signed in. The backend calls claude -p for the script, the scenes and the visual review.
A key for the hackathon LLM proxy, which serves the ElevenLabs models.
Setup
npm install
cp .env.example .env
Fill in .env:

Variable	What it is
LLM_PROXY_URL	The hackathon LiteLLM proxy
LLM_PROXY_KEY	Your team key. Keep it in .env: never commit it or put it in browser code
ELEVENLABS_VOICE_ID	The brand voice used for every video
DEMO_DIR	Optional. The folder of pre-rendered videos for the demo (default: sherpass-demo next to the repository)
Start
npm run dev
This starts the API on port 3001 (API_PORT) and the web app on port 5180 (WEB_PORT). Open http://localhost:5180. A live generation takes a few minutes.

Demo mode
npm run demo
The demo plays videos rendered earlier instead of generating new ones, so it works offline and on stage. To add a finished run, check that every figure in it matches the case, then copy it into the demo folder:

npm run demo:check -w backend -- runs/daniel-emily-johnson/emily/<timestamp>
npm run demo:add -w backend -- runs/daniel-emily-johnson/emily/<timestamp>
npm run demo sets DEMO=1 with POSIX shell syntax. On Windows, run it from Git Bash or WSL.

Other scripts
Command	What it does
npm test	Unit tests (Vitest) for the deterministic parts: brief extraction, facts.ts, the number guard, decision style to call to action, schemas
npm run typecheck	Type-checks every workspace
npm run build	Builds the frontend
npm run brief -w backend	Builds a brief from the command line
npm run script -w backend	Writes a script from the command line
npm run scenes -w backend	Writes scene code from the command line
npm run voice:audition -w backend	Tries voices for the narration
API
Method and path	What it does
GET /api/cases	Lists the cases and their adults
GET /api/cases/:caseId/:member/survey	The survey for one person, with options drawn from their plan
POST /api/jobs	Starts a video. Returns the job id; generation continues in the background
GET /api/jobs/:id	The job's current state
GET /api/jobs/:id/events	Live progress over Server-Sent Events
GET /api/demo	The people available in demo mode
GET /api/demo/:caseId/:member	One pre-rendered result
/runs/…	The run folders, served statically (the MP4 among them)
Jobs live in memory. There is no database.

The video
1920×1080, 30 fps, 60–90 s (the validator accepts up to 120 s).
English narration with one fixed brand voice, background music, and captions timed to each word.
Flat, warm illustration in the Sherpas design system (DESIGN.md): a presenter in an office explains the plan while the wall screen shows the figures.
No metaphors: the plan is told in its own terms ("52 out of 100", the gap, the first step).

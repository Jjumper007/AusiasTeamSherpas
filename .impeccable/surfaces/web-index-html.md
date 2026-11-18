---
version: 1
slug: "web-index-html"
primary_target: "web/index.html"
related_targets: ["web/onboarding.js","web/styles.css"]
---

# Surface brief: Plan in Motion player (onboarding, wait, episode chrome)

Scope: `web/index.html` with `web/onboarding.js`, `web/game.js`, `web/styles.css`. Mode: Operate for the four questions and the advisor view (finish a short task, one tap each); Experience for the wait game and the episode itself.

Audience and job: one adult in a family that just got a Sherpas plan, on a phone at home or on the advisor's meeting screen. Answer four questions in about ten seconds, then watch a one-minute episode that ends in one first step. Confirmed by the user: Sherpas feature branding (wordmark and yak lead, "Plan in Motion" is the feature name); the wait game runs until the episode is ready, then the episode starts by itself; the design system lives in the repo.

Constraints: static site, English copy, no invented figures, keyboard and touch, reduced motion respected, 16:9 and 9:16 from the same code.

## Direction contract

THESIS: The questions are a Sherpas app screen (light, quiet, exact) and the episode is a Sherpas hero (navy, the yak's world). The wait between them is the curtain: the stage drops to the banner's navy and the yak runs a mountain trail until the episode is ready. Refuses the dark video player with one neon accent, and the generic stepper form in a card.

OWN-WORLD: Light side: app frame #F8FAFD, white raised rows with #E2E5EB hairlines and the app's soft offset shadow, ink #141419, secondary #5F6480, brand blue #4565D6 for selection, focus and icons, the lavender-to-blue pill for the one primary action. Navy side: #161827 to #0B0F2E, white yak silhouette and wordmark, blue-bright #6586FC and sky #61A9FA as accents, ice #E0EEFF text. Poppins 600 for questions and titles at -0.02em, Inter 400/500 for everything else. Radii 10 controls, 16 rows and cards, 26 the stage, 80 pills. One line-icon family at 1.75 stroke in brand blue; no emoji as icons.

STORY: They see their own first name and a question they can answer in one tap. Beside it, their episode assembles from their words. The stage turns navy, the yak runs while the plan is read, and the episode begins on its own. They believe this is Sherpas, made for them, and they pick one step.

FIRST VIEWPORT: 16:9 stage, light. Top row: Back, a four-segment progress bar with "1 of 4" beside it, Skip. Left 60%: the question in Poppins 600 at about 6.4cqmin, then the options as full-width white rows (blue line icon, Inter 500 label, secondary sub-label), "Something else" last. Right 35%: the episode card, the yak mark and "Mike's episode" as its title, answered lines arriving with their icons. 9:16: question on top, rows stacked, the card collapses to a chip row at the bottom. The primary action is tapping an option; there is no Next button.

FORM: Pinned by the brief (Sherpas brand: app questionnaire into hero), not rolled. seed: 0320db569d8cc74d0c1968c0e81ac6c7 (rolled at finish review; the Sherpas brand pin and the user's confirmed answers govern the direction). Signature interaction: after the last answer the light stage is wiped to navy from the tapped row, the episode card docks into a progress panel with real steps (reading the plan, picking the opening, preparing the voice), the yak drops onto the trail and runs; Space, tap or click jumps rocks; when the episode is ready the yak runs off to the right and the hook scene enters. Motion grammar: exponential ease-out, one orchestrated moment per transition.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Exact ready signal once the Remotion render exists (the player exposes a hook for it).

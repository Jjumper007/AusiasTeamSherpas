---
name: Sherpas · Plan in Motion
description: Sherpas Wealth's own design system as shipped in Plan in Motion; a light app world for asking, a navy hero world for showing.
colors:
  frame: "#F8FAFD"
  raised: "#FFFFFF"
  hairline: "#E2E5EB"
  chip-track: "#EFF1F5"
  ink: "#141419"
  ink-secondary: "#5F6480"
  ink-tertiary: "#7F8399"
  wordmark-ink: "#0E1C29"
  brand-blue: "#4565D6"
  brand-blue-press: "#1C45D7"
  blue-wash: "#EFF5FF"
  blue-line: "#C6D2FD"
  navy: "#161827"
  navy-deep: "#0B0F2E"
  navy-glow: "#222852"
  navy-surface: "#1C2140"
  navy-surface-raised: "#262C52"
  navy-line: "#2F365E"
  ice: "#E0EEFF"
  navy-muted: "#9EA6C4"
  blue-bright: "#6586FC"
  sky: "#61A9FA"
  lavender: "#948DF7"
  lagoon: "#2EC4C6"
  success: "#1DAE53"
  warning: "#E38F10"
  error: "#F04545"
  stable-gold: "#DBAE3A"
  gain-green: "#3FD27A"
  cta-inset: "#B8C1E6"
typography:
  display:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "max(22px, 6.2cqmin)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "7cqmin"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  figure:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontWeight: 600
    lineHeight: 0.92
    letterSpacing: "-0.035em"
    fontFeature: "tnum"
  title:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  body-strong:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.25
  label:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.3
rounded:
  tag: "6px"
  chip: "8px"
  control: "10px"
  card: "16px"
  stage: "26px"
  pill: "80px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-cta:
    textColor: "{colors.raised}"
    typography: "{typography.title}"
    rounded: "{rounded.pill}"
    padding: "max(10px, 2cqmin) max(18px, 4cqmin)"
  button-solid:
    backgroundColor: "{colors.brand-blue}"
    textColor: "{colors.raised}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  button-solid-hover:
    backgroundColor: "{colors.brand-blue-press}"
  button-ghost:
    textColor: "{colors.ice}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  icon-button:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.control}"
    size: "36px"
  player-control:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    size: "42px"
  player-control-main:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.raised}"
    size: "52px"
  chip-segment:
    backgroundColor: "{colors.chip-track}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
    padding: "8px 14px"
  chip-segment-selected:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
  option-row:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.card}"
    padding: "max(9px, 1.5cqmin) max(14px, 2.4cqmin)"
  option-row-icon:
    backgroundColor: "{colors.blue-wash}"
    textColor: "{colors.brand-blue}"
    rounded: "{rounded.control}"
    size: "max(32px, 5.6cqmin)"
  text-input:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "max(10px, 2cqmin) max(14px, 2.6cqmin)"
  light-card:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "max(16px, 3.2cqmin)"
  navy-card:
    backgroundColor: "{colors.navy-surface}"
    textColor: "{colors.ice}"
    rounded: "{rounded.card}"
    padding: "max(14px, 3cqmin)"
  tag:
    backgroundColor: "{colors.navy-surface-raised}"
    textColor: "{colors.ice}"
    rounded: "{rounded.tag}"
    padding: "max(4px, 0.8cqmin) max(10px, 1.6cqmin)"
  score-band:
    textColor: "{colors.navy-deep}"
    rounded: "{rounded.tag}"
    padding: "max(5px, 1cqmin) max(14px, 2.8cqmin)"
---

# Design System: Sherpas · Plan in Motion

## Overview

**Creative North Star: "From the app to the summit"**

Plan in Motion is a Sherpas feature, not a brand of its own. The "sherpas" wordmark and the yak lead every surface; "Plan in Motion" is only the feature name, set quietly beside the wordmark. The system is Sherpas Wealth's own: palette, type, radii and shadows were extracted from sherpaswealth.com and app.sherpaswealth.com into `design/sherpas-tokens.css`, and the shipped player (`web/styles.css`) is the reference implementation.

There are two worlds, and every new surface lives in exactly one of them. The **light app world** is where people answer, choose and configure: a cool near-white frame, white raised rows with hairline borders and the app's soft offset shadow, ink text, brand blue for selection, focus and icons. It is quiet, exact and dense in the way a good form is. The **navy hero world** is where the plan is shown: the episode, the wait screen, video frames, slides. Navy deepening to midnight, ice-blue text, one bright accent, big Poppins figures, and the white yak. Moving from the first to the second is the system's one theatrical moment: the curtain drops to navy and the yak runs.

Rejected outright: a dark video player with one neon accent, a generic stepper form in a card, glassmorphism, gradient text.

**Key Characteristics:**
- Two worlds: light app (asking) and navy hero (showing); never a muddy middle.
- Poppins 600 at -0.02em for anything the eye should land on; Inter for everything else.
- One accent colour at a time on navy, chosen by the viewer's answer.
- One primary action per screen, as the lavender-to-blue pill.
- Every figure comes from the plan; the design never decorates with fake numbers.
- One Lucide line-icon family at 1.75 stroke.

### Source files and how to use them

- `design/sherpas-tokens.css`: the tokens, in three layers: brand primitives (`--sw-*` from the website, `--app-*` from the app, `--fm-*` for the financial map), semantic roles (`--sh-*`: both worlds, accents, score bands, the mountain palette, type scale, spacing, radii, shadows, focus, motion) and the 1920 x 1080 video values (`--sh-video-*`: safe area, type in px, radii, timing in frames at 30 fps). Link or import it before your own CSS (`../design/sherpas-tokens.css` from `web/`, `import "../../design/sherpas-tokens.css"` in React or Remotion); use the `--sh-*` roles and do not copy values. `class="sh-navy"` switches any container to the navy world, `data-accent` picks its accent.
- `web/styles.css`: the implemented roles. `:root` defines the light world (`--frame`, `--raised`, `--hair`, `--ink`, `--ink-2`, `--ink-3`, `--blue`, `--blue-wash`, `--blue-line`, `--cta`, `--shadow-row`, `--shadow-pop`, `--r-*`, `--font-*`, `--ease-out`); `.stage` redefines the navy world (`--navy`, `--navy-deep`, `--surface`, `--surface-2`, `--line`, `--text`, `--muted`, `--accent`, score-band colours). New screens reuse these role names.
- `design/assets/sherpas-yak.png`, `design/assets/sherpas-wordmark.png`: white on transparent, cropped from `assets/banner.png`. Tint with `mask: url(...) center / contain no-repeat` plus `background: currentColor`, so one file serves ink, brand blue and white.
- `design/assets/sherpas-favicon-32.png`, `design/assets/sherpas-favicon-180.png`: the favicon (black Sherpas "s" on white; the 32 px one is the team's `sherpas-favicon.avif` as PNG, the 180 px one redrawn to match); 32 px for the tab, 180 px for `apple-touch-icon`.
- `web/lib/icons.js`: generated from Lucide by `scripts/build-icons.mjs`. Add the name to `ICONS`, run `npm run icons`, call `icon(name)`. Never edit the generated file.
- Fonts: Google Fonts, Inter 400/500/600/700 and Poppins 500/600.
- `npm run serve` serves only `web/` and `design/`, matching GitHub Pages at the repo root; assets must live in one of them.
- Remotion and slides: import the tokens file and use the `--sh-*` colours with the `--sh-video-*` sizes (1920 x 1080, 30 fps); load Poppins and Inter with `@remotion/google-fonts`. The video lives in the navy world.

## Colors

A blue-lavender family on two grounds: cool near-white for the app, deep navy for the hero, with neutrals tinted toward blue.

### Primary
- **Sherpas Blue** (brand-blue): the brand's working colour. Selection borders, focus rings, progress fill, line icons and the yak mark on light, the small solid button. Pressed/hover shifts to **Deep Sherpas Blue** (brand-blue-press).
- **Blue Wash** (blue-wash) and **Blue Line** (blue-line): the tints of Sherpas Blue. Wash fills icon tiles, answer chips and the input's focus halo; Line is the hover border, text selection and scrollbar.

### Secondary
- **Lavender** (lavender) into Sherpas Blue: the CTA gradient, `linear-gradient(127deg, #948DF7 11%, #4565D6 119%)`, with an inset highlight in cta-inset. Lavender alone is an on-navy accent.
- **Blue Bright** (blue-bright): the default navy-world accent (big figures, headline highlights, chart line, focus ring on navy).

### Tertiary: the anchor accents
The viewer's answer to "Money, for you, is mostly about…" sets the stage's `--accent` through `.stage[data-anchor]`:
- **freedom** → **Sky** (sky)
- **security** → **Blue Bright** (blue-bright)
- **family** → **Lavender** (lavender)
- **experiences** → **Lagoon** (lagoon)

Everything accent-coloured on navy (figures, chart, option borders, the wait progress bar, match tags) inherits it. Never hard-code one of them inside a scene.

### Status and score bands
- **critical** error (#F04545), **vulnerable** warning (#E38F10), **stable** stable-gold (#DBAE3A), **strong** success (#1DAE53). Bands are solid fills with navy-deep text. Warning doubles as the "risk" amber for worrying figures and warning tags.
- **Gain Green** (gain-green): the lighter green for positive deltas text on navy ("+12 pts", the lift pill on a 16% success tint), where #1DAE53 would read too dark.

### Neutral
- **Frame** (frame): the page and the light stage background.
- **Raised White** (raised): cards, rows, top bar, inputs, controls.
- **Hairline** (hairline): every border and divider on light.
- **Chip Track** (chip-track): the recessed track behind segmented chips.
- **Ink** (ink), **Ink Secondary** (ink-secondary), **Ink Tertiary** (ink-tertiary): titles and body; sub-labels and meta; placeholders and keyboard hints only (decorative-level contrast).
- **Wordmark Ink** (wordmark-ink): the wordmark on light.
- **Navy** (navy), **Navy Deep** (navy-deep), **Navy Glow** (navy-glow): the stage is `radial-gradient(110% 90% at 18% 0%, #222852 0%, #161827 48%, #0B0F2E 100%)`; the wait curtain is flat navy-deep.
- **Navy Surface** (navy-surface), **Navy Surface Raised** (navy-surface-raised), **Navy Line** (navy-line): cards, tags and borders inside the stage.
- **Ice** (ice) and **Navy Muted** (navy-muted): text and secondary text on navy. Headlines on navy are pure white.

### Named Rules
**The One Accent Rule.** On navy, exactly one accent is live at a time, and it is the anchor colour. Status colours appear only where they carry meaning (bands, risk figures, best/worst bars).

**The Blue Means Act Rule.** On light, Sherpas Blue marks what is selected, focused or tappable. Do not use it for decoration or body text.

## Typography

**Display Font:** Poppins (with system-ui, sans-serif)
**Body Font:** Inter (with system-ui, -apple-system, Segoe UI, sans-serif)

**Character:** Poppins 600 tightened to -0.02em gives Sherpas' round, confident voice to questions, headlines and figures; Inter does the quiet work. Inter is the brand's own body face, used here by brand mandate.

### Hierarchy
- **Display** (Poppins 600, max(22px, 6.2cqmin), 1.12, -0.02em): onboarding questions; on 9:16 max(21px, 5.4cqmin). `text-wrap: balance`.
- **Headline** (Poppins 600, 7cqmin, 1.08, -0.02em, white): scene headlines on navy; scenes step it down to 5.8 to 6.6cqmin. Highlighted words take the accent.
- **Figure** (Poppins 600, -0.035em, 0.92, tabular numerals): the plan's numbers, sized per scene (hook up to 30cqmin, tiles 8cqmin, comparison 13cqmin). The wait game's distance counter uses Poppins 600 too.
- **Title** (Poppins 600, 16 to 18px, -0.02em): card titles (the video card beside the questions, wait progress strip). The feature name beside the wordmark is Poppins 500 15px at -0.01em in ink-secondary.
- **Body** (Inter 400, 14 to 15px, 1.4 to 1.55): explanations, advisor rows, captions (500, max(13px, 3.1cqmin), with a navy text-shadow over scenes).
- **Body strong** (Inter 500, max(15px, 2.8cqmin), 1.25): option-row labels; their sub-labels are Inter 400 at 0.8em in ink-secondary.
- **Label** (Inter 500, 12 to 13px): chips, counters ("1 of 4", tabular), picker labels, meta lines. Sentence case, no uppercase tracking.

### Named Rules
**The Two Faces Rule.** Poppins for what you read first, Inter for what you read next. No third family, no Poppins below 14px.

**The Floor Rule.** Stage type scales with `cqmin` but always has a px floor (`max(13px, …)`), so 9:16 on a small phone stays legible.

## Layout

The page is a white top bar (wordmark, feature name, one "Watching" select grouped by family, Personalize) over a centred "theatre" that holds the stage. The **stage** is a size container (`container-type: size`) always at 16:9 (`.landscape`), fitted to the viewport (`100dvh - 190px`). Inside it, spacing and type use `cqmin`/`cqw` so the same scene works at both ratios; container queries on aspect ratio (`min-aspect-ratio: 1/1`) switch layouts:

- Onboarding: landscape puts the question and rows left (1.75fr) and the episode card right (1fr, 5cqw gap); portrait stacks them and collapses the card into a wrapping row of blue-wash pills. Option rows are always one full-width column.
- Scenes: figure beside headline in landscape, stacked in portrait; tiles 3 columns landscape, 2 portrait; compare sides side-by-side or stacked.
- Scene padding: 9cqmin top, 7cqmin sides, 16cqmin bottom (room for the caption).

Outside the stage, spacing is px on a 4/8/12/16/20/24 rhythm (top bar 12px 20px, advisor panel 20px 22px, row gaps 12px 16px). Below 640px the pickers become a single horizontally scrolling row with a fade mask, and the voice toggle hides.

## Elevation & Depth

Light world: a hybrid of hairlines and two app shadows. Navy world: tonal layering (surface over navy, raised surface over surface) with near-zero shadow, except the stage itself and overlays.

### Shadow Vocabulary
- **Row** (`0 6px 2px -4px #1414190A, inset 0 -1px 0 #14141933`): resting rows, selects, selected chips, round controls; the app's soft offset with a bottom edge.
- **Pop** (`0 1px 2px #0000000D, 0 8px 10px #0000001A`): hovered rows and the episode card.
- **Stage** (`0 0 0 1px rgba(20,20,25,.06), 0 1px 2px #0000000D, 0 24px 48px -12px rgba(22,24,39,.35)`): the stage as an object on the frame.
- **Panel** (`0 1px 2px #0000000D, 0 16px 40px rgba(20,20,25,.12)`): floating light panels (none in the current build; kept for light popovers).
- **Dialog on navy** (`0 24px 48px rgba(0,0,0,.35)`) over a `rgba(11,15,46,.78)` scrim.

### Named Rules
**The Lift On Intent Rule.** Rows rest at Row and rise to Pop with a 1px lift only on hover. Nothing floats at rest except the stage and the episode card.

## Shapes

Soft, consistent rounding on a fixed scale: 6px tags and score bands, 8px chips inside their track, 10px controls, inputs and icon tiles, 16px rows and cards (light and navy), 26px the stage, 80px pills for buttons. Round controls (play, back, forward) are full circles. Borders are 1px hairlines; on light they are hairline, on navy navy-line. The yak silhouette and the wordmark are the only illustrative shapes; the wait game's mountains are uneven peaks in two tones (far ridge #283063, near ridge #1B2146) under faint ice stars.

## Components

### Buttons
- **Shape:** pills (80px) for text buttons; 10px squares for icon buttons; circles for player controls.
- **CTA (one per screen):** the lavender-to-blue gradient, white text at max(19px, 3cqmin) weight 600, inset highlight `inset 0 1px 2px 0 #B8C1E6`. Reserved for the single primary action (e.g. picking the first step at the end of an episode).
- **Solid:** Sherpas Blue with white 14px/600 text, 10px 18px; hover to Deep Sherpas Blue in 0.12s. Every other affirmative action ("Continue" on the name question, actions in the explain dialog).
- **Ghost:** transparent with a navy-line border and ice text; hover border to navy-muted. Secondary actions on navy (Close).
- **Secondary on navy:** pill in navy-surface-raised with navy-line border (the non-primary choices beside the CTA).
- **Focus:** 2px outline, 2px offset, Sherpas Blue on light, the accent on navy.

### Chips
- **Segmented chips:** a chip-track (3px padding, 10px radius) holding transparent 8px chips (13px/500, ink-secondary, optional 15px blue icon); selected (`aria-pressed`) becomes raised white with the Row shadow and ink text.
- **Answer pills (portrait episode card):** blue-wash fill, pill radius, icon in brand blue.
- **Tags on navy:** 6px, navy-surface-raised with navy-line border, 600 weight; warning tags are amber with navy-deep text. Match tags use an 18% accent tint.

### Cards / Containers
- **Corner Style:** 16px.
- **Light card:** raised white, hairline border, Row shadow (rows) or Pop (episode card); padding max(16px, 3.2cqmin).
- **Navy card:** navy-surface with navy-line border, no shadow; padding max(14px, 3cqmin). Used by tiles, compare sides, steps, choice options, the wait progress strip and the explain dialog.
- **Explain dialog:** navy card up to 640px: muted label, the value as a Poppins figure in the accent, a plain-language paragraph, then the expert detail under a hairline in navy-muted.

### Inputs / Fields
- **Text input:** raised white, 1px Sherpas Blue border, 10px radius, `0 0 0 3px` blue-wash halo; placeholder in ink-tertiary.
- **Select:** raised white, hairline border, 10px radius, Row shadow, a Lucide chevron in ink-secondary at 1.75 stroke as background image.

### Navigation
- **Top bar:** raised white with hairline bottom border; wordmark (92 × 24, wordmark-ink) then the feature name after a hairline divider; pickers right.
- **Onboarding top row:** Back (left), four-segment progress (hairline segments, filled in brand blue) with a tabular "1 of 4", Skip (right). Back and Skip are text buttons in ink-secondary with a Lucide icon; hover to ink.
- **Episode progress:** thin ice segments at 16% across the top of the stage, filled in ice.
- **Player controls:** 42px white circles with Row shadow; the main play/pause is a 52px navy circle with a white icon. Hidden while the questions or the wait are on screen.

### Option row (signature, light)
Full-width white row: a 32px+ blue-wash icon tile with a brand-blue Lucide icon, Inter 500 label with optional sub-label, and on landscape a keyboard hint box (6px, hairline, ink-tertiary) for keys 1 to 9. Hover: blue-line border, 1px lift, Pop shadow. Picked: brand-blue border. "Something else" is last and opens the text input.

### Episode card (signature, light)
The "recipe": the blue yak mark plus "{Name}'s episode" as a Poppins title, then each answered line with its icon as the viewer taps. Collapses to answer pills on 9:16.

### Wait screen (signature, navy)
A flat navy-deep curtain with the yak runner canvas (`web/game.js`): sky navy to navy-deep, faint stars, uneven two-tone peaks, a darker trail, indigo rocks (#46519A lit #5F6CB8), a Poppins distance counter. The yak drops onto the trail and jumps on Space, tap or click; with reduced motion it waits for the first jump instead of starting by itself. A navy-card strip across the top shows the video generation: title with the yak mark ("Generating Mike's video"), the percentage in Poppins with "about N s left", an accent progress bar (role="progressbar"), the current step (reading the plan, writing the script, recording the voice, rendering the video) and the jump hint. On phones the percentage sits under the title. In the demo the generation is simulated for 8 s (`DEMO_MS` in `web/player.js`); a real renderer reports progress through `window.planInMotion.whenReady`. At 100% the strip says the video is ready and the episode starts. A white wordmark at 90% opacity sits bottom-left.

### Score band and ring
Ring track in ice at 10%, the arc and figure in white Poppins; the band is a solid status fill with navy-deep text, capitalized.

### Tappable figures
Any figure with a plan key is tappable: a dotted ice underline at 40% (accent on hover); big figures show no underline at rest and a thin solid one on hover. Tapping opens the explain dialog.

## Do's and Don'ts

### Do:
- **Do** lead with the Sherpas wordmark and the yak; name the feature beside it, never instead of it.
- **Do** link `design/sherpas-tokens.css` and reuse the role variables from `web/styles.css` (`--ink`, `--blue`, `--surface`, `--accent` …) instead of new hex values.
- **Do** put asking in the light app world and showing in the navy hero world.
- **Do** set titles, questions and figures in Poppins 600 at -0.02em (figures -0.035em, tabular) and everything else in Inter 400/500.
- **Do** use the CTA gradient pill for one primary action per screen, white text at 19px+ weight 600; use the Sherpas Blue Solid pill (#4565D6) for every other action.
- **Do** let the anchor answer drive `--accent` on navy through `data-anchor`.
- **Do** use Lucide line icons at stroke 1.75 via `icon()` and `npm run icons`, in brand blue on light.
- **Do** tint the yak and wordmark PNGs with `mask-image` and `currentColor`.
- **Do** keep body contrast at 4.5:1 or better, give every stage size a px floor, and make every interaction work by keyboard and touch.
- **Do** respect `prefers-reduced-motion`: transitions collapse, the yak waits for input. Motion uses `cubic-bezier(0.16, 1, 0.3, 1)` with one orchestrated moment per transition.

### Don't:
- **Don't** use emoji as icons.
- **Don't** put kicker or eyebrow labels above headings.
- **Don't** use gradient text, including the `--sw-gradient-stat-text` token in the tokens file.
- **Don't** use glassmorphism; the `--sw-glass-*` tokens in the tokens file are recorded from the website, not for use.
- **Don't** put the gradient on small buttons, on more than one action, or with text under 19px.
- **Don't** invent or round figures, customers, prices or claims; every number shown comes from the plan.
- **Don't** mix worlds: no white cards on navy scenes, no navy panels in light app screens.
- **Don't** make motion the only carrier of meaning.
- **Don't** add assets outside `web/` and `design/`; `npm run serve` and GitHub Pages serve only those.

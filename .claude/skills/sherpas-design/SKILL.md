---
name: sherpas-design
description: Sherpas Wealth design system for any new interface in this repo (Plan in Motion player, new screens, slides, Remotion frames). Use before writing or restyling any UI, CSS, HTML or video frame.
---

# Sherpas design system

Plan in Motion is a feature of Sherpas, not its own brand: the "sherpas" wordmark and the yak lead, "Plan in Motion" is the feature name.

## Sources (single source of truth)

- `design/sherpas-tokens.css`: colours, type, radii, shadows taken from sherpaswealth.com and the Sherpas app. Link it (`../design/sherpas-tokens.css` from `web/`) instead of copying values.
- `design/assets/sherpas-yak.png`, `design/assets/sherpas-wordmark.png`: white on transparent, cropped from `assets/banner.png`. Tint with CSS `mask-image` + `background: currentColor`.
- `design/assets/sherpas-favicon-32.png`, `design/assets/sherpas-favicon-180.png`: the favicon (black Sherpas "s" on white; the 32 px one is the team's `sherpas-favicon.avif` as PNG, the 180 px one redrawn to match); 32 px for the tab, 180 px for `apple-touch-icon`.
- `web/lib/icons.js`: Lucide line icons (stroke 1.75). Add names in `scripts/build-icons.mjs`, then `npm run icons`.
- `DESIGN.md` (root) and `PRODUCT.md`: the full rules and the product context, once written.

## Rules

- Two worlds. Light app screens (questions, settings, advisor): frame `#F8FAFD`, white cards, hairline `#E2E5EB`, ink `#141419`, secondary `#5F6480`, brand blue `#4565D6` for selection, focus and icons. Navy hero (episode, wait screen): `#161827` to `#0B0F2E`, ice text `#E0EEFF`, accents blue-bright `#6586FC`, sky `#61A9FA`, lavender `#948DF7`.
- Type: Poppins 600 at -0.02em for titles and questions; Inter 400/500 for everything else.
- Radii: 6 tags, 10 controls, 16 rows and cards, 26 stage, 80 pills.
- One primary action per screen: the pill with `linear-gradient(127deg,#948DF7 11%,#4565D6 119%)`, white text, 19px+ weight 600; every other action is the brand-blue `.solid` pill.
- Status: success `#1DAE53`, warning `#E38F10`, error `#F04545`.
- Never: emoji as icons, kicker/eyebrow labels above headings, gradient text, glassmorphism, invented figures. Body contrast at least 4.5:1. Respect `prefers-reduced-motion`. Keyboard and touch both work.
- Served locally with `npm run serve` (serves only `web/` and `design/`, like GitHub Pages at the repo root).

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **The family member** (primary): one adult in a household that just received a financial plan from their Sherpas advisor. They open a link on their phone at home, or watch on the advisor's screen during a meeting. Many are beginners with money vocabulary; some are detail-minded. Their job: understand their own plan in about a minute and take one first step.
- **The financial advisor** (secondary): runs Sherpas for many households. Their job: get each client to understand and act on the plan without a one-to-one walkthrough every time, and walk into the next meeting knowing what the client cares about.
- **Hackathon judges** (this week only): Sherpas Wealth × UPV Sigma Data Club, "Bring the plan to life", 12–19 November 2026. Rubric: hooks, understood, moves to action, personal, creative, plus the Friday idea.

## Product Purpose

"Plan in Motion" turns a family's Sherpas plan into one short interactive video per adult, made of parts. Before it, four quick questions personalize it (each can be skipped). Success: the viewer finishes the minute and picks one first step.

## Positioning

It is a feature of Sherpas, not a separate brand: the explainer step after Sherpas' own Intake, Paraplanner and Portfolio analyst ("the fourth agent"). It looks like a short video but is the family's own plan, animated live from the plan data. Every figure comes from the plan; the AI only writes words around `{placeholders}`, and a guard rejects any number it invents.

## Operating Context

- Delivered as a link from the advisor (or from our MCP server's `create_episode`), always played at 16:9.
- Static site (GitHub Pages): no keys and no AI calls in the browser. Episodes are generated ahead of time by the Node pipeline (`pipeline/`) from the Sherpas MCP or `cases/`.
- A teammate is building a Remotion version of the video; it consumes the same episode JSON and `web/lib/personalize.js`.

## Capabilities and Constraints

- Onboarding: name, how to explain it (simple / straight / nerd), what is on your mind (options built from that family's own plan, or free text), and what money is about (freedom / security / family / experiences). Answers choose between pre-built, pre-checked scenes; they never change a figure.
- Wait screen: a small runner game with the Sherpas yak, with the video generation's progress above it; simulated for 8 s in the demo, then the video starts.
- Tap any number to see what it means, in plain words or full detail. Episodes end on a choice, not a fade-out.
- Product copy is English. The team's own docs are Spanish.
- Never invent figures, customers, prices or claims.

## Brand Commitments

- **Sherpas Wealth's brand, as a Sherpas feature** (confirmed by the user, 18 Nov 2026): the "sherpas" wordmark and the yak lead; "Plan in Motion" is the feature name.
- Palette and type come from `design/sherpas-tokens.css`, extracted from sherpaswealth.com and app.sherpaswealth.com: Poppins for display, Inter for body, brand blue #4565D6, navy #161827, lavender-to-blue CTA gradient.
- The yak silhouette and wordmark come from the hackathon banner (`assets/banner.png`).
- The design system must stay reusable by the team for further interfaces (DESIGN.md, tokens, project skill).

## Evidence on Hand

- Four real Sherpas cases in `cases/` (financial-health.json, investment-analysis.json, persona.md, report.pdf): Michael Carter, Timothy & Melanie Weah, Daniel & Emily Johnson, Samantha Lewis.
- Hackathon banner with the yak and wordmark: `assets/banner.png`.
- No testimonials, customers, usage numbers or pricing exist; none may be fabricated.

## Product Principles

1. The plan's numbers are sacred: show them, explain them, never invent or round them into new claims.
2. One minute, one step: every episode ends in a single concrete action.
3. Personal without forms: one tap per question, and every answer visibly changes what they see.
4. Feels like part of Sherpas: an advisor should be able to ship it to clients tomorrow.
5. The advisor learns something from every viewing.

## Accessibility & Inclusion

Beginners with money vocabulary are a core audience: plain-language explanations for every figure. Works on phone and desktop, by touch and keyboard; motion is never the only carrier of meaning, and reduced motion is respected.

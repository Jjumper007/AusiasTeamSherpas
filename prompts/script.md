<!-- prompt: script · version: 1 · used by backend/src/script/write-script.ts. Placeholders in double braces are filled per job. -->
You are writing the narration script of a 60–90 second personal video for one client of Sherpas Wealth, a financial planning firm. The video turns their financial plan into a mountain route: the score is the altitude the family is at, each top move is a stretch of the trail, missing protection or cash is gear missing from the backpack, retirement is the summit, and the first step is the next step on the trail.

Write warm, plain, spoken American English, addressed to the person as "you". Sound like a good guide who knows them, not like a bank or an advert. No hype, no promises about returns, no advice beyond what the plan says.

## The person

Survey answers (they chose these):

```json
{{SURVEY}}
```

- `nickname`: what to call them. Say it in the hook.
- `topOfMind`: what worries them most. The hook names it and part 3 is about it.
- `explainLevel`: how technical part 3 is (see "Explain level" below).
- `decisionStyle`: how they make big money decisions. It shapes the call to action (see "Call to action").

Partner (the other adult in the household, or null): {{PARTNER}}

## The plan

The brief, distilled from their plan. Use it to understand the family, their score, their goals and their concerns:

```json
{{BRIEF}}
```

The first step of the video is always this move (the first of `topMoves`). Parts 4 and 5 talk about this move and no other:

```json
{{FIRST_STEP}}
```

## Figures: the only numbers you may say

Every number of 3 or more digits, every money amount, every percentage and every number with a scale ("$5K") you write must come from this list of facts, written exactly as one of the forms in the "Say it as" column. Numbers of 1–2 digits (ages, "52 out of 100", "8 months") are fine.

{{FACTS}}

The prose of the brief (`narrative`, `concerns`, `tensions`, `goals`, `topMoves[].action`) quotes numbers that are NOT in this list, such as yearly amounts or dates. That prose is context only: never repeat its numbers. If a figure you want is not in the list, say the idea without a number ("most of the gap", "a big share of your free cash").

"529" (the US college savings plan) is a number the check rejects: say "college savings account" instead.

Do not mention topics the plan does not cover, and never invent figures, dates, products or people.

## The five parts, always in this order

1. `hook` — at most 18 words (about 8 seconds). Name them by their nickname and name what is on their mind (`topOfMind`) in their own terms. Mention the family if it fits. No figures.
2. `where_you_are` — the score as altitude: "52 out of 100" is how high they are on the mountain. `factsUsed` must start with `SCORE_NOW`.
3. `what_matters` — their `topOfMind`, connected to one or two of the plan's concerns about it. This is where the explain level changes the most. `factsUsed` lists the facts it says, most important first: the video shows the first 1 (`simple`), the first 3 (`straight`) or all of them (`nerd`) on screen.
4. `first_step` — one single action: the first step above, in plain words, and why it matters for this family. Say how much effort it is.
5. `what_changes` — what changes if they take it: {{SCORE_CHANGE}} Add something tangible for the family. End with one sentence that hands over to the card under the video, in their decision style.

Each scene's `factsUsed` lists the names of the facts that scene says or shows, and only names from the list. `visualIdea` is one short sentence describing what the scene shows inside the mountain-route metaphor (altimeter, trail map, backpack, summit, the family hiking).

The whole narration is 150–220 words. Narration is spoken, so write figures the way they will be read aloud and avoid parentheses, lists, abbreviations and symbols other than $ and %.

## Explain level (mostly part 3, but it colours every part)

- `simple`: everyday words only, short sentences, one figure in part 3, rounded ("$1.4M"). No terms like "withdrawal rate", "liquidity" or "allocation"; explain ideas with the mountain instead.
- `straight`: clear and direct, two or three figures in part 3, rounded. Common financial terms are fine ("emergency fund", "life insurance").
- `nerd`: precise. Four or five figures in part 3, exact ("$1,427,456"), with the terms the plan uses and how the figures relate (the gap versus what is set aside, months of reserve versus the target). Still spoken, still warm.

## Chapters

One chapter per scene, in the same order, shown as text under the video. `title`: 2–5 words. `body`: 2–3 sentences at the chosen explain level that say what the scene says, written to be read rather than heard. Same figure rules as the narration.

## Call to action

`cta.type` is exactly the survey's `decisionStyle`. `cta.text` is one or two sentences shown on the card under the video, about the first step:

- `just_do_it`: invite them to start now; it takes about 10 minutes.
- `research_first`: invite them to open "Why this number?" and check the figures behind the first step before deciding.
- `ask_trusted`: invite them to send this to their partner by name (or someone they trust if there is no partner) and decide together.
- `wait`: respect not doing it today; say that until they take the step their score stays where it is, and that we can remind them.

## Output

Reply with one JSON object and nothing else: no prose before or after, no Markdown fences. It must match this shape exactly:

```
{
  "scenes": [
    { "part": "hook", "narration": "...", "visualIdea": "...", "factsUsed": [] },
    { "part": "where_you_are", "narration": "...", "visualIdea": "...", "factsUsed": ["SCORE_NOW"] },
    { "part": "what_matters", "narration": "...", "visualIdea": "...", "factsUsed": ["..."] },
    { "part": "first_step", "narration": "...", "visualIdea": "...", "factsUsed": ["..."] },
    { "part": "what_changes", "narration": "...", "visualIdea": "...", "factsUsed": ["..."] }
  ],
  "chapters": [
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." }
  ],
  "cta": { "type": "{{DECISION_STYLE}}", "text": "..." }
}
```

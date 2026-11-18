import {
  fmt,
  validateNarration,
  type Brief,
  type Chapter,
  type ExplainLevel,
  type Facts,
  type Pillar,
  type Script,
  type TopicId,
  type TopMove,
} from '@sherpas/shared'
import { toConstantName } from '../brief/facts/fact-builders'
import { closingLine, ctaFor, type CtaContext } from './cta'
import { topicFacts, type NamedFact } from './topic-facts'

/**
 * The script without Claude (SPEC §5.6): built only from the brief and the facts, so a job always
 * has a script that passes the number guard. Every figure it says comes from `facts` through `fmt`.
 * Claude's script (#6) replaces it when it passes the same checks.
 */

export const SCORE_FACT = 'SCORE_NOW'
const SCORE_MAX = 100
const MAX_NARRATIVE_WORDS = 28
/** "Daniel's life cover today" keeps its capital inside a sentence; other labels are lower-cased. */
const STARTS_WITH_POSSESSIVE_NAME = /^[A-Z][a-z]+'s\b/
const HAS_DIGIT = /\d/
/** Markdown (**bold**, "label:") from the case files does not read aloud. */
const HAS_MARKUP = /[*:#]/
/** Sentences that lean on the one before ("That is a thin cushion…") do not stand on their own. */
const LEANS_ON_PREVIOUS = /^(That|This|These|Those|It|They|But|And|So|Still|However|Even)\b/
/** Sentences about the report itself ("The sections below…", "We'd also confirm…"), not about the family. */
const ABOUT_THE_REPORT = /\b(below|above|sections?|we'd|we would|the data)\b/i

/** How many figures part 3 says at each level. The video shows the same ones (WhatMattersScene). */
const FIGURES_BY_LEVEL: Readonly<Record<ExplainLevel, number>> = { simple: 1, straight: 3, nerd: 5 }

/** How the hook names the topic: "…, starting with retiring when you plan to." */
const TOPIC_PHRASE: Readonly<Record<TopicId, string>> = {
  retirement: 'retiring when you plan to',
  college: 'paying for college',
  emergency_fund: 'your cash cushion',
  debt: 'getting debt under control',
  protection: 'protecting your family',
  home_purchase: 'buying a home',
  investments: 'how your investments are set up',
}

const TOPIC_TITLE: Readonly<Record<TopicId, string>> = {
  retirement: 'Retirement',
  college: 'College',
  emergency_fund: 'Your cash cushion',
  debt: 'Your debt',
  protection: 'Protecting your family',
  home_purchase: 'Buying a home',
  investments: 'Your investments',
}

/** Words a sentence of the plan must contain to be about the topic. */
const TOPIC_WORDS: Readonly<Record<TopicId, RegExp>> = {
  retirement: /retire/i,
  college: /college|education|529/i,
  emergency_fund: /cash|emergency|cushion|reserve/i,
  debt: /debt|card|loan/i,
  protection: /cover|insurance|protect|umbrella/i,
  home_purchase: /home|house|down payment/i,
  investments: /invest|portfolio|holdings/i,
}

/** Part 3 opens with the topic as part of the mountain route. */
const TOPIC_INTRO: Readonly<Record<TopicId, string>> = {
  retirement: 'Retirement is the summit of this route.',
  college: 'College is a long stretch of this route.',
  emergency_fund: 'Your cash cushion is the gear that keeps a bad month from becoming a fall.',
  debt: 'Debt is extra weight in the pack.',
  protection: 'Protection is the rope that holds the family if someone slips.',
  home_purchase: 'A home of your own is a camp you want to reach on the way up.',
  investments: 'Your investments are what carries you up the climb.',
}

/** What one scene says and the facts it declares. */
interface SceneText {
  readonly narration: string
  readonly factsUsed: string[]
}

const lowerFirst = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1)

/** The other adult of the household, or null for someone living alone. */
export const partnerOf = (brief: Brief): string | null =>
  brief.household.find((person) => person.role !== 'child' && person.firstName !== brief.member.firstName)
    ?.firstName ?? null

/** The fact with the score after a move: SCORE_AFTER_RAISE_MORTALITY_COVERAGE. */
export const scoreAfterFactName = (move: TopMove): string => `SCORE_AFTER_${toConstantName(move.title)}`

const passesGuard = (text: string, facts: Facts): boolean => validateNarration(text, facts).ok

/**
 * A fact label as it is said aloud. "529" (the US college savings plan) is a number the guard rejects,
 * so "Balance in 529 college accounts" is said as "Balance in college accounts".
 */
const spokenLabel = (label: string): string => {
  const said = label.replace(/\b529 (college )?/g, 'college ')
  return STARTS_WITH_POSSESSIVE_NAME.test(said) ? said : lowerFirst(said)
}

/** "Retirement gap in today's dollars, $1.4M": rounded for listening, exact in nerd mode. */
const sayFact = ({ fact }: NamedFact, level: ExplainLevel): string =>
  `${spokenLabel(fact.label)}, ${level === 'nerd' ? fmt.fact(fact) : fmt.round(fact)}`

const listFigures = (figures: ReadonlyArray<NamedFact>, level: ExplainLevel): string => {
  const said = figures.map((figure) => sayFact(figure, level))
  if (said.length === 1) return `One number to remember: ${said[0]}.`
  return `Here are the numbers: ${said.slice(0, -1).join('; ')}; and ${said[said.length - 1]}.`
}

/**
 * A sentence in the plan's own words (`narrative.*` texts for the topic), without figures: the prose
 * quotes numbers that are not facts (decision on #2), and the figures are said from facts instead.
 */
const narrativeLine = (brief: Brief, topic: TopicId): string | undefined =>
  Object.entries(brief.narrative)
    .filter(([key]) => !key.startsWith('summary_'))
    .flatMap(([, text]) => text.split(/(?<=\.)\s+|\n/))
    .map((sentence) => sentence.replace(/^[-\s]+/, '').trim())
    .find(
      (sentence) =>
        sentence.endsWith('.') &&
        TOPIC_WORDS[topic].test(sentence) &&
        !HAS_DIGIT.test(sentence) &&
        !HAS_MARKUP.test(sentence) &&
        !LEANS_ON_PREVIOUS.test(sentence) &&
        !ABOUT_THE_REPORT.test(sentence) &&
        sentence.split(/\s+/).length <= MAX_NARRATIVE_WORDS,
    )

const hookLine = (brief: Brief): string =>
  `${brief.survey.nickname}, here is your plan as a mountain route, starting with ${TOPIC_PHRASE[brief.survey.topOfMind]}.`

const pillarFactNames = (pillar: Pillar): string[] => {
  const name = `PILLAR_${toConstantName(pillar.name)}`
  return [`${name}_POINTS`, `${name}_MAX_POINTS`]
}

const shareOfMax = (pillar: Pillar): number => pillar.points / pillar.maxPoints

const whereYouAre = (brief: Brief): SceneText => {
  const { value, band, pillars } = brief.score
  const score = `${value} out of ${SCORE_MAX}`
  const level = brief.survey.explainLevel
  if (level === 'simple') {
    return {
      narration: `Think of your plan as a mountain route. Today you are at ${score}. That is your altitude, and there is a clear way up.`,
      factsUsed: [SCORE_FACT],
    }
  }
  const base = `Your financial health score is ${score}, which the plan calls ${band}. Think of it as altitude: the higher you climb, the safer the route.`
  if (level === 'straight') return { narration: base, factsUsed: [SCORE_FACT] }

  const ranked = [...pillars].sort((left, right) => shareOfMax(right) - shareOfMax(left))
  const strongest = ranked[0]
  const weakest = ranked[ranked.length - 1]
  return {
    narration: `${base} ${strongest.name} is your strongest area, at ${strongest.points} of ${strongest.maxPoints} points. ${weakest.name} is the weakest, at ${weakest.points} of ${weakest.maxPoints}.`,
    factsUsed: [SCORE_FACT, ...pillarFactNames(strongest), ...pillarFactNames(weakest)],
  }
}

const whatMatters = (brief: Brief, facts: Facts): SceneText => {
  const { explainLevel: level, topOfMind: topic } = brief.survey
  const figures = topicFacts(facts, topic, brief.member.firstName).slice(0, FIGURES_BY_LEVEL[level])
  const plainWords = level === 'nerd' ? undefined : narrativeLine(brief, topic)
  const figureLine = figures.length > 0 ? listFigures(figures, level) : undefined
  return {
    narration: [TOPIC_INTRO[topic], plainWords, figureLine].filter((part) => part !== undefined).join(' '),
    factsUsed: figures.map((figure) => figure.name),
  }
}

/** The move's dollar amounts are facts named after it: RAISE_ANNUAL_SAVINGS_AMOUNT, …_AMOUNT_2. */
const moveAmountFacts = (move: TopMove, facts: Facts): string[] => {
  const amountName = new RegExp(`^${toConstantName(move.title)}_AMOUNT(_\\d+)?$`)
  return Object.keys(facts).filter((name) => amountName.test(name))
}

const firstStep = (brief: Brief, facts: Facts, move: TopMove): SceneText => {
  const step = `Your first step on the trail: ${lowerFirst(move.title)}.`
  const effort = `The plan rates it ${move.effort} effort.`
  const action = `${move.action.replace(/\.$/, '')}.`
  const withAction = brief.survey.explainLevel !== 'simple' && passesGuard(action, facts)
  return withAction
    ? { narration: `${step} ${action} ${effort}`, factsUsed: moveAmountFacts(move, facts) }
    : { narration: `${step} ${effort}`, factsUsed: [] }
}

const whatChanges = (facts: Facts, move: TopMove, cta: CtaContext): SceneText => {
  const afterFact = scoreAfterFactName(move)
  const lifts = move.scoreAfter > move.scoreBefore && afterFact in facts
  const change = lifts
    ? `Take it, and your score climbs from ${move.scoreBefore} to ${move.scoreAfter}. Same mountain, one stretch higher.`
    : 'It does not move the score, but it closes a gap the plan flags.'
  return { narration: `${change} ${closingLine(cta)}`, factsUsed: lifts ? [SCORE_FACT, afterFact] : [] }
}

const chaptersFor = (brief: Brief, narrations: ReadonlyArray<string>): Script['chapters'] => {
  const titles = [
    `Hi, ${brief.survey.nickname}`,
    'Where you are',
    TOPIC_TITLE[brief.survey.topOfMind],
    'Your first step',
    'What changes',
  ]
  const [hook, where, matters, step, changes] = titles.map(
    (title, index): Chapter => ({ title, body: narrations[index] }),
  )
  return [
    { ...hook, body: `${hook.body} It is built from your Sherpas plan and your answers.` },
    where,
    matters,
    step,
    changes,
  ]
}

/** Builds the five-part script, the chapters and the call to action for one person, without an LLM. */
export const buildFallbackScript = (brief: Brief, facts: Facts): Script => {
  const [move] = brief.topMoves
  const cta: CtaContext = { decisionStyle: brief.survey.decisionStyle, move, partner: partnerOf(brief) }
  const hook = hookLine(brief)
  const where = whereYouAre(brief)
  const matters = whatMatters(brief, facts)
  const step = firstStep(brief, facts, move)
  const changes = whatChanges(facts, move, cta)
  const topic = TOPIC_TITLE[brief.survey.topOfMind].toLowerCase()

  return {
    scenes: [
      { part: 'hook', narration: hook, visualIdea: 'The family at the trailhead, the route on the map.', factsUsed: [] },
      { part: 'where_you_are', ...where, visualIdea: 'The altimeter rises to the score.' },
      { part: 'what_matters', ...matters, visualIdea: `The figures about ${topic}, on the trail map.` },
      { part: 'first_step', ...step, visualIdea: 'The missing gear goes into the backpack.' },
      { part: 'what_changes', ...changes, visualIdea: 'The family climbs one stretch; the altimeter ticks up.' },
    ],
    chapters: chaptersFor(brief, [hook, where.narration, matters.narration, step.narration, changes.narration]),
    cta: ctaFor(cta),
  }
}

// What the "Your first step" card shows for a result, by decision style (SPEC §3). Pure: no React,
// so the mapping is unit-tested and FirstStep.tsx only renders it. Every figure comes from the
// result's facts (`firstStepScore`, `waitGap`), never from the numbers on `firstStep`.
//   just_do_it      one big "Start now" button, "Takes about 10 minutes."
//   research_first  "Why this number?" with the exact figures behind the video (no big button)
//   ask_trusted     "Send this to <partner>" / "to someone you trust"
//   wait            what waiting costs (score and the gap left open) and a "Remind me" button
import type { DecisionStyle, FactDetail, JobResult } from './types'

export type StepMark = 'done' | 'remind'

export const DONE_TOAST = "Nice. That's your first step done. We'll check in on day 30."
export const REMIND_TOAST = "We'll nudge you on day 3."
export const NO_PARTNER = 'someone you trust'
const HEADING_LEAD = 'Your first step:'
const TEN_MINUTES = 'Takes about 10 minutes.'
const CLOSES_A_GAP = 'Closes a gap the plan flags'
const WAIT_WITHOUT_LIFT = "Waiting leaves the gap open: this step doesn't change the score, but the plan flags it."

/** The big button of the card: what it says and what it does. */
export interface PrimaryAction {
  readonly kind: 'start' | 'share' | 'remind'
  readonly label: string
  /** For "Remind me": already set in this browser, so it shows as pressed after a reload. */
  readonly pressed: boolean
}

export interface FirstStepCard {
  readonly variant: DecisionStyle
  /** "Your first step: Raise mortality coverage" */
  readonly heading: string
  /** The pill under the heading: "Score 52 → 57", or "Closes a gap the plan flags". */
  readonly scoreLine: string
  readonly lifts: boolean
  /** null for research_first, whose action is reading the figures. */
  readonly primary: PrimaryAction | null
  readonly note: string | null
  /** Only for wait: the score sentence, and the gap this step leaves open when a fact names it. */
  readonly waitCost: { readonly score: string; readonly gap: FactDetail | null } | null
  /** "Remind me" as a small pill too (wait already has it as its big button). */
  readonly remindPill: boolean
  /** Who ask_trusted sends it to. */
  readonly shareTo: string
}

const primaryFor = (variant: DecisionStyle, shareTo: string, mark: StepMark | null): PrimaryAction | null => {
  switch (variant) {
    case 'just_do_it':
      return { kind: 'start', label: 'Start now', pressed: false }
    case 'research_first':
      return null
    case 'ask_trusted':
      return { kind: 'share', label: `Send this to ${shareTo}`, pressed: false }
    case 'wait':
      return mark === 'remind'
        ? { kind: 'remind', label: 'Reminder set', pressed: true }
        : { kind: 'remind', label: 'Remind me', pressed: false }
  }
}

/**
 * What the card reads of a result: a rendered video's `JobResult`, or what a Live run's page has
 * (no video URL yet). Any other `JobResult` field may come along.
 */
export type FirstStepSource = Pick<JobResult, 'cta' | 'firstStep' | 'firstStepScore' | 'waitGap' | 'partner'> & Partial<JobResult>

/** `mark` is what this browser remembers for the step ("I did it" / "Remind me"), if anything. */
export const firstStepCard = (result: FirstStepSource, mark: StepMark | null = null): FirstStepCard => {
  const variant = result.cta.type
  // Results this browser saved before these fields existed have neither: the card then shows no figures.
  const score = result.firstStepScore ?? null
  const gap = result.waitGap ?? null
  const shareTo = result.partner ?? NO_PARTNER
  return {
    variant,
    heading: `${HEADING_LEAD} ${result.firstStep.title}`,
    scoreLine: score ? `Score ${score.now} → ${score.after}` : CLOSES_A_GAP,
    lifts: score !== null,
    primary: primaryFor(variant, shareTo, mark),
    note: variant === 'just_do_it' ? TEN_MINUTES : null,
    waitCost:
      variant === 'wait'
        ? { score: score ? `While you wait, your score stays at ${score.now} instead of ${score.after}.` : WAIT_WITHOUT_LIFT, gap }
        : null,
    remindPill: variant !== 'wait',
    shareTo,
  }
}

export const toastFor = (mark: StepMark): string => (mark === 'done' ? DONE_TOAST : REMIND_TOAST)

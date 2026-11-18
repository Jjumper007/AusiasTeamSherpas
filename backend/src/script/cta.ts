import type { Cta, DecisionStyle, TopMove } from '@sherpas/shared'

/** What the first-step card and the end of the video ask for, by decision style (SPEC §3). */
export interface CtaContext {
  readonly decisionStyle: DecisionStyle
  readonly move: TopMove
  /** The other adult of the household, or null for someone living alone. */
  readonly partner: string | null
}

const lowerFirst = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1)

const ctaText = ({ decisionStyle, move, partner }: CtaContext): string => {
  const lifts = move.scoreAfter > move.scoreBefore
  switch (decisionStyle) {
    case 'just_do_it':
      return `Start now: ${lowerFirst(move.title)}. It takes about 10 minutes.`
    case 'research_first':
      return 'Why this number? Open the figures behind your first step before you decide.'
    case 'ask_trusted':
      return `Send this to ${partner ?? 'someone you trust'} and decide together.`
    case 'wait':
      return lifts
        ? `Not today? Until you take this step, your score stays at ${move.scoreBefore}. We will remind you.`
        : 'Not today? That is fine. We will remind you.'
  }
}

/** The call to action for the card under the video. Its type is always the survey answer. */
export const ctaFor = (context: CtaContext): Cta => ({ type: context.decisionStyle, text: ctaText(context) })

/** The last sentence of the video, which hands over to the card under it. */
export const closingLine = ({ decisionStyle, partner }: CtaContext): string => {
  switch (decisionStyle) {
    case 'just_do_it':
      return 'It takes about 10 minutes, and the button is right under this video.'
    case 'research_first':
      return 'Want the why behind each number? It is all under this video.'
    case 'ask_trusted':
      return `Watch this again with ${partner ?? 'someone you trust'}, then decide together.`
    case 'wait':
      return 'Not ready yet? That is fine. We can remind you.'
  }
}

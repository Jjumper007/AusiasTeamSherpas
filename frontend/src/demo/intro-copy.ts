// The words of the demo's first screen (the prototype intro), agreed with the team.
import { EXPLAIN_TEXT } from '../survey-labels'
import type { Survey, TopicId } from '../types'

export const INTRO_TITLE = 'A video of your plan, made just for you'
export const INTRO_BODY = [
  "This is a working prototype of Plan in Motion. It reads a family's real Sherpas plan and four answers about you. Then Claude writes the script and designs the scenes, ElevenLabs records the narration, and Remotion renders the video.",
  'A new video takes 5 to 8 minutes, so this demo plays one our pipeline already made for the answers it shows.',
] as const
export const PICK_TITLE = 'Whose plan do you want to see?'

/** What a video focuses on, as the end of "Focused on …". */
const TOPIC_FOCUS: Readonly<Record<TopicId, string>> = {
  retirement: 'retirement',
  college: 'paying for college',
  emergency_fund: 'an emergency fund',
  debt: 'getting out of debt',
  protection: 'protecting the family',
  home_purchase: 'buying a home',
  investments: 'their investments',
}

/** One line on a member's card, from the demo answers: how the video explains the plan and its focus. */
export const memberLine = ({ explainLevel, topOfMind }: Survey): string =>
  `${EXPLAIN_TEXT[explainLevel].sub}. Focused on ${TOPIC_FOCUS[topOfMind]}.`

import type { DecisionStyle } from '@sherpas/shared'

/**
 * The survey's decision style takes priority over the D5 that `persona.md` inferred.
 *
 * The brief schema keeps D5 as a free string, so the override is written into that string:
 * it starts with the survey answer in upper case (the value to act on) and then names the
 * persona value it replaced, e.g. `WAIT (survey answer; overrides persona.md D5: DUAL)`.
 * `Brief.survey.decisionStyle` still carries the raw answer.
 */
export const overrideD5 = (personaD5: string, decisionStyle: DecisionStyle): string =>
  `${decisionStyle.toUpperCase()} (survey answer; overrides persona.md D5: ${personaD5})`

/** persona.md D5 values and the survey answer that fits each one. */
const DECISION_STYLE_BY_D5: Readonly<Record<string, DecisionStyle>> = {
  COLLABORATOR: 'ask_trusted',
  DUAL: 'ask_trusted',
  DELEGATOR: 'ask_trusted',
  VALIDATOR: 'research_first',
  ANALYTICAL: 'research_first',
  AVOIDANT: 'wait',
  PROCRASTINATOR: 'wait',
}

const FALLBACK_DECISION_STYLE: DecisionStyle = 'just_do_it'

/** The decision style to use when the survey question was skipped: the closest match to persona.md D5. */
export const decisionStyleFromPersona = (personaD5: string): DecisionStyle =>
  DECISION_STYLE_BY_D5[personaD5.trim().toUpperCase()] ?? FALLBACK_DECISION_STYLE

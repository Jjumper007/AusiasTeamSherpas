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

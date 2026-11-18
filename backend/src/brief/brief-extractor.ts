import {
  BriefSchema,
  type Brief,
  type Goal,
  type HouseholdPerson,
  type Member,
  type Pillar,
  type Survey,
  type TopMove,
} from '@sherpas/shared'
import { loadCase, type CaseData } from './case-loader'
import type { Plan, RawGoalSummary, RawPerson, RawTopMove } from './case-schema'
import { overrideD5 } from './decision-style'
import { BriefError, describeIssues } from './errors'
import { selectNarrative } from './narrative-selector'
import { parsePillarPoints } from './pillar-points'
import { parseSurveyInput } from './survey-input'
import { coveredTopics } from './topic-coverage'

/** The brief carries at most this many top moves; facts name the same ones. */
export const MAX_TOP_MOVES = 3

const isAdult = (person: RawPerson): boolean => person.role !== 'child'

const sameName = (left: string, right: string): boolean => left.trim().toLowerCase() === right.trim().toLowerCase()

const findMember = (caseId: string, household: ReadonlyArray<RawPerson>, firstName: string): RawPerson => {
  const adults = household.filter(isAdult).map((person) => person.first_name).join(', ')
  const person = household.find((candidate) => sameName(candidate.first_name, firstName))
  if (!person) {
    throw new BriefError(`No member named "${firstName}" in case "${caseId}". Selectable members: ${adults}`)
  }
  if (!isAdult(person)) {
    throw new BriefError(
      `${person.first_name} is a child and does not get a video of their own. Selectable members: ${adults}`,
    )
  }
  return person
}

const toMember = (person: RawPerson): Member => {
  if (person.role === 'child' || person.retirement_age === undefined || person.risk_profile === undefined) {
    throw new BriefError(`${person.first_name} has no retirement age or risk profile in the plan`)
  }
  return {
    firstName: person.first_name,
    role: person.role,
    age: person.age,
    retirementAge: person.retirement_age,
    riskProfile: person.risk_profile,
  }
}

const toHouseholdPerson = (person: RawPerson): HouseholdPerson => ({
  firstName: person.first_name,
  role: person.role,
  age: person.age,
})

const toPillars = (plan: Plan): Pillar[] =>
  plan.score.pillars.map((pillar) => ({ name: pillar.pillar, ...parsePillarPoints(pillar.points_shown_in_app) }))

const toTopMove = (move: RawTopMove): TopMove => ({
  title: move.title,
  action: move.action,
  effort: move.effort,
  scoreBefore: move.score_before,
  scoreAfter: move.score_after,
})

/** A purchase goal is named by its sub-type so a home and a vehicle purchase stay apart. */
const toGoal = (goal: RawGoalSummary): Goal => ({
  type: goal.subType ?? goal.goalType,
  text: goal.value,
  ...(goal.amount === undefined ? {} : { amount: goal.amount }),
})

/** Size of the brief as it is sent to the model: UTF-8 bytes of its compact JSON. */
export const briefSizeBytes = (brief: Brief): number => new TextEncoder().encode(JSON.stringify(brief)).length

/** Builds the brief for one adult of an already loaded case. `survey` must already be valid. */
export const buildBrief = (caseData: CaseData, memberFirstName: string, survey: Survey): Brief => {
  const { caseId, plan, persona } = caseData
  const member = findMember(caseId, plan.case.household, memberFirstName)
  const topic = coveredTopics(caseData).find((covered) => covered === survey.topOfMind)

  const brief = {
    caseId,
    member: toMember(member),
    household: plan.case.household.map(toHouseholdPerson),
    score: { value: plan.score.published_score, band: plan.score.band, pillars: toPillars(plan) },
    topMoves: plan.score.top_moves.slice(0, MAX_TOP_MOVES).map(toTopMove),
    goals: plan.goals.goalsSummary.map(toGoal),
    narrative: selectNarrative(plan.narrative, topic),
    classification: { ...persona.classification, D5: overrideD5(persona.classification.D5, survey.decisionStyle) },
    concerns: persona.concerns,
    tensions: persona.tensions,
    survey,
  }

  const result = BriefSchema.safeParse(brief)
  if (!result.success) {
    throw new BriefError(`Case "${caseId}" does not fit the brief schema: ${describeIssues(result.error.issues)}`)
  }
  return result.data
}

/**
 * Builds the brief Claude reads to write one person's script.
 * Deterministic: the same case, member and survey always give the same brief.
 */
export const extractBrief = (caseId: string, memberFirstName: string, survey: Survey): Brief =>
  buildBrief(loadCase(caseId), memberFirstName, parseSurveyInput(survey))

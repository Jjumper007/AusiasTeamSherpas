import type { CaseData } from '../brief/case-loader'
import { BriefError } from '../brief/errors'

/** An adult of a case: the people who can get a video. Children only appear in their parents' story. */
export interface Adult {
  /** Lower-case first name, used in URLs and run folders: "daniel". */
  readonly id: string
  readonly firstName: string
  /** The other adult of the household, if there is one. */
  readonly partner: string | null
}

const ADULT_ROLES: ReadonlySet<string> = new Set(['client', 'co-client'])

const memberId = (firstName: string): string => firstName.trim().toLowerCase()

/** The adults of a case, client first. */
export const adultsOf = ({ plan }: CaseData): Adult[] => {
  const names = plan.case.household.filter((person) => ADULT_ROLES.has(person.role)).map((person) => person.first_name)
  return names.map((firstName) => ({
    id: memberId(firstName),
    firstName,
    partner: names.find((other) => other !== firstName) ?? null,
  }))
}

/** Finds an adult by id ("daniel") or first name; children and unknown names are an error. */
export const findAdult = (caseData: CaseData, member: string): Adult => {
  const adults = adultsOf(caseData)
  const adult = adults.find((candidate) => candidate.id === memberId(member))
  if (!adult) {
    const selectable = adults.map((candidate) => candidate.id).join(', ')
    throw new BriefError(`No adult "${member}" in case "${caseData.caseId}". Selectable members: ${selectable}`)
  }
  return adult
}

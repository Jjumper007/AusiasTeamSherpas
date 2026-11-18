import type { SurveyOption, TopicId } from '@sherpas/shared'
import { loadCase, type CaseData } from './case-loader'
import { coveredTopics } from './topic-coverage'

const SINGLE_PERSON_HOUSEHOLD = 1

const joinNames = (names: ReadonlyArray<string>): string =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

const collegeLabel = ({ plan }: CaseData): string => {
  const children = plan.case.household.filter((person) => person.role === 'child').map((person) => person.first_name)
  return children.length > 0 ? `Paying for college for ${joinNames(children)}` : 'Paying for college'
}

const protectionLabel = ({ plan }: CaseData): string =>
  plan.case.household.length > SINGLE_PERSON_HOUSEHOLD
    ? 'Protecting my family if something happens to me'
    : 'Being covered if something goes wrong'

/** Plain-language wording of each topic, as the client would say it. */
const LABEL_BY_TOPIC: Readonly<Record<TopicId, (caseData: CaseData) => string>> = {
  retirement: () => 'Being able to retire when I plan to',
  college: collegeLabel,
  emergency_fund: () => 'Having enough cash set aside for emergencies',
  debt: () => 'Getting my debt under control',
  protection: protectionLabel,
  home_purchase: () => 'Buying a home',
  investments: () => 'Whether my investments are set up right',
}

/** Options for "What's on your mind most?": only the topics this case's plan covers. */
export const buildSurveyOptions = (caseData: CaseData): SurveyOption[] =>
  coveredTopics(caseData).map((id) => ({ id, label: LABEL_BY_TOPIC[id](caseData) }))

/** Loads the case and returns its options for "What's on your mind most?". */
export const surveyOptionsForCase = (caseId: string): SurveyOption[] => buildSurveyOptions(loadCase(caseId))

import type { SurveyInfo } from '../api/types'
import { loadCase } from '../brief/case-loader'
import { buildSurveyOptions } from '../brief/survey-options'
import { findAdult } from './members'
import { resolveSurvey } from './resolve-survey'

/** What the four questions need for one adult of a case: the API's survey route and the demo site share it. */
export const surveyInfo = (caseId: string, member: string): SurveyInfo => {
  const caseData = loadCase(caseId)
  const adult = findAdult(caseData, member)
  return {
    caseId: caseData.caseId,
    member: adult.id,
    name: adult.firstName,
    partner: adult.partner,
    options: buildSurveyOptions(caseData),
    defaults: resolveSurvey(caseData, adult, {}),
  }
}

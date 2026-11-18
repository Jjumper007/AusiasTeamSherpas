import { Router } from 'express'
import { listCaseIds, loadCase, type CaseData } from '../brief/case-loader'
import { buildSurveyOptions } from '../brief/survey-options'
import { adultsOf, findAdult } from '../survey/members'
import { resolveSurvey } from '../survey/resolve-survey'
import type { CaseSummary, SurveyInfo } from './types'

const summarise = (caseData: CaseData): CaseSummary => {
  const adults = adultsOf(caseData)
  return {
    caseId: caseData.caseId,
    family: adults.map((adult) => adult.firstName).join(' & '),
    score: caseData.plan.score.published_score,
    band: caseData.plan.score.band,
    people: adults.map((adult) => ({ id: adult.id, name: adult.firstName })),
  }
}

/** The picker (families and their adults) and what the four questions need for one adult. */
export const casesRoutes = (): Router => {
  const router = Router()

  router.get('/cases', (_req, res) => {
    res.json({ cases: listCaseIds().map((caseId) => summarise(loadCase(caseId))) })
  })

  router.get('/cases/:caseId/:member/survey', (req, res) => {
    const caseData = loadCase(req.params.caseId)
    const adult = findAdult(caseData, req.params.member)
    const info: SurveyInfo = {
      caseId: caseData.caseId,
      member: adult.id,
      name: adult.firstName,
      partner: adult.partner,
      options: buildSurveyOptions(caseData),
      defaults: resolveSurvey(caseData, adult, {}),
    }
    res.json(info)
  })

  return router
}

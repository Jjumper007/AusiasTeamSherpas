import { Router } from 'express'
import { listCaseIds, loadCase, type CaseData } from '../brief/case-loader'
import { adultsOf } from '../survey/members'
import { surveyInfo } from '../survey/survey-info'
import type { CaseSummary } from './types'

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
    res.json(surveyInfo(req.params.caseId, req.params.member))
  })

  return router
}

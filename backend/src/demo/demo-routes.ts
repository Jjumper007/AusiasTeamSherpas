import { Router } from 'express'
import type { DemoInfo } from '../api/types'
import { DemoFileError, isSlug, listDemoPeople, readDemoResult } from './demo-folder'

/** Shown when someone tries to make a new video while the app plays the demo. */
export const DEMO_REFUSAL = 'This is the demo: it plays videos made earlier.'
const BROKEN_FILE = 'This demo video cannot be played: its result file is broken. Check the backend log.'
const NOT_IN_DEMO = 'No demo video for this person.'

const NOT_DEMO: DemoInfo = { demo: false, people: [] }

/**
 * `GET /demo` says whether the app is the demo and who has a video; `GET /demo/:caseId/:member`
 * gives that person's result. With `demoDir` unset (not the demo) nobody has one. In demo mode,
 * `POST /jobs` is refused here, before the pipeline's own route can start anything.
 */
export const demoRoutes = (demoDir: string | undefined): Router => {
  const router = Router()

  router.get('/demo', (_req, res) => {
    const info: DemoInfo = demoDir ? { demo: true, people: listDemoPeople(demoDir) } : NOT_DEMO
    res.json(info)
  })

  router.get('/demo/:caseId/:member', (req, res) => {
    const { caseId, member } = req.params
    if (!isSlug(caseId) || !isSlug(member)) {
      res.status(400).json({ error: 'Not a valid case or member id' })
      return
    }
    try {
      const result = demoDir ? readDemoResult(demoDir, { caseId, member }) : null
      if (!result) {
        res.status(404).json({ error: NOT_IN_DEMO })
        return
      }
      res.json(result)
    } catch (error) {
      if (!(error instanceof DemoFileError)) throw error
      console.error(`[demo] ${caseId}/${member}: ${error.message}`)
      res.status(500).json({ error: BROKEN_FILE })
    }
  })

  if (demoDir) {
    router.post('/jobs', (_req, res) => {
      res.status(409).json({ error: DEMO_REFUSAL })
    })
  }

  return router
}

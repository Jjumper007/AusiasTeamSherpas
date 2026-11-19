/// <reference types="node" />
import { basename, dirname } from 'node:path'
import { Router } from 'express'
import type { JobResult } from '../api/types'
import { DemoFileError, demoVideoFile, hasDemoVideo, isSlug, readDemoResult, type DemoPerson } from '../demo/demo-folder'

/**
 * The Live run's safety net (docs/specs/live-run.md): when the video has not started after 40 s or the
 * run fails, the page plays the member's Demo video from the Demo folder (the one `npm run demo` uses).
 * Only the live server mounts these (`live-server.ts`):
 * - GET /api/live/demo/<caseId>/<member>: their Demo video's result.json, checked with its schema, with a
 *   `videoUrl` on this server; 404 when they have none;
 * - GET /api/live/demo/<caseId>/<member>/video.mp4: the MP4, with range requests (the chapters seek).
 */

export interface LiveDemoDeps {
  /** The Demo folder: `demoDir()` from paths.ts. */
  readonly demoDir: string
}

const BASE_PATH = '/api/live/demo'
const NOT_FOUND = { error: 'This member has no Demo video' }
const UNREADABLE = { error: 'The Demo video of this member cannot be read' }

/** Where the page plays a member's Demo video. */
export const demoVideoPath = ({ caseId, member }: DemoPerson): string => `${BASE_PATH}/${caseId}/${member}/video.mp4`

/** The ids of the route, when both are slugs (nothing path-like reaches the disk). */
const personOf = (params: Record<string, string>): DemoPerson | null => {
  const { caseId, member } = params
  return isSlug(caseId) && isSlug(member) ? { caseId, member } : null
}

/** The person's result, null when they have no Demo video. Throws a `DemoFileError` when it is broken. */
const resultOf = (demoDir: string, person: DemoPerson): JobResult | null => {
  const result = readDemoResult(demoDir, person)
  return result ? { ...result, videoUrl: demoVideoPath(person) } : null
}

export const liveDemoRoutes = ({ demoDir }: LiveDemoDeps): Router => {
  const router = Router()

  router.get(`${BASE_PATH}/:caseId/:member`, (req, res) => {
    const person = personOf(req.params)
    if (!person) {
      res.status(404).json(NOT_FOUND)
      return
    }
    try {
      const result = resultOf(demoDir, person)
      if (!result) {
        res.status(404).json(NOT_FOUND)
        return
      }
      res.set('cache-control', 'no-store').json(result)
    } catch (error) {
      if (!(error instanceof DemoFileError)) throw error
      console.error(`[live demo] ${person.caseId}/${person.member}: ${error.message}`)
      res.status(500).json(UNREADABLE)
    }
  })

  router.get(`${BASE_PATH}/:caseId/:member/video.mp4`, (req, res, next) => {
    const person = personOf(req.params)
    if (!person || !hasDemoVideo(demoDir, person)) {
      res.status(404).json(NOT_FOUND)
      return
    }
    // sendFile answers range requests (206) and sets the MP4's type from its extension. With `root`, only
    // the fixed file name is checked for dots: a Demo folder under e.g. ~/.local still plays.
    const file = demoVideoFile(demoDir, person)
    res.sendFile(basename(file), { root: dirname(file), dotfiles: 'deny' }, (error) => {
      if (error && !res.headersSent) next(error)
    })
  })

  return router
}

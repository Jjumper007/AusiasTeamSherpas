/// <reference types="node" />
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { Router } from 'express'
import type { Part } from '@sherpas/shared'
import { liveSceneFiles, LIVE_SCENE_PARTS } from './live-scene-files'

/**
 * GET /api/live/runs/<caseId>/<member>/<stamp>/scene-modules/<part>.js: the module a Live run compiled
 * once for a part after every check passed (#15), saved in its run folder. The `scene ready` event
 * carries this URL (`savedSceneModulePath`). Vite's dev server adds `?import` to it: the query is ignored.
 */

/** One folder name of a run id: no dots in front, so never ".." or a hidden folder. */
const RUN_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/
const MODULE_FILE = /^([a-z_]+)\.js$/

const partOfFile = (file: string): Part | undefined => {
  const name = MODULE_FILE.exec(file)?.[1]
  return LIVE_SCENE_PARTS.find((part) => part === name)
}

export const sceneModuleRoutes = (runsDir: string): Router => {
  const router = Router()
  router.get('/api/live/runs/:caseId/:member/:stamp/scene-modules/:file', async (req, res) => {
    const { caseId, member, stamp, file } = req.params
    const part = partOfFile(file)
    if (![caseId, member, stamp].every((segment) => RUN_SEGMENT.test(segment)) || !part) {
      res.status(404).json({ error: 'No such scene module' })
      return
    }
    const modulePath = join(resolve(runsDir), caseId, member, stamp, liveSceneFiles(part).module)
    const code = await readFile(modulePath, 'utf8').catch(() => undefined)
    if (code === undefined) {
      res.status(404).json({ error: 'No such scene module' })
      return
    }
    res.set({ 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' }).send(code)
  })
  return router
}

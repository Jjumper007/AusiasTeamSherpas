/// <reference types="node" />
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import express, { Router } from 'express'
import { PARTS, type Part } from '@sherpas/shared'
import { SANDBOX_DIR } from '../scenes/sandbox'
import { compileScene, type CompileSceneInput, type CompileSceneResult } from './compile-scene'
import { sceneFileOf } from './scene-module-contract'
import { sceneModuleRoutes } from './scene-module-routes'

/**
 * Routes only the live server mounts (`live-server.ts`):
 * - GET /api/live/runs/<caseId>/<member>/<stamp>/scenes/<part>: the part's scene of that run's template
 *   copy, compiled for the browser (`compileScene`), as a JavaScript module (the spike, #13);
 * - GET /api/live/runs/<caseId>/<member>/<stamp>/scene-modules/<part>.js: the module a Live run compiled
 *   once and saved when Claude's scene for that part passed its checks (#15, `scene-module-routes.ts`);
 * - the template's `public/` folder at the site root, where the locked `Soundtrack` points with
 *   `staticFile()` (/music/..., /sfx/...). The run's narration is already served under /runs.
 */

export interface LiveRoutesDeps {
  readonly runsDir: string
  /** `video-template/public`. */
  readonly templatePublicDir: string
  readonly compile?: (input: CompileSceneInput) => Promise<CompileSceneResult>
}

/** One folder name of a run id: no dots in front, so never ".." or a hidden folder. */
const RUN_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/
const UNPROCESSABLE = 422
const MS_DECIMALS = 1

const isPart = (value: string): value is Part => (PARTS as readonly string[]).includes(value)

export const liveRoutes = ({ runsDir, templatePublicDir, compile = compileScene }: LiveRoutesDeps): Router => {
  const router = Router()

  router.get('/api/live/runs/:caseId/:member/:stamp/scenes/:part', async (req, res) => {
    const { caseId, member, stamp, part } = req.params
    if (![caseId, member, stamp].every((segment) => RUN_SEGMENT.test(segment)) || !isPart(part)) {
      res.status(404).json({ error: 'No such scene' })
      return
    }
    const srcDir = join(resolve(runsDir), caseId, member, stamp, SANDBOX_DIR, 'src')
    if (!existsSync(srcDir)) {
      res.status(404).json({ error: 'No such run' })
      return
    }
    const result = await compile({ srcDir, sceneFile: sceneFileOf(part) })
    const ms = result.ms.toFixed(MS_DECIMALS)
    if (!result.ok) {
      console.error(`[live] ${caseId}/${member}/${stamp} ${part} does not compile:\n${result.problems.join('\n')}`)
      res.status(UNPROCESSABLE).json({ error: 'The scene does not compile', problems: result.problems })
      return
    }
    res
      .set({
        'content-type': 'text/javascript; charset=utf-8',
        'cache-control': 'no-store',
        'server-timing': `compile;dur=${ms}`,
      })
      .send(result.code)
  })

  router.use(sceneModuleRoutes(runsDir))
  router.use(express.static(templatePublicDir, { dotfiles: 'ignore', index: false, fallthrough: true }))
  return router
}

import type { Part } from '@sherpas/shared'

/**
 * The contract between a Claude scene compiled for the browser (`compile-scene.ts`) and the page that
 * loads it (`frontend/src/live/player/scene-host.ts`). The web imports this file at runtime, so it must
 * not import anything from Node or the rest of the backend.
 *
 * A compiled scene module:
 * - is an ES module whose default export is the scene component (`FC<SceneProps>`), the export named
 *   after its file (`WhatMattersScene.tsx` exports `WhatMattersScene`);
 * - contains only the scene file's own code: every import reads the page's instance from
 *   `globalThis[LIVE_HOST_KEY]`, keyed as below, so React, Remotion and the template are never copied;
 * - may import the packages in `HOST_PACKAGES` and any `.ts`/`.tsx` module of the template's `src/`
 *   by a relative path; anything else is refused when it is compiled.
 */

/** The global the page fills with its own module instances before it loads any scene module. */
export const LIVE_HOST_KEY = '__SHERPAS_LIVE_HOST__'

/**
 * Packages a scene reads from the page. `react/jsx-runtime` is what compiled JSX imports. lucide-react
 * is read too: bundling it means parsing its ~1,600 icon files, ~0.5 s per scene instead of ~10 ms.
 */
export const HOST_PACKAGES = ['react', 'react/jsx-runtime', 'remotion', '@sherpas/shared', 'lucide-react'] as const
export type HostPackage = (typeof HOST_PACKAGES)[number]

/** Template modules are keyed by their path under the template's `src/`, without extension: `template/components/Heading`. */
export const TEMPLATE_KEY_PREFIX = 'template/'

const SOURCE_EXTENSION = /\.(tsx|ts)$/

/** The host key of a template module, from its path under `src/` ("components/Heading.tsx"). */
export const templateKey = (pathInSrc: string): string => `${TEMPLATE_KEY_PREFIX}${pathInSrc.replace(SOURCE_EXTENSION, '')}`

/** The component that draws a part, as `src/scenes/index.ts` names it: what_matters → WhatMattersScene. */
export const sceneComponentName = (part: Part): string =>
  `${part
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join('')}Scene`

/** The scene file of a part, relative to the template's `src/`. */
export const sceneFileOf = (part: Part): string => `scenes/${sceneComponentName(part)}.tsx`

/** Where the live server serves the compiled scene of a part of a run ("<caseId>/<member>/<stamp>"). */
export const sceneModulePath = (runId: string, part: Part): string => `/api/live/runs/${runId}/scenes/${part}`

/** Where the live server serves the module a Live run compiled once for a part and saved in its folder (#15). */
export const savedSceneModulePath = (runId: string, part: Part): string => `/api/live/runs/${runId}/scene-modules/${part}.js`

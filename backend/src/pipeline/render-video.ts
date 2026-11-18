/// <reference types="node" />
import { join } from 'node:path'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import type { VideoProps } from '@sherpas/shared'
import { VIDEO_TEMPLATE_DIR } from '../paths'

/** Reports how far the render is (0–1) and what it is doing, for the progress bar. */
export type RenderProgress = (fraction: number, label: string) => void

/** Renders `props` to an MP4 at `outputFile`. Swappable so the pipeline can be tested without Chrome. */
export type RenderVideo = (props: VideoProps, outputFile: string, onProgress: RenderProgress) => Promise<void>

const COMPOSITION_ID = 'SherpasVideo'
const ENTRY_POINT = join(VIDEO_TEMPLATE_DIR, 'src', 'index.ts')
/** Share of the progress bar spent bundling the template (only the first job of the server bundles it). */
const BUNDLE_SHARE = 0.25

let bundled: Promise<string> | undefined

/** Bundles `video-template/` once per server process; a failed bundle is retried on the next job. */
const bundleTemplate = (onProgress: RenderProgress): Promise<string> => {
  bundled ??= bundle({
    entryPoint: ENTRY_POINT,
    rootDir: VIDEO_TEMPLATE_DIR,
    onProgress: (percent) => onProgress((percent / 100) * BUNDLE_SHARE, 'Preparing the video'),
  }).catch((error: unknown) => {
    bundled = undefined
    throw error
  })
  return bundled
}

/** Renders one at a time: two Chrome renders side by side would slow both and risk running out of memory. */
let queue: Promise<unknown> = Promise.resolve()

const renderNow: RenderVideo = async (props, outputFile, onProgress) => {
  const serveUrl = await bundleTemplate(onProgress)
  const composition = await selectComposition({ serveUrl, id: COMPOSITION_ID, inputProps: props })
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: outputFile,
    inputProps: props,
    onProgress: ({ progress }) => onProgress(BUNDLE_SHARE + progress * (1 - BUNDLE_SHARE), 'Rendering your video'),
  })
}

/** Renders with Remotion (`@remotion/renderer`), queued behind any render already running. */
export const renderWithRemotion: RenderVideo = (props, outputFile, onProgress) => {
  const next = queue.then(() => renderNow(props, outputFile, onProgress))
  queue = next.catch(() => undefined)
  return next
}

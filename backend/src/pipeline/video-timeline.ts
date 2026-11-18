import type { VideoProps } from '@sherpas/shared'
import { BRAND, videoFrames } from '../../../video-template/src/locked/timing'

/**
 * Where the five scenes sit in the rendered MP4. The video opens with the Sherpas logo and closes
 * on it (Video 4.0), so the scenes start a little after 0 and the MP4 lasts a little longer than
 * the narration. Read from the template's own timing, so the two can never drift apart.
 */

/** The video's frame rate (`VIDEO.fps` in `video-template/src/locked/tokens.ts`). */
export const FPS = 30

/** Seconds of the logo opening before the first scene starts. */
export const SCENES_START_SEC = BRAND.contentFromFrame / FPS

/** Length of the whole MP4 in seconds: opening, the five scenes and the closing. */
export const videoDurationSec = (timings: VideoProps['scenes']): number => videoFrames(timings, FPS) / FPS

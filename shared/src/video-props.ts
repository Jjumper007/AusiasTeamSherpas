import { z } from 'zod'
import { BriefSchema } from './brief'
import { FactsSchema } from './facts'
import { ScriptSchema } from './script'

/** One caption cue, timed relative to the start of its scene. */
export const CaptionSchema = z.object({
  text: z.string().min(1),
  startSec: z.number().nonnegative(),
  endSec: z.number().positive(),
})
export type Caption = z.infer<typeof CaptionSchema>

/**
 * Timing of one scene, known only after narration is generated.
 * Without `audioFile` the scene plays silent for `durationSec`.
 */
export const SceneTimingSchema = z.object({
  durationSec: z.number().positive(),
  audioFile: z.string().min(1).optional(),
  captions: z.array(CaptionSchema).optional(),
})
export type SceneTiming = z.infer<typeof SceneTimingSchema>

/** Input props of the Remotion composition: the contract between the pipeline and the video. */
export const VideoPropsSchema = z.object({
  brief: BriefSchema,
  script: ScriptSchema,
  facts: FactsSchema,
  /** One timing per scene, in the same order as `script.scenes`. */
  scenes: z.tuple([
    SceneTimingSchema,
    SceneTimingSchema,
    SceneTimingSchema,
    SceneTimingSchema,
    SceneTimingSchema,
  ]),
})
export type VideoProps = z.infer<typeof VideoPropsSchema>

import { VideoPropsSchema, videoPropsFixture } from '@sherpas/shared'
import type { FC } from 'react'
import { Composition } from 'remotion'
import { totalFrames } from './timing'
import { VIDEO } from './tokens'
import { Video } from './Video'

export const COMPOSITION_ID = 'SherpasVideo'

/** LOCKED. Registers the single composition. Its length comes from the scene durations in the props. */
export const Root: FC = () => (
  <Composition
    id={COMPOSITION_ID}
    component={Video}
    width={VIDEO.width}
    height={VIDEO.height}
    fps={VIDEO.fps}
    durationInFrames={totalFrames(videoPropsFixture.scenes, VIDEO.fps)}
    defaultProps={videoPropsFixture}
    calculateMetadata={({ props }) => {
      const parsed = VideoPropsSchema.parse(props)
      return { durationInFrames: totalFrames(parsed.scenes, VIDEO.fps), props: parsed }
    }}
  />
)

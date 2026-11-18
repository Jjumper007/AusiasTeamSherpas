import type { FC } from 'react'
import { Audio, Sequence, staticFile } from 'remotion'
import { musicVolume, soundCues, type SoundTimeline } from './sound'

/**
 * LOCKED. Plays the base video's music bed and sound effects (Video 4.0). The files live in
 * `video-template/public/` and are bundled with every copy of the template.
 */

/** Long enough for the longest effect to finish. */
const SFX_FRAMES = 90
/** "Inspired" by Kevin MacLeod (incompetech.com), CC BY 4.0; credited in the closing. */
const MUSIC_FILE = 'music/inspired.mp3'

interface SoundtrackProps extends SoundTimeline {
  readonly totalFrames: number
}

export const Soundtrack: FC<SoundtrackProps> = ({ totalFrames, ...timeline }) => (
  <>
    <Audio src={staticFile(MUSIC_FILE)} volume={(frame) => musicVolume(frame, totalFrames, timeline.outroFromFrame)} />
    {soundCues(timeline).map((cue, index) => (
      <Sequence key={index} from={Math.max(0, cue.atFrame)} durationInFrames={SFX_FRAMES} layout="none" name={`sfx ${cue.sfx}`}>
        <Audio src={staticFile(`sfx/${cue.sfx}.wav`)} volume={cue.volume} />
      </Sequence>
    ))}
  </>
)

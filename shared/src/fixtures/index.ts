import { BriefSchema } from '../brief'
import type { VideoProps } from '../video-props'
import briefJson from './brief.daniel.json'
import { factsFixture } from './facts.daniel'
import { scriptFixture } from './script.daniel'

/** Sample brief for Daniel, extracted from the real case. Parsed so a schema change fails loudly. */
export const briefFixture = BriefSchema.parse(briefJson)

/** Sample props for a silent render: no audio yet, with plausible scene durations. */
export const videoPropsFixture: VideoProps = {
  brief: briefFixture,
  script: scriptFixture,
  facts: factsFixture,
  scenes: [
    { durationSec: 8 },
    { durationSec: 14 },
    { durationSec: 24 },
    { durationSec: 12 },
    { durationSec: 14 },
  ],
}

export { factsFixture, scriptFixture }

import type { VideoProps } from '@sherpas/shared'
import { BAND_COLORS, COLORS } from '../locked/tokens'
import { pointsFacts } from './scene-facts'

/**
 * The stamps of the base video, now taken from the plan: the score band while "where you are"
 * plays, and the points gained while "what changes" plays. The locked stage draws them.
 */
export interface Burst {
  readonly sceneIndex: number
  /** When it pops, as a share of the scene's length. */
  readonly atShare: number
  readonly text: string
  readonly color: string
}

const BAND_AT_SHARE = 0.3
const GAIN_AT_SHARE = 0.35

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

export const burstsFor = ({ brief, facts, script }: Pick<VideoProps, 'brief' | 'facts' | 'script'>): Burst[] =>
  script.scenes.flatMap((scene, sceneIndex): Burst[] => {
    if (scene.part === 'where_you_are') {
      const color = BAND_COLORS[brief.score.band.toLowerCase()]
      return color ? [{ sceneIndex, atShare: BAND_AT_SHARE, text: capitalize(brief.score.band), color }] : []
    }
    if (scene.part === 'what_changes') {
      const [before, after] = pointsFacts(scene, facts)
      const gain = before && after ? Math.round(after.value - before.value) : 0
      return gain > 0 ? [{ sceneIndex, atShare: GAIN_AT_SHARE, text: `+${gain} points`, color: COLORS.success }] : []
    }
    return []
  })

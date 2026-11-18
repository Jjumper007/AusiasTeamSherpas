import { BriefError } from './errors'

/** Pillar points as the app shows them, e.g. "16/30". */
const PILLAR_POINTS_PATTERN = /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/

/** Turns "16/30" into points and maximum points. */
export const parsePillarPoints = (shown: string): { points: number; maxPoints: number } => {
  const match = PILLAR_POINTS_PATTERN.exec(shown.trim())
  if (!match) throw new BriefError(`Pillar points "${shown}" are not in the "points/max" format`)
  return { points: Number(match[1]), maxPoints: Number(match[2]) }
}

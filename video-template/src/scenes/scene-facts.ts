import type { Fact, Facts, Scene } from '@sherpas/shared'

type DeclaresFacts = Pick<Scene, 'factsUsed'>

/** The facts a scene declares in `factsUsed`, in that order. These are the only figures a scene may show. */
export const sceneFacts = (scene: DeclaresFacts, facts: Facts): Fact[] =>
  scene.factsUsed.filter((name) => name in facts).map((name) => facts[name])

/** The score facts a scene declares, e.g. the score today, or the score before and after a move. */
export const pointsFacts = (scene: DeclaresFacts, facts: Facts): Fact[] =>
  sceneFacts(scene, facts).filter((fact) => fact.unit === 'points')

/** One area of the score, as the scene declares it: points today and the maximum. */
export interface PillarScore {
  /** The area's name, as the score names it ("Liquidity and emergency fund"). */
  readonly name: string
  readonly points: Fact
  readonly maxPoints: Fact
}

const PILLAR_POINTS = /^PILLAR_(.+)_POINTS$/
const MAX_SUFFIX = '_MAX_POINTS'

/** Areas whose `PILLAR_<AREA>_POINTS` and `PILLAR_<AREA>_MAX_POINTS` the scene both declares. */
export const pillarScores = (scene: DeclaresFacts, facts: Facts): PillarScore[] =>
  scene.factsUsed
    .filter((name) => PILLAR_POINTS.test(name) && !name.endsWith(MAX_SUFFIX))
    .flatMap((name) => {
      const maxName = name.replace(/_POINTS$/, MAX_SUFFIX)
      const points = facts[name]
      const maxPoints = facts[maxName]
      if (!points || !maxPoints || !scene.factsUsed.includes(maxName)) return []
      return [{ name: points.label.split(':')[0].trim(), points, maxPoints }]
    })

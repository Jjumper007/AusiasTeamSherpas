import type { Fact, Facts, Scene } from '@sherpas/shared'

type DeclaresFacts = Pick<Scene, 'factsUsed'>

/** The facts a scene declares in `factsUsed`, in that order. These are the only figures a scene may show. */
export const sceneFacts = (scene: DeclaresFacts, facts: Facts): Fact[] =>
  scene.factsUsed.filter((name) => name in facts).map((name) => facts[name])

/** The score facts a scene declares, e.g. the score today, or the score before and after a move. */
export const pointsFacts = (scene: DeclaresFacts, facts: Facts): Fact[] =>
  sceneFacts(scene, facts).filter((fact) => fact.unit === 'points')

/** Geometry of the mountain trail, in composition pixels. Pure functions, no drawing. */

export interface Point {
  readonly x: number
  readonly y: number
}

/** The trail from the trailhead (score 0) up the switchbacks to the summit (score 100). */
export const TRAIL_POINTS: readonly Point[] = [
  { x: 260, y: 950 },
  { x: 700, y: 905 },
  { x: 1060, y: 800 },
  { x: 960, y: 700 },
  { x: 1200, y: 610 },
  { x: 1110, y: 510 },
  { x: 1300, y: 420 },
  { x: 1250, y: 330 },
  { x: 1340, y: 225 },
]

export const SUMMIT: Point = TRAIL_POINTS[TRAIL_POINTS.length - 1]

const SCORE_SCALE_MAX = 100

const distance = (a: Point, b: Point): number => Math.hypot(b.x - a.x, b.y - a.y)

const SEGMENT_LENGTHS = TRAIL_POINTS.slice(1).map((point, index) =>
  distance(TRAIL_POINTS[index], point),
)
const TRAIL_LENGTH = SEGMENT_LENGTHS.reduce((total, length) => total + length, 0)

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

const pointInSegment = (index: number, remaining: number): Point => {
  const start = TRAIL_POINTS[index]
  const end = TRAIL_POINTS[index + 1]
  const ratio = remaining / SEGMENT_LENGTHS[index]
  return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio }
}

/** The point at a fraction (0 = trailhead, 1 = summit) of the trail's length. */
export const pointAt = (fraction: number): Point => {
  const target = clamp01(fraction) * TRAIL_LENGTH
  const walk = (index: number, remaining: number): Point =>
    index >= SEGMENT_LENGTHS.length - 1 || remaining <= SEGMENT_LENGTHS[index]
      ? pointInSegment(index, Math.min(remaining, SEGMENT_LENGTHS[index]))
      : walk(index + 1, remaining - SEGMENT_LENGTHS[index])
  return walk(0, target)
}

/** How far up the trail a score sits: the score is the altitude. */
export const fractionForScore = (score: number): number => clamp01(score / SCORE_SCALE_MAX)

export const trailPath = (): string =>
  TRAIL_POINTS.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')

import type { FC } from 'react'
import { Pop } from './Pop'
import { bodyText, cardStyle, clampLines, figureText } from './ui'

interface StatCardProps {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
  readonly delayFrames: number
  /** Colour of the top edge. */
  readonly accent: string
  /** The figure, already formatted (`fmt`). */
  readonly figure: string
  readonly label: string
  readonly figureSize: number
  readonly labelSize?: number
  readonly labelLines?: number
}

/** The stat card of the base video: a big figure over its label, with a coloured top edge. */
export const StatCard: FC<StatCardProps> = ({
  left,
  top,
  width,
  height,
  delayFrames,
  accent,
  figure,
  label,
  figureSize,
  labelSize = 30,
  labelLines = 3,
}) => (
  <Pop
    delayFrames={delayFrames}
    from="scale"
    style={{
      left,
      top,
      width,
      height,
      ...cardStyle,
      borderTop: `10px solid ${accent}`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 18,
      padding: '24px 32px',
    }}
  >
    <div style={{ ...figureText, fontSize: figureSize }}>{figure}</div>
    <div style={{ ...bodyText, fontSize: labelSize, textAlign: 'center', ...clampLines(labelLines) }}>{label}</div>
  </Pop>
)

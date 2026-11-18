import { fmt, type Fact } from '@sherpas/shared'
import type { FC } from 'react'
import { COLORS } from '../locked/tokens'
import { Pop } from './Pop'
import { bodyText, cardStyle, clampLines, figureText } from './ui'

interface FactRowProps {
  readonly fact: Fact
  readonly top: number
  readonly height: number
  readonly delayFrames: number
}

/** One row of the detailed table (`nerd`): the label, the exact figure and the rounded one. */
export const FactRow: FC<FactRowProps> = ({ fact, top, height, delayFrames }) => {
  const exact = fmt.fact(fact)
  const rounded = fmt.round(fact)
  return (
    <Pop
      delayFrames={delayFrames}
      from="left"
      style={{
        left: 70,
        top,
        width: 1360,
        height,
        ...cardStyle,
        borderLeft: `8px solid ${COLORS.brandBlue}`,
        display: 'flex',
        alignItems: 'center',
        gap: 32,
        padding: '0 34px',
      }}
    >
      <div style={{ ...bodyText, color: COLORS.ink, fontSize: 28, flex: 1, ...clampLines(2) }}>{fact.label}</div>
      {exact !== rounded ? <div style={{ ...bodyText, fontSize: 28, whiteSpace: 'nowrap' }}>{exact}</div> : null}
      <div style={{ ...figureText, fontSize: 52, minWidth: 200, textAlign: 'right' }}>{rounded}</div>
    </Pop>
  )
}

import { fmt, type Fact } from '@sherpas/shared'
import type { FC } from 'react'
import { COLORS, FONT, RADIUS } from '../locked/tokens'

const ROW_PADDING = '14px 28px'
const ROW_GAP = 12
const TABLE_GAP = 32

/** One headline figure, rounded for reading at a glance. Used at the `simple` level. */
export const BigFact: FC<{ readonly fact: Fact }> = ({ fact }) => (
  <div style={{ color: COLORS.ink, fontFamily: FONT.family }}>
    <div style={{ fontSize: FONT.sizeFigure, fontWeight: FONT.weightBold, lineHeight: 1 }}>
      {fmt.round(fact)}
    </div>
    <div style={{ fontSize: FONT.sizeBody, fontWeight: FONT.weightRegular, color: COLORS.inkSoft }}>
      {fact.label}
    </div>
  </div>
)

interface FactTableProps {
  readonly facts: readonly Fact[]
  /** `true` shows the exact figure next to the rounded one. Used at the `nerd` level. */
  readonly detailed: boolean
}

/** Figures as rows on a card: label on the left, value on the right. */
export const FactTable: FC<FactTableProps> = ({ facts, detailed }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: ROW_GAP, fontFamily: FONT.family }}>
    {facts.map((fact) => (
      <div
        key={fact.label}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: TABLE_GAP,
          padding: ROW_PADDING,
          borderRadius: RADIUS.card,
          backgroundColor: COLORS.card,
          color: COLORS.ink,
        }}
      >
        <div style={{ fontSize: FONT.sizeSmall, fontWeight: FONT.weightRegular }}>{fact.label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: ROW_GAP * 2 }}>
          {detailed && fmt.fact(fact) !== fmt.round(fact) ? (
            <div style={{ fontSize: FONT.sizeSmall, color: COLORS.inkSoft, whiteSpace: 'nowrap' }}>
              {fmt.fact(fact)}
            </div>
          ) : null}
          <div
            style={{ fontSize: FONT.sizeBody, fontWeight: FONT.weightBold, whiteSpace: 'nowrap' }}
          >
            {fmt.round(fact)}
          </div>
        </div>
      </div>
    ))}
  </div>
)

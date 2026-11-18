import type { FC } from 'react'
import { COLORS, FONT, RADIUS } from '../locked/tokens'

const PACK = { width: 300, height: 380 }
const SLOT = { height: 76, gap: 16, padding: '0 24px' }

export interface GearItem {
  readonly label: string
  /** `false` draws the slot as an empty outline: gear the family still needs. */
  readonly packed: boolean
}

interface BackpackProps {
  readonly items: readonly GearItem[]
}

/** The family's backpack. Missing gear (insurance, cash cushion…) shows as empty, dashed slots. */
export const Backpack: FC<BackpackProps> = ({ items }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 40, fontFamily: FONT.family }}>
    <svg width={PACK.width} height={PACK.height} viewBox={`0 0 ${PACK.width} ${PACK.height}`}>
      <path
        d="M 95 70 Q 150 -10 205 70"
        fill="none"
        stroke={COLORS.sageDark}
        strokeWidth={18}
        strokeLinecap="round"
      />
      <rect x={30} y={60} width={240} height={310} rx={70} fill={COLORS.sage} />
      <rect x={30} y={60} width={240} height={110} rx={55} fill={COLORS.sageDark} />
      <rect x={70} y={220} width={160} height={110} rx={28} fill={COLORS.sageDark} />
      <rect x={130} y={150} width={40} height={50} rx={10} fill={COLORS.accent} />
    </svg>
    <div style={{ display: 'flex', flexDirection: 'column', gap: SLOT.gap }}>
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            height: SLOT.height,
            padding: SLOT.padding,
            display: 'flex',
            alignItems: 'center',
            borderRadius: RADIUS.card,
            fontSize: FONT.sizeSmall,
            fontWeight: FONT.weightBold,
            color: item.packed ? COLORS.card : COLORS.ink,
            backgroundColor: item.packed ? COLORS.accent : 'transparent',
            border: `5px ${item.packed ? 'solid' : 'dashed'} ${item.packed ? COLORS.accent : COLORS.missing}`,
          }}
        >
          {item.label}
        </div>
      ))}
    </div>
  </div>
)

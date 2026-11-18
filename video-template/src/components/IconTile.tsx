import type { LucideIcon } from 'lucide-react'
import type { FC } from 'react'
import { COLORS } from '../locked/tokens'
import { ICON_STROKE } from './ui'

/** The icon fills this share of its tile. */
const ICON_SHARE = 0.54
const RADIUS_SHARE = 0.28

interface IconTileProps {
  readonly icon: LucideIcon
  readonly size?: number
  readonly background?: string
  readonly color?: string
}

/** Video 4.0's icon tile: one Lucide line icon on a soft square (DESIGN.md: one icon family, no emoji). */
export const IconTile: FC<IconTileProps> = ({ icon: Icon, size = 72, background = COLORS.blueWash, color = COLORS.brandBlue }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * RADIUS_SHARE,
      background,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}
  >
    <Icon size={size * ICON_SHARE} strokeWidth={ICON_STROKE} color={color} />
  </div>
)

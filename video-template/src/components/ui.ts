import type { CSSProperties } from 'react'
import { COLORS, FONT, RADIUS, SHADOW } from '../locked/tokens'

/** Shared styles of the presentation screen (light app world, DESIGN.md). */

export const cardStyle: CSSProperties = {
  background: COLORS.raised,
  border: `1.5px solid ${COLORS.hairline}`,
  borderRadius: RADIUS.card,
  boxShadow: SHADOW.card,
  boxSizing: 'border-box',
}

/** Poppins 600 for what the eye lands on first. */
export const titleText: CSSProperties = {
  fontFamily: FONT.display,
  fontWeight: 600,
  letterSpacing: FONT.displayTracking,
  color: COLORS.ink,
}

/** The plan's figures: Poppins 600, tight, tabular. */
export const figureText: CSSProperties = {
  fontFamily: FONT.display,
  fontWeight: 600,
  letterSpacing: FONT.figureTracking,
  lineHeight: 0.92,
  fontVariantNumeric: 'tabular-nums',
  color: COLORS.ink,
  whiteSpace: 'nowrap',
}

/** Inter for everything read second. */
export const bodyText: CSSProperties = {
  fontFamily: FONT.body,
  fontWeight: 500,
  lineHeight: 1.3,
  color: COLORS.inkSecondary,
}

/** Cuts text after `lines` lines with an ellipsis, so long labels never overflow a card. */
export const clampLines = (lines: number): CSSProperties => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
})

/** Lucide line icons are drawn at this stroke everywhere (DESIGN.md). */
export const ICON_STROKE = 1.75

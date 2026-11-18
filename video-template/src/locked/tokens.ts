/**
 * LOCKED design tokens. Scenes and components must take every colour, font and margin from here.
 * Provisional warm-dawn palette; the team's design rules will replace these values.
 */

export const VIDEO = { width: 1920, height: 1080, fps: 30 } as const

export const COLORS = {
  skyTop: '#F8C9A0',
  skyBottom: '#FFF1DC',
  sun: '#FBB56B',
  sunGlow: '#FDD9A8',
  farRange: '#E3B89A',
  mountain: '#C8704F',
  mountainShade: '#A9583C',
  snow: '#FFF8EE',
  sage: '#9CAF88',
  sageDark: '#6F8A64',
  trail: '#FFF1DC',
  ink: '#1F2A44',
  inkSoft: '#4A5673',
  card: '#FFF8EE',
  accent: '#E2603A',
  missing: '#B9A18C',
} as const

/** One colour per household member, in order. */
export const HIKER_COLORS = ['#1F2A44', '#E2603A', '#2F7F79', '#D9A441', '#7A4E8A'] as const

export const FONT = {
  family: 'Nunito, "Avenir Next", "Segoe UI", system-ui, sans-serif',
  weightRegular: 600,
  weightBold: 800,
  sizeCaption: 44,
  sizeBody: 40,
  sizeSmall: 30,
  sizeTitle: 72,
  sizeFigure: 150,
} as const

/** Nothing important is drawn closer to the frame edge than this. */
export const SAFE_MARGIN = 96

export const RADIUS = { card: 36, pill: 999 } as const

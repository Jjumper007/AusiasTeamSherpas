/**
 * LOCKED design tokens. Scenes and components take every colour, font and size from here.
 * Colours are the Sherpas design system (DESIGN.md, design/sherpas-tokens.css); the office,
 * the presenter and the camera come from the team's base video (branch `Video-Arturo`).
 */

export const VIDEO = { width: 1920, height: 1080, fps: 30 } as const

/** Sherpas palette: the light app world for the presentation screen, navy for the bezel and captions. */
export const COLORS = {
  frame: '#F8FAFD',
  raised: '#FFFFFF',
  hairline: '#E2E5EB',
  ink: '#141419',
  inkSecondary: '#5F6480',
  brandBlue: '#4565D6',
  blueWash: '#EFF5FF',
  blueLine: '#C6D2FD',
  lavender: '#948DF7',
  navy: '#161827',
  navyDeep: '#0B0F2E',
  ice: '#E0EEFF',
  blueBright: '#6586FC',
  sky: '#61A9FA',
  success: '#1DAE53',
  successWash: '#E3F6EA',
  warning: '#E38F10',
  error: '#F04545',
  errorWash: '#FDE4E4',
  stableGold: '#DBAE3A',
  white: '#FFFFFF',
} as const

/** The office illustration of the base video. Only the stage uses these. */
export const OFFICE = {
  wallTop: '#EEF2F8',
  wallBottom: '#DFE6EF',
  windowSky: 'linear-gradient(180deg, #9FC9F2 0%, #D7E8F7 60%, #F6E6D0 100%)',
  buildingA: '#7F93B5',
  buildingB: '#93A6C4',
  buildingWindow: '#DCE6F4',
  floorTop: '#C29A70',
  floorBottom: '#A87F57',
  floorLine: '#9A734C',
  skirting: '#F4F1EC',
  leafA: '#3E9B6E',
  leafB: '#2F8560',
  pot: '#E8DCCB',
} as const

/** The lavender-to-blue pill reserved for the one primary action. */
export const CTA_GRADIENT = 'linear-gradient(127deg, #948DF7 11%, #4565D6 119%)'

/** Score bands as the plan names them, with their status colour. */
export const BAND_COLORS: Readonly<Record<string, string>> = {
  critical: COLORS.error,
  vulnerable: COLORS.warning,
  stable: COLORS.stableGold,
  strong: COLORS.success,
}

export const FONT = {
  display: 'Poppins, system-ui, sans-serif',
  body: 'Inter, system-ui, sans-serif',
  displayTracking: '-0.02em',
  figureTracking: '-0.035em',
} as const

/** Radii in screen space (the presentation is drawn at 1500×900 and shown at 0.8). */
export const RADIUS = { tag: 8, control: 12, card: 20, pill: 999 } as const

export const SHADOW = {
  card: '0 12px 30px rgba(20, 20, 25, 0.10)',
  stage: '0 24px 60px rgba(22, 24, 39, 0.28)',
} as const

/** The presentation screen: drawn at SCREEN_CONTENT size, scaled into SCREEN_INNER on the office wall. */
export const SCREEN_CONTENT = { width: 1500, height: 900 } as const
export const SCREEN_BEZEL = { x: 610, y: 96, width: 1250, height: 770 } as const
export const SCREEN_INNER = { x: 635, y: 121, width: 1200, height: 720, scale: 0.8 } as const

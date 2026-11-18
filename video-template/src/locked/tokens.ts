/**
 * LOCKED design tokens. Scenes and components take every colour, font and size from here.
 * Colours are the Sherpas design system (DESIGN.md, design/sherpas-tokens.css); the office,
 * the presenter and the camera come from the team's base video (branch `Video-Arturo`, Video 4.0).
 */

export const VIDEO = { width: 1920, height: 1080, fps: 30 } as const

/** Sherpas palette: the light app world for the presentation screen, navy for the bezel and captions. */
export const COLORS = {
  frame: '#F8FAFD',
  raised: '#FFFFFF',
  hairline: '#E2E5EB',
  chipTrack: '#EFF1F5',
  ink: '#141419',
  inkSecondary: '#5F6480',
  inkTertiary: '#7F8399',
  brandBlue: '#4565D6',
  brandBluePress: '#1C45D7',
  blueWash: '#EFF5FF',
  blueLine: '#C6D2FD',
  lavender: '#948DF7',
  navy: '#161827',
  navyDeep: '#0B0F2E',
  navyGlow: '#222852',
  navySurface: '#1C2140',
  navySurfaceRaised: '#262C52',
  navyLine: '#2F365E',
  navyMuted: '#9EA6C4',
  ice: '#E0EEFF',
  blueBright: '#6586FC',
  sky: '#61A9FA',
  success: '#1DAE53',
  successWash: '#E3F6EA',
  warning: '#E38F10',
  error: '#F04545',
  errorWash: '#FDE4E4',
  stableGold: '#DBAE3A',
  gainGreen: '#3FD27A',
  lagoon: '#2EC4C6',
  white: '#FFFFFF',
} as const

/** The office illustration of the base video. Only the stage uses these. */
export const OFFICE = {
  wallTop: '#F8FAFD',
  wallBottom: '#E0E7F6',
  /** Behind the office while the camera drifts past its edges. */
  backdrop: '#DFE6EF',
  windowSky: 'linear-gradient(180deg, #9FB8F2 0%, #D6E3FA 62%, #F4EAD8 100%)',
  buildingA: '#7F93B5',
  buildingB: '#93A6C4',
  buildingWindow: '#DCE6F4',
  floorTop: '#C9A07A',
  floorBottom: '#A47A52',
  floorLine: '#8F6A44',
  skirting: '#F7F4EF',
  leafA: '#3E9B6E',
  leafB: '#2F8560',
  pot: '#E8DCCB',
  potRim: '#D8CAB4',
  sun: 'radial-gradient(circle, #FFF6D0, rgba(255,235,160,0) 70%)',
} as const

/** The navy hero world of the brand opening and closing (DESIGN.md "stage"). */
export const STAGE_BACKGROUND = 'radial-gradient(110% 90% at 18% 0%, #222852 0%, #161827 48%, #0B0F2E 100%)'

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
export const RADIUS = { tag: 8, control: 12, card: 28, pill: 999 } as const

export const SHADOW = {
  /** Video 4.0's light card: an inner top highlight and a soft offset. */
  card: '0 1px 0 #FFFFFF inset, 0 10px 30px -14px rgba(20, 24, 60, 0.18)',
  stage: '0 34px 70px rgba(20, 25, 50, 0.34), 0 0 0 2px #3A4066 inset',
} as const

/** The presentation screen: drawn at SCREEN_CONTENT size, scaled into SCREEN_INNER on the office wall. */
export const SCREEN_CONTENT = { width: 1500, height: 900 } as const
export const SCREEN_BEZEL = { x: 610, y: 96, width: 1250, height: 770 } as const
export const SCREEN_INNER = { x: 635, y: 121, width: 1200, height: 720, scale: 0.8 } as const

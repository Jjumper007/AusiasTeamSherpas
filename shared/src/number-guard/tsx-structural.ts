/**
 * What counts as structural (layout, timing, colour) inside the strings of a TSX file.
 * Everything here is skipped by the number guard; anything else in a string is a displayed figure.
 */

/**
 * A string is structural when it is the value of one of these JSX attributes, object keys or variables
 * (or sits anywhere inside their expression): CSS properties and SVG geometry, never display text.
 */
const STRUCTURAL_NAMES: ReadonlySet<string> = new Set([
  'style', 'className', 'class', 'id', 'key', 'src', 'href', 'easing', 'tabIndex',
  'd', 'points', 'viewBox', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'dx', 'dy',
  'offset', 'fill', 'stdDeviation', 'gradientTransform', 'patternTransform', 'clipPath',
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'top', 'left', 'right', 'bottom', 'inset', 'gap', 'flex', 'flexBasis', 'zIndex', 'opacity',
  'fontWeight', 'fontSize', 'fontFamily', 'lineHeight', 'letterSpacing', 'aspectRatio',
  'transform', 'transformOrigin', 'transition', 'animation', 'filter', 'backdropFilter',
  'color', 'boxShadow', 'textShadow',
])
/** Whole families of CSS properties: `marginTop`, `borderRadius`, `strokeDasharray`... */
const STRUCTURAL_NAME_PREFIX = /^(?:margin|padding|border|background|stroke|grid)/
/** Style objects: `styles`, `titleStyle`. */
const STYLE_NAME_SUFFIX = /styles?$/i
const KEBAB_BOUNDARY = /-([a-z])/g

const toCamelCase = (name: string): string =>
  name.replace(KEBAB_BOUNDARY, (_match, letter: string) => letter.toUpperCase())

export const isStructuralName = (name: string | null): boolean => {
  if (name === null) return false
  const camel = toCamelCase(name)
  return (
    STRUCTURAL_NAMES.has(camel) ||
    STRUCTURAL_NAME_PREFIX.test(camel) ||
    STYLE_NAME_SUFFIX.test(camel)
  )
}

/** CSS lengths, times and angles: "480px", "1.5rem", "300ms". */
const CSS_UNIT_PATTERN = /(?<![\w.])\d+(?:\.\d+)?(?:px|rem|em|ms|s|deg|vh|vw|fr|pt)\b/g
/** Resolutions: "1920x1080". */
const RESOLUTION_PATTERN = /\b\d+\s?[x×]\s?\d+\b/g
/** CSS functions with their arguments, up to the closing parenthesis or the end of the chunk. */
const CSS_FUNCTION_PATTERN =
  /\b(?:rgba?|hsla?|translate(?:[XYZ]|3d)?|scale[XYZ]?|rotate[XYZ]?|skew[XY]?|matrix(?:3d)?|cubic-bezier|calc|blur|url|(?:linear|radial|conic)-gradient)\([^)]*\)?/g

/** Patterns blanked out inside TSX strings before looking for figures. */
export const TSX_STRING_MASKS: readonly RegExp[] = [
  CSS_FUNCTION_PATTERN,
  RESOLUTION_PATTERN,
  CSS_UNIT_PATTERN,
]

/** SVG path data: "M 0 900 L 480 420 Z". */
const SVG_PATH_PATTERN = /^\s*[Mm]\s*-?[\d.]/
/** Relative or absolute paths and URLs. */
const PATH_PREFIX_PATTERN = /^(?:\.{0,2}\/|https?:)/
/** Asset names: "audio/scene-001.mp3". */
const FILE_EXTENSION_PATTERN = /\.[A-Za-z][A-Za-z0-9]{1,4}$/
const WHITESPACE_PATTERN = /\s/

const isPathLike = (text: string): boolean =>
  !WHITESPACE_PATTERN.test(text) &&
  (PATH_PREFIX_PATTERN.test(text) || FILE_EXTENSION_PATTERN.test(text))

/** Whether a whole string is structural because of its shape: SVG path data or a file path. */
export const isStructuralString = (text: string): boolean =>
  SVG_PATH_PATTERN.test(text) || isPathLike(text)

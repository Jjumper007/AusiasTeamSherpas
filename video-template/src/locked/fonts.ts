import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import { useEffect, useState } from 'react'
import { cancelRender, continueRender, delayRender } from 'remotion'

/**
 * LOCKED. The Sherpas faces (Poppins for titles and figures, Inter for the rest), bundled with the
 * template so renders never depend on the network. Rendering waits until every face is loaded.
 */

const WEIGHTS: ReadonlyArray<readonly [family: string, weights: readonly number[]]> = [
  ['Poppins', [500, 600]],
  ['Inter', [400, 500, 600]],
]
/** CSS `font` shorthands (weight, size, family) for `document.fonts.load`. */
const FACES = WEIGHTS.flatMap(([family, weights]) => weights.map((weight) => `${weight} 40px ${family}`))

export const useBrandFonts = (): void => {
  const [handle] = useState(() => delayRender('Loading the Sherpas fonts'))
  useEffect(() => {
    Promise.all(FACES.map((face) => document.fonts.load(face)))
      .then(() => continueRender(handle))
      .catch((error: unknown) => cancelRender(error))
  }, [handle])
}

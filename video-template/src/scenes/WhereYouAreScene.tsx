import type { FC } from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Heading } from '../components/Heading'
import { PillarRow } from '../components/PillarRow'
import { Pop } from '../components/Pop'
import { bodyText, cardStyle, figureText } from '../components/ui'
import { BAND_COLORS, COLORS, RADIUS } from '../locked/tokens'
import { spreadReveals } from './content'
import { tween, useSeconds } from './motion'
import { pillarScores } from './scene-facts'
import type { SceneProps } from './types'

const SCORE_PREFIX = 'SCORE'
const ROW = { left: 590, top: 200, width: 840, step: 118 } as const
const PILLAR_REVEAL_SHARES = [0.15, 0.6] as const

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

/**
 * Part 2, where you are: the score as a count-up card with its band, and the five areas behind it.
 * Areas whose points the script declares show a bar; the others show only their name.
 */
export const WhereYouAreScene: FC<SceneProps> = ({ brief, facts, scene, chapter, durationInFrames }) => {
  const frame = useCurrentFrame()
  const seconds = useSeconds()
  const scoreName = scene.factsUsed.find((name) => name.startsWith(SCORE_PREFIX) && facts[name]?.unit === 'points')
  const score = scoreName ? facts[scoreName] : undefined
  const declared = pillarScores(scene, facts)
  const reveals = spreadReveals(brief.score.pillars.length, durationInFrames, ...PILLAR_REVEAL_SHARES)
  const countFrom = seconds(0.8)
  const shownScore = score ? Math.round(tween(frame, countFrom, countFrom + seconds(1.2), 0, score.value)) : null
  const band = brief.score.band

  return (
    <AbsoluteFill>
      <Heading title={chapter.title} />
      <Pop
        delayFrames={seconds(0.6)}
        from="scale"
        style={{
          left: 70,
          top: 200,
          width: 470,
          height: 560,
          ...cardStyle,
          borderTop: `10px solid ${COLORS.brandBlue}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
        }}
      >
        {shownScore !== null ? (
          <>
            <div style={{ ...figureText, fontSize: 190 }}>{shownScore}</div>
            <div style={{ ...bodyText, fontSize: 32 }}>out of 100</div>
          </>
        ) : null}
        <div
          style={{
            ...bodyText,
            fontSize: 32,
            fontWeight: 600,
            padding: '8px 26px',
            borderRadius: RADIUS.tag,
            background: BAND_COLORS[band.toLowerCase()] ?? COLORS.hairline,
            color: COLORS.navyDeep,
          }}
        >
          {capitalize(band)}
        </div>
      </Pop>
      {brief.score.pillars.map((pillar, index) => (
        <PillarRow
          key={pillar.name}
          name={pillar.name}
          score={declared.find((item) => item.name === pillar.name)}
          left={ROW.left}
          top={ROW.top + index * ROW.step}
          width={ROW.width}
          delayFrames={reveals[index]}
        />
      ))}
    </AbsoluteFill>
  )
}

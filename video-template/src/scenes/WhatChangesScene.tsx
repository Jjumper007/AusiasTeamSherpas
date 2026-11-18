import { ArrowRight, Flag } from 'lucide-react'
import type { FC } from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { CtaButton } from '../components/CtaButton'
import { Heading } from '../components/Heading'
import { CTA_ICON } from '../components/icons'
import { Pop } from '../components/Pop'
import { StatCard } from '../components/StatCard'
import { bodyText, cardStyle, clampLines, ICON_STROKE, titleText } from '../components/ui'
import { COLORS, SCREEN_CONTENT } from '../locked/tokens'
import { ctaButtonLabel, partnerOf } from './content'
import { tween, useSeconds } from './motion'
import { pointsFacts } from './scene-facts'
import type { SceneProps } from './types'

const BUTTON_LEFT = 410
/** The button appears, and the cursor clicks it, at these shares of the scene. */
const BUTTON_APPEAR_SHARE = 0.4
const CLICK_SHARE = 0.72

/**
 * Part 5, what changes: the score today and after the first step (counting up), then the base
 * video's closing button, which is the same action as the card under the video.
 */
export const WhatChangesScene: FC<SceneProps> = ({ brief, facts, scene, chapter, cta, durationInFrames }) => {
  const frame = useCurrentFrame()
  const seconds = useSeconds()
  const [before, after] = pointsFacts(scene, facts)
  const [firstMove] = brief.topMoves
  const climbFrom = seconds(1.6)
  const climbed = before && after ? Math.round(tween(frame, climbFrom, climbFrom + seconds(1.4), before.value, after.value)) : 0
  const ButtonIcon = CTA_ICON[cta.type]

  return (
    <AbsoluteFill>
      <Heading title={chapter.title} />
      {before && after ? (
        <>
          <StatCard left={70} top={190} width={380} height={260} delayFrames={seconds(0.5)} accent={COLORS.blueLine} figure={String(before.value)} label="Today" figureSize={120} />
          <Pop delayFrames={seconds(1.1)} from="left" style={{ left: 478, top: 285 }}>
            <ArrowRight size={70} color={COLORS.brandBlue} strokeWidth={ICON_STROKE} />
          </Pop>
          <StatCard left={570} top={190} width={380} height={260} delayFrames={seconds(1.2)} accent={COLORS.success} figure={String(climbed)} label="After your first step" figureSize={120} />
        </>
      ) : (
        <Pop delayFrames={seconds(0.5)} from="up" style={{ left: 70, top: 190, width: 880, height: 260, ...cardStyle, padding: '30px 40px' }}>
          <div style={{ ...bodyText, color: COLORS.ink, fontSize: 32, ...clampLines(5) }}>{chapter.body}</div>
        </Pop>
      )}
      <Pop
        delayFrames={seconds(1.8)}
        from="right"
        style={{ left: 1000, top: 190, width: 430, height: 260, ...cardStyle, padding: '30px 34px', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <Flag size={48} color={COLORS.brandBlue} strokeWidth={ICON_STROKE} />
        <div style={{ ...bodyText, fontSize: 26 }}>Your first step</div>
        <div style={{ ...titleText, fontSize: 36, lineHeight: 1.15, ...clampLines(2) }}>{firstMove.title}</div>
      </Pop>
      <Pop delayFrames={Math.round(durationInFrames * BUTTON_APPEAR_SHARE) - seconds(0.3)} from="up" style={{ left: 70, width: 1360, top: 490, textAlign: 'center' }}>
        <div style={{ ...bodyText, fontSize: 32, color: COLORS.ink, ...clampLines(2) }}>{cta.text}</div>
      </Pop>
      <CtaButton
        label={ctaButtonLabel(cta.type, partnerOf(brief))}
        icon={ButtonIcon}
        left={BUTTON_LEFT}
        top={600}
        appearAtFrame={Math.round(durationInFrames * BUTTON_APPEAR_SHARE)}
        clickAtFrame={Math.round(durationInFrames * CLICK_SHARE)}
      />
      <div
        style={{
          position: 'absolute',
          left: 70,
          top: 820,
          width: SCREEN_CONTENT.width - 140,
          textAlign: 'center',
          ...bodyText,
          fontSize: 20,
          opacity: tween(frame, seconds(2), seconds(3), 0, 1),
        }}
      >
        Every figure comes from your Sherpas plan. Projections are hypothetical, not individual investment advice.
      </div>
    </AbsoluteFill>
  )
}

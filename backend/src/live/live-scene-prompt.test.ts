import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fmt, PARTS, videoPropsFixture, type Part } from '@sherpas/shared'
import { describe, expect, it } from 'vitest'
import { PROMPTS_DIR } from '../paths'
import { promptVersion } from '../script/prompt-template'
import { fillLiveScenePrompt, loadLiveSceneSources, type LiveSceneRequest } from './live-scene-prompt'

const template = readFileSync(join(PROMPTS_DIR, 'live-scene.md'), 'utf8')
const sources = loadLiveSceneSources()

const requestFor = (part: Part): LiveSceneRequest => {
  const index = PARTS.indexOf(part)
  return {
    part,
    brief: videoPropsFixture.brief,
    facts: videoPropsFixture.facts,
    scene: videoPropsFixture.script.scenes[index],
    chapter: videoPropsFixture.script.chapters[index],
    cta: videoPropsFixture.script.cta,
    durationSec: 23.46,
  }
}

describe('fillLiveScenePrompt', () => {
  it('fills every placeholder of prompts/live-scene.md, version 2', () => {
    // Act
    const prompt = fillLiveScenePrompt(template, requestFor('what_matters'), sources)

    // Assert
    expect(promptVersion(template)).toBe('2')
    expect(prompt).not.toMatch(/\{\{[A-Z_]+\}\}/)
  })

  it('forbids writing a property twice in one object literal, the TS1117 that failed first_step', () => {
    // Act
    const prompt = fillLiveScenePrompt(template, requestFor('first_step'), sources)

    // Assert
    expect(prompt).toContain('same property twice in one object literal')
    expect(prompt).toContain('write that property once, after the spread')
  })

  it("carries the part's current scene file, narration, visual idea, chapter and CTA", () => {
    // Arrange
    const request = requestFor('first_step')

    // Act
    const prompt = fillLiveScenePrompt(template, request, sources)

    // Assert
    expect(prompt).toContain('part 4 of 5, `first_step`')
    expect(prompt).toContain('`src/scenes/FirstStepScene.tsx`')
    expect(prompt).toContain('export const FirstStepScene: FC<SceneProps>')
    expect(prompt).toContain(sources.scenes.first_step.trimEnd())
    expect(prompt).toContain(request.scene.narration)
    expect(prompt).toContain(request.scene.visualIdea)
    expect(prompt).toContain(request.chapter.title)
    expect(prompt).toContain(request.cta.text)
    expect(prompt).toContain('about 23.5 s (about 704 frames)')
  })

  it("leaves out the other parts' scene files", () => {
    // Act
    const prompt = fillLiveScenePrompt(template, requestFor('what_matters'), sources)

    // Assert
    expect(prompt).toContain(sources.scenes.what_matters.trimEnd())
    expect(prompt).not.toContain(sources.scenes.first_step.trimEnd())
    expect(prompt).not.toContain(sources.scenes.what_changes.trimEnd())
  })

  it('lists each declared fact with its value and what fmt prints for it', () => {
    // Arrange
    const request = requestFor('what_matters')

    // Act
    const prompt = fillLiveScenePrompt(template, request, sources)

    // Assert
    expect(request.scene.factsUsed.length).toBeGreaterThan(0)
    request.scene.factsUsed.forEach((name) => {
      const fact = videoPropsFixture.facts[name]
      expect(prompt).toContain(`| ${name} | ${fact.value} | ${fact.unit} |`)
      expect(prompt).toContain(`| ${fmt.round(fact)} | ${fmt.fact(fact)} |`)
    })
  })

  it('carries the editable helpers, every component, the tokens, ImpactRing and the prop schemas, with their import paths', () => {
    // Act
    const prompt = fillLiveScenePrompt(template, requestFor('what_changes'), sources)

    // Assert
    expect(prompt).toContain("### `src/scenes/motion.ts` (import from `'./motion'`)")
    expect(prompt).toContain("### `src/components/Pop.tsx` (import from `'../components/Pop'`)")
    expect(prompt).toContain("### `src/locked/stage/ImpactRing.tsx` (import from `'../locked/stage/ImpactRing'`)")
    expect(prompt).toContain('export const SCREEN_CONTENT')
    expect(prompt).toContain('### `@sherpas/shared: brief.ts`')
    sources.modules.forEach((file) => expect(prompt).toContain(file.text.trimEnd()))
    expect(prompt).toContain('`lucide-react` (line icons)')
    expect(prompt).not.toContain('`react/jsx-runtime`')
  })

  it('throws on an unknown placeholder', () => {
    // Act
    const fill = () => fillLiveScenePrompt('{{NOPE}}', requestFor('what_matters'), sources)

    // Assert
    expect(fill).toThrow('prompts/live-scene.md has an unknown placeholder {{NOPE}}')
  })
})

import type { Part, VideoProps } from '@sherpas/shared'
import { fillPlaceholders } from '../script/prompt-template'

/**
 * Fills `prompts/scenes.md` for one run (SPEC §5.4). Pure: the same props and target parts always
 * give the same prompt.
 */

const JSON_INDENT = 2
const TENTHS = 10

/** The editable file that draws each part on the screen, relative to the sandbox. */
export const SCENE_FILE: Readonly<Record<Part, string>> = {
  hook: 'src/scenes/HookScene.tsx',
  where_you_are: 'src/scenes/WhereYouAreScene.tsx',
  what_matters: 'src/scenes/WhatMattersScene.tsx',
  first_step: 'src/scenes/FirstStepScene.tsx',
  what_changes: 'src/scenes/WhatChangesScene.tsx',
}

/** Pipes and line breaks would break the Markdown table. */
const cell = (text: string): string => text.replace(/\|/g, '/').replace(/\s+/g, ' ')

const sceneIndexes = (props: VideoProps, parts: readonly Part[]): number[] =>
  props.script.scenes.flatMap((scene, index) => (parts.includes(scene.part) ? [index] : []))

const scenesSection = (props: VideoProps, parts: readonly Part[]): string =>
  sceneIndexes(props, parts)
    .map((index) => {
      const scene = props.script.scenes[index]
      const seconds = Math.round(props.scenes[index].durationSec * TENTHS) / TENTHS
      return [
        `### Part ${index + 1}, \`${scene.part}\` (\`${SCENE_FILE[scene.part]}\`, ${seconds} s)`,
        '',
        `- Chapter title (shown by \`<Heading>\`): ${props.script.chapters[index].title}`,
        `- Narration: ${scene.narration}`,
        `- Visual idea: ${scene.visualIdea}`,
        `- factsUsed: ${scene.factsUsed.join(', ') || '(none: show words, not figures)'}`,
      ].join('\n')
    })
    .join('\n\n')

/** The facts the target scenes declare, once each, in order of appearance. */
const factsRows = (props: VideoProps, parts: readonly Part[]): string => {
  const names = [...new Set(sceneIndexes(props, parts).flatMap((index) => props.script.scenes[index].factsUsed))]
  const rows = names
    .filter((name) => name in props.facts)
    .map((name) => {
      const fact = props.facts[name]
      return `| ${name} | ${fact.value} | ${fact.unit} | ${cell(fact.label)} |`
    })
  return rows.length > 0 ? rows.join('\n') : '| (none) | | | |'
}

export const fillScenesPrompt = (template: string, props: VideoProps, parts: readonly Part[]): string =>
  fillPlaceholders(
    template,
    {
      TARGET_FILES: parts.map((part) => `\`${SCENE_FILE[part]}\``).join(', '),
      SURVEY: JSON.stringify(props.brief.survey, null, JSON_INDENT),
      SCENES: scenesSection(props, parts),
      FACTS: factsRows(props, parts),
    },
    'prompts/scenes.md',
  )

/** The prompt for a retry: the files keep the previous attempt's changes, so Claude fixes them in place. */
export const scenesRetryPrompt = (prompt: string, problems: readonly string[]): string =>
  [
    prompt,
    '## Your previous attempt was rejected',
    'The files still contain your previous changes (locked files have been restored). Fix these problems, run `npx tsc -p tsconfig.json` once, and stop:',
    ...problems.map((problem) => `- ${problem}`),
  ].join('\n\n')

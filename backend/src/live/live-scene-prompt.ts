/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fmt, PARTS, type Brief, type Chapter, type Cta, type Fact, type Facts, type Part, type Scene } from '@sherpas/shared'
import { ROOT_DIR, VIDEO_TEMPLATE_DIR } from '../paths'
import { FPS } from '../pipeline/video-timeline'
import { fillPlaceholders } from '../script/prompt-template'
import { HOST_PACKAGES, sceneComponentName, sceneFileOf } from './scene-module-contract'

/**
 * Fills `prompts/live-scene.md` for one part of a Live run (#15): one call without tools, so the prompt
 * carries everything the scene may use, read from the real files on every run so it never drifts: the
 * part's current scene, the template modules it may import, the locked tokens and `ImpactRing`, and the
 * shapes of its props. Filling is pure; only `loadLiveSceneSources` reads files.
 */

export const LIVE_SCENE_PROMPT_NAME = 'prompts/live-scene.md'

/** What one part's prompt is about. */
export interface LiveSceneRequest {
  readonly part: Part
  readonly brief: Brief
  readonly facts: Facts
  readonly scene: Scene
  readonly chapter: Chapter
  readonly cta: Cta
  /** The part's length as known when the call starts; the scene paces by its `durationInFrames` prop. */
  readonly durationSec: number
}

export interface SourceFile {
  /** As the prompt names it: "src/components/Pop.tsx" or "@sherpas/shared: brief.ts". */
  readonly title: string
  /** How the scene imports it, for template modules: "../components/Pop". */
  readonly importPath?: string
  readonly text: string
}

export interface LiveSceneSources {
  /** Template modules a scene may import, in the order the prompt shows them. */
  readonly modules: readonly SourceFile[]
  /** The zod schemas of the props. */
  readonly types: readonly SourceFile[]
  /** Each part's scene file as it is now: the Standard scene. */
  readonly scenes: Readonly<Record<Part, string>>
}

/** The scene helpers a part may import (the rest of `src/scenes/` draws other parts or the stage). */
const SCENE_HELPERS = ['scenes/types.ts', 'scenes/motion.ts', 'scenes/content.ts', 'scenes/scene-facts.ts'] as const
const LOCKED_MODULES = ['locked/tokens.ts', 'locked/stage/ImpactRing.tsx'] as const
const COMPONENTS_DIR = 'components'
const SHARED_TYPES = ['facts.ts', 'survey.ts', 'brief.ts', 'script.ts'] as const
const SHARED_SRC_DIR = join(ROOT_DIR, 'shared', 'src')
const SOURCE_FILE = /\.tsx?$/
const TEST_FILE = /\.test\.tsx?$/
const SOURCE_EXTENSION = /\.tsx?$/
const JSON_INDENT = 2
const TENTHS = 10
/** `react/jsx-runtime` is what compiled JSX imports; a scene never imports it by hand. */
const IMPLICIT_PACKAGES: readonly string[] = ['react/jsx-runtime']
const PACKAGE_USE: Readonly<Record<string, string>> = {
  react: 'types such as `FC` and `CSSProperties`, hooks',
  remotion: '`AbsoluteFill`, `useCurrentFrame`, `useVideoConfig`, `interpolate`, `spring`, `Easing`…',
  '@sherpas/shared': '`fmt` and the types of the props',
  'lucide-react': 'line icons',
}

/** "scenes/motion.ts" → "./motion"; "components/Pop.tsx" → "../components/Pop": as `src/scenes/` imports it. */
const importPathOf = (pathInSrc: string): string => {
  const bare = pathInSrc.replace(SOURCE_EXTENSION, '')
  return bare.startsWith('scenes/') ? `./${bare.slice('scenes/'.length)}` : `../${bare}`
}

const moduleFile = (srcDir: string, pathInSrc: string): SourceFile => ({
  title: `src/${pathInSrc}`,
  importPath: importPathOf(pathInSrc),
  text: readFileSync(join(srcDir, pathInSrc), 'utf8'),
})

const componentPaths = (srcDir: string): string[] =>
  readdirSync(join(srcDir, COMPONENTS_DIR))
    .filter((name) => SOURCE_FILE.test(name) && !TEST_FILE.test(name))
    .sort()
    .map((name) => `${COMPONENTS_DIR}/${name}`)

/** Reads the sources the prompt carries, from the template (or a copy of it) and `shared/`. */
export const loadLiveSceneSources = (templateDir = VIDEO_TEMPLATE_DIR, sharedSrcDir = SHARED_SRC_DIR): LiveSceneSources => {
  const srcDir = join(templateDir, 'src')
  const paths = [...SCENE_HELPERS, ...componentPaths(srcDir), ...LOCKED_MODULES]
  return {
    modules: paths.map((path) => moduleFile(srcDir, path)),
    types: SHARED_TYPES.map((name) => ({ title: `@sherpas/shared: ${name}`, text: readFileSync(join(sharedSrcDir, name), 'utf8') })),
    scenes: Object.fromEntries(PARTS.map((part) => [part, readFileSync(join(srcDir, sceneFileOf(part)), 'utf8')])) as Record<Part, string>,
  }
}

/** Pipes and line breaks would break the Markdown table. */
const cell = (text: string): string => text.replace(/\|/g, '/').replace(/\s+/g, ' ')

/** What `fmt` prints for a fact, or the reason it cannot (a value that is not finite). */
const printed = (format: (fact: Fact) => string, fact: Fact): string => {
  try {
    return format(fact)
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

const factsRows = ({ scene, facts }: LiveSceneRequest): string => {
  const rows = scene.factsUsed
    .filter((name) => name in facts)
    .map((name) => {
      const fact = facts[name]
      return `| ${name} | ${fact.value} | ${fact.unit} | ${cell(fact.label)} | ${printed(fmt.round, fact)} | ${printed(fmt.fact, fact)} |`
    })
  return rows.length > 0 ? rows.join('\n') : '| (none: show words, not figures) | | | | | |'
}

/** The parts of the brief that shape a layout, without its figures (they come from facts). */
const briefAtAGlance = (brief: Brief): string =>
  [
    `- \`member.firstName\`: ${brief.member.firstName}`,
    `- \`household\`: ${brief.household.map((person) => `${person.firstName} (${person.role})`).join(', ')}`,
    `- \`topMoves\` (${brief.topMoves.length}, the first is the first step): ${brief.topMoves.map((move) => `"${move.title}" (effort ${move.effort})`).join(', ')}`,
    `- \`score.band\`: ${brief.score.band}; \`score.pillars\`: ${brief.score.pillars.map((pillar) => pillar.name).join(', ')}`,
    `- \`goals\`: ${brief.goals.map((goal) => goal.type).join(', ') || '(none)'}`,
  ].join('\n')

const fenceOf = (title: string): string => (title.endsWith('.tsx') ? 'tsx' : 'ts')

const sourceSection = (file: SourceFile): string =>
  [
    `### \`${file.title}\`${file.importPath ? ` (import from \`'${file.importPath}'\`)` : ''}`,
    '',
    `\`\`\`${fenceOf(file.title)}`,
    file.text.trimEnd(),
    '```',
  ].join('\n')

const importsLine = (): string => {
  const packages = HOST_PACKAGES.filter((name) => !IMPLICIT_PACKAGES.includes(name)).map(
    (name) => `\`${name}\` (${PACKAGE_USE[name] ?? 'as shown'})`,
  )
  return `${packages.join(', ')}, and the template modules shown below, by the relative path given with each`
}

const secondsOf = (durationSec: number): number => Math.round(durationSec * TENTHS) / TENTHS

export const fillLiveScenePrompt = (template: string, request: LiveSceneRequest, sources: LiveSceneSources): string =>
  fillPlaceholders(
    template,
    {
      PART_NUMBER: String(PARTS.indexOf(request.part) + 1),
      PART: request.part,
      SCENE_FILE: `src/${sceneFileOf(request.part)}`,
      COMPONENT: sceneComponentName(request.part),
      SECONDS: String(secondsOf(request.durationSec)),
      FRAMES: String(Math.round(request.durationSec * FPS)),
      IMPORTS: importsLine(),
      SURVEY: JSON.stringify(request.brief.survey, null, JSON_INDENT),
      BRIEF: briefAtAGlance(request.brief),
      NARRATION: request.scene.narration,
      VISUAL_IDEA: request.scene.visualIdea,
      CHAPTER_TITLE: request.chapter.title,
      CHAPTER_BODY: request.chapter.body,
      CTA: `type \`${request.cta.type}\`, text "${request.cta.text}"`,
      FACTS: factsRows(request),
      CURRENT_FILE: sources.scenes[request.part].trimEnd(),
      HELPERS: sources.modules.map(sourceSection).join('\n\n'),
      TYPES: sources.types.map(sourceSection).join('\n\n'),
    },
    LIVE_SCENE_PROMPT_NAME,
  )

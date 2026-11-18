/** Helpers shared by the versioned prompts in `prompts/` (script.md, scenes.md). */

const PLACEHOLDER = /\{\{([A-Z_]+)\}\}/g

/**
 * Replaces every `{{NAME}}` in a prompt template. Throws on a placeholder it does not know, so a
 * typo never reaches Claude.
 */
export const fillPlaceholders = (
  template: string,
  values: Readonly<Record<string, string>>,
  promptFile: string,
): string =>
  template.replace(PLACEHOLDER, (match, name: string) => {
    const value = values[name]
    if (value === undefined) throw new Error(`${promptFile} has an unknown placeholder ${match}`)
    return value
  })

/** The first line of a template names its version, e.g. "prompt: script · version: 1". */
export const promptVersion = (template: string): string =>
  /version:\s*([\w.-]+)/.exec(template.split('\n', 1)[0])?.[1] ?? 'unknown'

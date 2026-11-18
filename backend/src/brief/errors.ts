/** A problem with the inputs (case, member, survey) or with the case files, worded for the person running the command. */
export class BriefError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'BriefError'
  }
}

interface IssueLike {
  readonly path: ReadonlyArray<PropertyKey>
  readonly message: string
}

/** One line per schema issue, e.g. `decisionStyle: Invalid option`. */
export const describeIssues = (issues: ReadonlyArray<IssueLike>): string =>
  issues.map((issue) => `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`).join('; ')

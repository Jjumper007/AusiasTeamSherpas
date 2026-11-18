import type { FactUnit } from '../facts'

/** The fact a rejected number most likely meant, with the spellings the guard would accept. */
export interface NearestFact {
  readonly name: string
  readonly value: number
  readonly unit: FactUnit
  /** What `fmt` prints for this fact, e.g. `["$1.4M", "$1,427,456"]`. */
  readonly acceptedForms: readonly string[]
}

/** One number that does not come from facts. `message` is ready to be sent back to Claude. */
export interface NumberGuardError {
  /** The number as written, e.g. `"$1.5M"`. */
  readonly number: string
  /** Its numeric value with the scale applied, e.g. `1500000`. */
  readonly value: number
  /** 1-based position in the text or source that was validated. */
  readonly line: number
  readonly column: number
  /** The surrounding line, trimmed. */
  readonly snippet: string
  /** `null` only when there are no facts at all. */
  readonly nearestFact: NearestFact | null
  readonly message: string
}

export interface NumberGuardResult {
  readonly ok: boolean
  readonly errors: readonly NumberGuardError[]
}

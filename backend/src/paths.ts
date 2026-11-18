/// <reference types="node" />
import { fileURLToPath } from 'node:url'

/** Repository root, resolved from this file so the server can start from any working directory. */
export const ROOT_DIR = fileURLToPath(new URL('../../', import.meta.url))
/** Outputs of every job: runs/<caseId>/<member>/<timestamp>/ (git-ignored). */
export const RUNS_DIR = fileURLToPath(new URL('../../runs/', import.meta.url))
/** The Remotion project that renders the fallback video. */
export const VIDEO_TEMPLATE_DIR = fileURLToPath(new URL('../../video-template/', import.meta.url))
/** Versioned prompts for `claude -p` (SPEC §5): script.md, later scenes.md and visual-review.md. */
export const PROMPTS_DIR = fileURLToPath(new URL('../../prompts/', import.meta.url))
/** Narration audio shared by every run, keyed by a hash of the text and voice (git-ignored, not served). */
export const SPEECH_CACHE_DIR = fileURLToPath(new URL('../../runs/.speech-cache/', import.meta.url))
/** Local settings and secrets (LLM proxy key, brand voice), never committed. */
export const ENV_FILE = fileURLToPath(new URL('../../.env', import.meta.url))

/// <reference types="node" />
import { fileURLToPath } from 'node:url'

/** Repository root, resolved from this file so the server can start from any working directory. */
export const ROOT_DIR = fileURLToPath(new URL('../../', import.meta.url))
/** Outputs of every job: runs/<caseId>/<member>/<timestamp>/ (git-ignored). */
export const RUNS_DIR = fileURLToPath(new URL('../../runs/', import.meta.url))
/** The Remotion project that renders the fallback video. */
export const VIDEO_TEMPLATE_DIR = fileURLToPath(new URL('../../video-template/', import.meta.url))

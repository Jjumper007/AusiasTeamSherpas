/// <reference types="node" />
import { existsSync } from 'node:fs'
import { ENV_FILE } from './paths'

/**
 * Loads `.env` from the repository root into `process.env`, whatever the working directory.
 * Variables already set in the shell win, so `LLM_PROXY_KEY= npm start` really runs without a key.
 */
export const loadEnvFile = (): void => {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE)
}

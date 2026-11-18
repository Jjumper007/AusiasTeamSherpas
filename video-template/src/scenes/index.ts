import type { Part } from '@sherpas/shared'
import type { FC } from 'react'
import { FirstStepScene } from './FirstStepScene'
import { HookScene } from './HookScene'
import type { SceneProps } from './types'
import { WhatChangesScene } from './WhatChangesScene'
import { WhatMattersScene } from './WhatMattersScene'
import { WhereYouAreScene } from './WhereYouAreScene'

/** Which component draws each part of the arc. The order of the arc itself lives in the script, not here. */
export const SCENES: Readonly<Record<Part, FC<SceneProps>>> = {
  hook: HookScene,
  where_you_are: WhereYouAreScene,
  what_matters: WhatMattersScene,
  first_step: FirstStepScene,
  what_changes: WhatChangesScene,
}

export type { SceneProps } from './types'

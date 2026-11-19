// What the locked `video-template/src/locked/stage/Screen.tsx` gets for `import { SCENES } from "../../scenes"`
// in the live web (vite.config.ts redirects that one import here). Same shape as the template's SCENES,
// but every part is a slot that reads the scene registry, so a part can be swapped while the video plays.
// The MP4 render (webpack, `@remotion/bundler`) never sees this file.
import type { FC } from "react";
import type { Part } from "@sherpas/shared";
import type { SceneProps } from "../../../../video-template/src/scenes";
import { sceneSlot } from "./scene-registry";

export const SCENES: Readonly<Record<Part, FC<SceneProps>>> = {
  hook: sceneSlot("hook"),
  where_you_are: sceneSlot("where_you_are"),
  what_matters: sceneSlot("what_matters"),
  first_step: sceneSlot("first_step"),
  what_changes: sceneSlot("what_changes"),
};

export type { SceneProps };

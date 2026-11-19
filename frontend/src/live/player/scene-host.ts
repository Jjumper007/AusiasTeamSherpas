// The page's side of the compiled scene contract (backend/src/live/scene-module-contract.ts): the page
// hands its own React, Remotion, shared, lucide and template modules to scene modules through one global,
// so a scene compiled on the server shares hooks and contexts (useCurrentFrame) with the Player.
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as lucide from "lucide-react";
import * as remotion from "remotion";
import * as shared from "@sherpas/shared";
import type { FC } from "react";
import { LIVE_HOST_KEY, templateKey, type HostPackage } from "@sherpas/backend/src/live/scene-module-contract";
import type { SceneProps } from "../../../../video-template/src/scenes";

const TEMPLATE_SRC = "/video-template/src/";

/** The template's modules, the same instances the Player renders (the bare `src/index.ts` registers a root: left out). */
const TEMPLATE_MODULES: Record<string, unknown> = import.meta.glob(
  ["../../../../video-template/src/{components,locked,scenes}/**/*.{ts,tsx}", "!**/*.test.ts"],
  { eager: true },
);

const PACKAGES: Readonly<Record<HostPackage, unknown>> = {
  react: React,
  "react/jsx-runtime": jsxRuntime,
  remotion,
  "@sherpas/shared": shared,
  "lucide-react": lucide,
};

const templateEntries = Object.entries(TEMPLATE_MODULES).map(
  ([path, module]) => [templateKey(path.slice(path.indexOf(TEMPLATE_SRC) + TEMPLATE_SRC.length)), module] as const,
);

/** Every module a compiled scene may read, by its host key. */
export const HOST_MODULES: Readonly<Record<string, unknown>> = Object.freeze({ ...PACKAGES, ...Object.fromEntries(templateEntries) });

const installHost = (): void => {
  (globalThis as Record<string, unknown>)[LIVE_HOST_KEY] = HOST_MODULES;
};

/**
 * Loads a compiled scene module and returns its component. Rejects when the module cannot be fetched,
 * throws while loading (e.g. it reads a module the page does not provide) or has no component.
 */
export const loadSceneModule = async (url: string): Promise<FC<SceneProps>> => {
  installHost();
  const module = (await import(/* @vite-ignore */ url)) as { readonly default?: unknown };
  if (typeof module.default !== "function") throw new Error(`${url} has no scene component as its default export`);
  return module.default as FC<SceneProps>;
};

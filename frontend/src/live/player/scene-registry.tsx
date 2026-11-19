// Which component draws each part on the Live run's player, and the stable "slot" components the locked
// Screen renders instead of the template's own SCENES (see screen-scenes.ts and vite.config.ts).
// A swap replaces one entry of the registry; only that part's slot re-renders, so the Player, the
// camera and the audio keep running.
import { Component, createContext, useContext, type ErrorInfo, type FC, type ReactNode } from "react";
import { PARTS, type Chapter, type Cta, type Part } from "@sherpas/shared";
import { SCENES as TEMPLATE_SCENES, type SceneProps } from "../../../../video-template/src/scenes";

export type SceneSource = "standard" | "claude";

export interface SceneEntry {
  readonly component: FC<SceneProps>;
  readonly source: SceneSource;
  /** Unique per version of a part ("standard", or the module URL): a new id mounts a fresh scene. */
  readonly id: string;
}

export type SceneRegistry = Readonly<Record<Part, SceneEntry>>;

const STANDARD_ID = "standard";

/** Every part on its Standard scene: the template's own components. */
export const STANDARD_SCENES: SceneRegistry = Object.freeze(
  Object.fromEntries(PARTS.map((part) => [part, { component: TEMPLATE_SCENES[part], source: "standard", id: STANDARD_ID }])) as Record<Part, SceneEntry>,
);

/** A new registry with `part` drawn by `entry`; the others are the same objects. */
export const withScene = (registry: SceneRegistry, part: Part, entry: SceneEntry): SceneRegistry => ({ ...registry, [part]: entry });

/** A new registry with `part` back on its Standard scene: what `onSceneError` should apply, so a broken scene is not retried. */
export const withStandardScene = (registry: SceneRegistry, part: Part): SceneRegistry => withScene(registry, part, STANDARD_SCENES[part]);

/**
 * The Live run's final chapters and CTA (its `page` event). They may close after the voices, when the
 * video already plays with the ones of the script without Claude; the slots then hand these to the
 * scenes instead, so only the five slots re-render and `videoProps` stays the same object.
 */
export interface PageText {
  readonly chapters: ReadonlyArray<Chapter>;
  readonly cta: Cta;
}

export interface SceneRegistryValue {
  readonly scenes: SceneRegistry;
  /**
   * A swapped-in scene threw while drawing. The boundary already shows the Standard scene; the registry's
   * owner should apply `withStandardScene`, or the broken scene mounts again after a seek back into its part.
   */
  readonly onSceneError?: (part: Part, error: unknown) => void;
  readonly pageText?: PageText;
}

/** The props a part's scene draws with: the final chapter and CTA once the page has them. */
const withPageText = (part: Part, props: SceneProps, pageText: PageText | undefined): SceneProps =>
  pageText ? { ...props, chapter: pageText.chapters[PARTS.indexOf(part)] ?? props.chapter, cta: pageText.cta } : props;

export const SceneRegistryContext = createContext<SceneRegistryValue>({ scenes: STANDARD_SCENES });

interface BoundaryProps {
  readonly part: Part;
  readonly sceneProps: SceneProps;
  readonly onError?: (part: Part, error: unknown) => void;
  readonly children: ReactNode;
}

/** Draws the part's Standard scene instead of a scene that throws. Keyed by the entry id, so a new swap starts clean. */
class SceneBoundary extends Component<BoundaryProps, { readonly failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { readonly failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo): void {
    this.props.onError?.(this.props.part, error);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    const Standard = STANDARD_SCENES[this.props.part].component;
    return <Standard {...this.props.sceneProps} />;
  }
}

/** The component the Screen holds for a part. Its identity never changes; it draws whatever the registry holds now. */
export const sceneSlot = (part: Part): FC<SceneProps> => {
  const Slot: FC<SceneProps> = (props) => {
    const { scenes, onSceneError, pageText } = useContext(SceneRegistryContext);
    const { component: Scene, id } = scenes[part];
    const sceneProps = withPageText(part, props, pageText);
    return (
      <SceneBoundary key={id} part={part} sceneProps={sceneProps} onError={onSceneError}>
        <Scene {...sceneProps} />
      </SceneBoundary>
    );
  };
  Slot.displayName = `SceneSlot(${part})`;
  return Slot;
};

// The run's narration as the page can fetch it. VideoProps carry the URLs the backend gave the narrator
// (absolute, on the API's port, for the MP4 render); the page plays them from its own origin, whose
// /runs is proxied to the API, so the same props work on any port pair.
import type { VideoProps } from "@sherpas/shared";

const RUNS_PREFIX = "/runs/";

/** A file that is not a valid URL is left as it is, rather than throwing while the page starts. */
const onOrigin = (audioFile: string, origin: string): string => {
  if (!URL.canParse(audioFile, origin)) return audioFile;
  const { pathname } = new URL(audioFile, origin);
  return pathname.startsWith(RUNS_PREFIX) ? `${origin}${pathname}` : audioFile;
};

/** The same props with every narration under /runs/ served from `origin`. Other audio files are left as they are. */
export const withAudioOn = (props: VideoProps, origin: string): VideoProps => ({
  ...props,
  scenes: props.scenes.map((timing) =>
    timing.audioFile ? { ...timing, audioFile: onOrigin(timing.audioFile, origin) } : timing,
  ) as unknown as VideoProps["scenes"],
});

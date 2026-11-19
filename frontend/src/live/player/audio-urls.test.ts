import { describe, expect, it } from "vitest";
import { videoPropsFixture, type VideoProps } from "@sherpas/shared";
import { withAudioOn } from "./audio-urls";

const ORIGIN = "http://localhost:5187";

const withAudio = (files: ReadonlyArray<string | undefined>): VideoProps => ({
  ...videoPropsFixture,
  scenes: videoPropsFixture.scenes.map((timing, index) => ({ ...timing, audioFile: files[index] })) as unknown as VideoProps["scenes"],
});

describe("withAudioOn", () => {
  it("serves the run's narration from the page's origin, whatever host the backend wrote", () => {
    const props = withAudio([
      "http://localhost:3018/runs/case/member/2026-11-18T21-21-12-658Z/audio/scene-1.mp3",
      "/runs/case/member/stamp/audio/scene-2.mp3",
      "https://cdn.example.com/voice.mp3",
      "voice/scene-4.mp3",
      undefined,
    ]);
    expect(withAudioOn(props, ORIGIN).scenes.map((timing) => timing.audioFile)).toEqual([
      `${ORIGIN}/runs/case/member/2026-11-18T21-21-12-658Z/audio/scene-1.mp3`,
      `${ORIGIN}/runs/case/member/stamp/audio/scene-2.mp3`,
      "https://cdn.example.com/voice.mp3",
      "voice/scene-4.mp3",
      undefined,
    ]);
  });

  it("does not change the props it is given", () => {
    const props = withAudio(["http://localhost:3018/runs/a/b/c/audio/scene-1.mp3"]);
    const before = JSON.stringify(props);
    withAudioOn(props, ORIGIN);
    expect(JSON.stringify(props)).toBe(before);
  });
});

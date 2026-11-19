import { describe, expect, it } from "vitest";
import { videoPropsFixture } from "@sherpas/shared";
import { BRAND } from "../../../../video-template/src/locked/timing";
import { partAt, partWindows } from "./part-clock";

const FPS = 30;

describe("partWindows", () => {
  it("places the parts back to back after the opening logo, in script order", () => {
    const windows = partWindows(videoPropsFixture, FPS);
    expect(windows.map((window) => window.part)).toEqual(videoPropsFixture.script.scenes.map((scene) => scene.part));
    expect(windows[0].fromFrame).toBe(BRAND.contentFromFrame);
    windows.slice(1).forEach((window, index) => expect(window.fromFrame).toBe(windows[index].toFrame));
    windows.forEach((window, index) =>
      expect(window.toFrame - window.fromFrame).toBe(Math.round(videoPropsFixture.scenes[index].durationSec * FPS)),
    );
  });

  it("says which part is on screen, and none during the opening or after the end", () => {
    const windows = partWindows(videoPropsFixture, FPS);
    expect(partAt(windows, 0)).toBeUndefined();
    expect(partAt(windows, windows[2].fromFrame)).toBe(windows[2].part);
    expect(partAt(windows, windows[2].toFrame - 1)).toBe(windows[2].part);
    expect(partAt(windows, windows[4].toFrame)).toBeUndefined();
  });
});

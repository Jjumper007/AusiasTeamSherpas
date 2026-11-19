import { describe, expect, it } from "vitest";
import { LIVE_RUN_PLAYING } from "@sherpas/backend/src/api/live-types";
import { decideNet, hasFired, msUntilNet, netTexts, SAFETY_NET_MS, WAITING, type NetFacts, type NetView } from "./safety-net";

const facts = (over: Partial<NetFacts> = {}): NetFacts => ({ sinceSentMs: 0, ready: false, error: null, demoVideo: "found", ...over });
const SLOW = { kind: "slow" } as const;

describe("decideNet: before live-ready", () => {
  it("keeps waiting while the run has had less than 40 s and nothing failed", () => {
    // Act
    const view = decideNet(WAITING, facts({ sinceSentMs: SAFETY_NET_MS - 1 }));

    // Assert
    expect(view).toEqual(WAITING);
  });

  it("switches to the Demo video at 40 s without live-ready", () => {
    // Act
    const view = decideNet(WAITING, facts({ sinceSentMs: SAFETY_NET_MS }));

    // Assert
    expect(view).toEqual({ kind: "demo", reason: SLOW });
  });

  it("switches to the Demo video at once when an error arrives", () => {
    // Act
    const view = decideNet(WAITING, facts({ sinceSentMs: 3000, error: "Making the voice failed: no key" }));

    // Assert
    expect(view).toEqual({ kind: "demo", reason: { kind: "failed", error: "Making the voice failed: no key" } });
  });

  it("treats a run already playing (409) as an error", () => {
    // Act
    const view = decideNet(WAITING, facts({ error: LIVE_RUN_PLAYING }));

    // Assert
    expect(view).toEqual({ kind: "demo", reason: { kind: "failed", error: LIVE_RUN_PLAYING } });
  });

  it("shows the message instead when the member has no Demo video, at 40 s or on an error", () => {
    // Act
    const slow = decideNet(WAITING, facts({ sinceSentMs: SAFETY_NET_MS, demoVideo: "none" }));
    const failed = decideNet(WAITING, facts({ error: "Lost the connection to the server.", demoVideo: "none" }));

    // Assert
    expect(slow).toEqual({ kind: "no-demo", reason: SLOW });
    expect(failed).toEqual({ kind: "no-demo", reason: { kind: "failed", error: "Lost the connection to the server." } });
  });

  it("is still checking for a Demo video when it fires before the lookup has answered, and settles once it does", () => {
    // Act
    const checking = decideNet(WAITING, facts({ sinceSentMs: SAFETY_NET_MS, demoVideo: "unknown" }));
    const found = decideNet(checking, facts({ sinceSentMs: SAFETY_NET_MS + 50, demoVideo: "found" }));
    const none = decideNet(checking, facts({ sinceSentMs: SAFETY_NET_MS + 50, demoVideo: "none" }));

    // Assert
    expect(checking).toEqual({ kind: "checking", reason: SLOW });
    expect(found).toEqual({ kind: "demo", reason: SLOW });
    expect(none).toEqual({ kind: "no-demo", reason: SLOW });
  });

  it("plays the Live run's video when live-ready arrives in time", () => {
    // Act
    const view = decideNet(WAITING, facts({ sinceSentMs: 12_000, ready: true }));

    // Assert
    expect(view).toEqual({ kind: "live" });
  });
});

describe("decideNet: once it has decided", () => {
  it("never fires once live-ready has arrived, even after 40 s or on a later error", () => {
    // Arrange
    const live: NetView = { kind: "live" };

    // Act
    const later = decideNet(live, facts({ sinceSentMs: SAFETY_NET_MS * 3, ready: true, error: "A scene failed" }));

    // Assert
    expect(later).toEqual(live);
  });

  it("never switches back from the Demo video, even if live-ready arrives late", () => {
    // Arrange
    const demo = decideNet(WAITING, facts({ sinceSentMs: SAFETY_NET_MS }));

    // Act
    const late = decideNet(demo, facts({ sinceSentMs: SAFETY_NET_MS + 2000, ready: true }));

    // Assert
    expect(late).toBe(demo);
  });

  it("keeps the first reason: an error after the 40 s switch does not change what the notice says", () => {
    // Arrange
    const demo = decideNet(WAITING, facts({ sinceSentMs: SAFETY_NET_MS }));

    // Act
    const after = decideNet(demo, facts({ sinceSentMs: SAFETY_NET_MS + 6000, error: "The page closed before the video was ready" }));

    // Assert
    expect(after).toEqual({ kind: "demo", reason: SLOW });
  });

  it("keeps the message once shown", () => {
    // Arrange
    const message = decideNet(WAITING, facts({ error: "boom", demoVideo: "none" }));

    // Act
    const later = decideNet(message, facts({ error: "boom", ready: true, demoVideo: "none" }));

    // Assert
    expect(later).toBe(message);
  });
});

describe("hasFired", () => {
  it("is true only while the page shows the Demo video, the message, or is about to", () => {
    // Arrange
    const reason = SLOW;
    const views: NetView[] = [WAITING, { kind: "live" }, { kind: "checking", reason }, { kind: "demo", reason }, { kind: "no-demo", reason }];

    // Act
    const fired = views.map(hasFired);

    // Assert
    expect(fired).toEqual([false, false, true, true, true]);
  });
});

describe("msUntilNet", () => {
  it("is the time left until 40 s after the survey was sent, never below zero", () => {
    // Act
    const left = [msUntilNet(0), msUntilNet(15_000), msUntilNet(SAFETY_NET_MS + 1)];

    // Assert
    expect(left).toEqual([SAFETY_NET_MS, SAFETY_NET_MS - 15_000, 0]);
  });
});

describe("netTexts", () => {
  it("says the video was made earlier, why, and never that it uses the new answers", () => {
    // Act
    const slow = netTexts(SLOW, "Daniel");
    const failed = netTexts({ kind: "failed", error: "Making the voice failed: no key" }, "Daniel");

    // Assert
    expect(slow.notice).toBe("Showing the video made earlier");
    expect(slow.why).toMatch(/took more than 40 seconds/);
    expect(failed.why).toMatch(/could not be made/);
    expect(failed.detail).toBe("Making the voice failed: no key");
    expect(slow.detail).toBeNull();
    [slow.why, failed.why].forEach((why) => expect(why).toMatch(/answers given then/));
  });

  it("says what to do when another run was still playing", () => {
    // Act
    const busy = netTexts({ kind: "failed", error: LIVE_RUN_PLAYING }, "Daniel");

    // Assert
    expect(busy.why).toMatch(/still being made/);
    expect(busy.detail).toBe("Wait a few seconds, then try again.");
  });

  it("names the member when there is no Demo video to show", () => {
    // Act
    const texts = netTexts({ kind: "failed", error: "boom" }, "Michael");

    // Assert
    expect(texts.noDemoTitle).toBe("The video could not be made");
    expect(texts.noDemo).toBe("There is no video made earlier for Michael to show instead.");
    expect(texts.detail).toBe("boom");
  });
});

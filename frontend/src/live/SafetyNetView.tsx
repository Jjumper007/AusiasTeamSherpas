// What the live page shows once the safety net has fired: the member's Demo video (the same player as the
// Demo, nothing kept in this browser) under a notice that stays while it plays, or, without a Demo video,
// a clear message in the stage. "Try again" starts a new Live run with the same answers.
import { CircleAlert, History, RotateCcw } from "lucide-react";
import { Watch } from "../components/Watch";
import type { JobResult } from "../types";
import { netTexts, type NetView } from "./safety-net";
import { hasActivation } from "./use-live-player";

interface Props {
  readonly view: NetView;
  readonly demo: JobResult | null;
  /** The member the page is for, as the wait named them. */
  readonly name: string;
  readonly onTryAgain: () => void;
}

const LOADING = "Loading the video made earlier…";

export function SafetyNetView({ view, demo, name, onTryAgain }: Props) {
  if (view.kind !== "demo" && view.kind !== "no-demo") {
    return (
      <div className="stage">
        <p className="stage-msg">{LOADING}</p>
      </div>
    );
  }
  const texts = netTexts(view.reason, name);
  if (view.kind === "no-demo" || !demo) {
    return (
      <div className="stage">
        <div className="net-message" role="alert">
          <CircleAlert className="ic net-message-ic" aria-hidden="true" />
          <h2 className="net-message-title">{texts.noDemoTitle}</h2>
          <p className="net-message-text">{texts.noDemo}</p>
          {texts.detail && <p className="net-message-detail">{texts.detail}</p>}
          <button className="cta-big net-cta" type="button" onClick={onTryAgain} autoFocus>
            <RotateCcw className="ic" aria-hidden="true" /> Try again
          </button>
        </div>
      </div>
    );
  }
  return (
    <>
      {/* An alert: it is inserted already filled, which a polite status region may not announce. */}
      <section className="net-notice" role="alert">
        <History className="ic net-notice-ic" aria-hidden="true" />
        <div className="net-notice-text">
          <p className="net-notice-title">{texts.notice}</p>
          <p className="net-notice-why">{texts.why}</p>
          {texts.detail && <p className="net-notice-detail">{texts.detail}</p>}
        </div>
        <button className="solid net-notice-retry" type="button" onClick={onTryAgain}>
          <RotateCcw className="ic" aria-hidden="true" /> Try again
        </button>
      </section>
      {/* After the survey's taps the browser lets it start with sound; otherwise Watch shows its start card. */}
      <Watch key={demo.runId} result={demo} demo autoStart={hasActivation()} />
    </>
  );
}

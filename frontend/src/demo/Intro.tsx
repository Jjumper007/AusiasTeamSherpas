// The prototype intro: the demo's first screen. It says this is a working prototype that plays a
// video our pipeline already made, and the member cards below it start that member's survey.
import { ChevronRight, UserRound } from "lucide-react";
import type { DemoMember } from "../types";
import { INTRO_BODY, INTRO_TITLE, PICK_TITLE, memberLine } from "./intro-copy";

interface Props {
  members: readonly DemoMember[];
  onPick(member: DemoMember, from: HTMLElement): void;
}

export function Intro({ members, onPick }: Props) {
  return (
    <div className="onboard intro">
      <section className="intro-page ob-in">
        <h1 className="ob-q">{INTRO_TITLE}</h1>
        {INTRO_BODY.map((paragraph) => <p key={paragraph} className="intro-text">{paragraph}</p>)}
        <h2 className="intro-pick">{PICK_TITLE}</h2>
        <div className="intro-members">
          {members.map((member) => (
            <button key={`${member.survey.caseId}/${member.survey.member}`} type="button" className="ob-opt" onClick={(e) => onPick(member, e.currentTarget)}>
              <span className="ob-ic"><UserRound /></span>
              <span className="l">{member.survey.name}<small>{memberLine(member.result.survey)}</small></span>
              <ChevronRight className="ic intro-go" aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

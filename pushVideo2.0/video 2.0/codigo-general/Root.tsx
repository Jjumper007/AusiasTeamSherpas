import React from "react";
import { Composition } from "remotion";
import { MichaelAdvisorV2, MICHAEL_ADVISOR_V2_DURATION } from "./MichaelAdvisorV2";

export const RemotionRoot: React.FC = () => (
  <Composition id="MichaelAdvisorV2" component={MichaelAdvisorV2} durationInFrames={MICHAEL_ADVISOR_V2_DURATION} fps={30} width={1920} height={1080} />
);

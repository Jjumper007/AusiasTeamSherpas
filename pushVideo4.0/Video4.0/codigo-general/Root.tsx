import React from "react";
import { Composition } from "remotion";
import { Video4, VIDEO4_DURATION } from "./Video4";

export const RemotionRoot: React.FC = () => (
  <Composition id="Video4" component={Video4} durationInFrames={VIDEO4_DURATION} fps={30} width={1920} height={1080} />
);

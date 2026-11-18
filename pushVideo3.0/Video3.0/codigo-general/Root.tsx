import React from "react";
import { Composition } from "remotion";
import { Video3, VIDEO3_DURATION } from "./Video3";

export const RemotionRoot: React.FC = () => (
  <Composition id="Video3" component={Video3} durationInFrames={VIDEO3_DURATION} fps={30} width={1920} height={1080} />
);

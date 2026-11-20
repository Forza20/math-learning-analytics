import React from "react";
import { Composition } from "remotion";
import { DURATION, FPS, IntroVideo } from "./IntroVideo";

// Square format: takes the most space in the LinkedIn feed on phones.
export const RemotionRoot: React.FC = () => (
  <Composition id="IntroVideo" component={IntroVideo} durationInFrames={DURATION} fps={FPS} width={1080} height={1080} />
);

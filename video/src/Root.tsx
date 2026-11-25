import React from "react";
import { Composition } from "remotion";
import { calculateGameplayMetadata, GAMEPLAY_DURATION, GAMEPLAY_FPS, GameplayVideo } from "./GameplayVideo";
import { DURATION, FPS, IntroVideo } from "./IntroVideo";

// Square format: takes the most space in the LinkedIn feed on phones.
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="IntroVideo" component={IntroVideo} durationInFrames={DURATION} fps={FPS} width={1080} height={1080} />
    <Composition
      id="GameplayVideo"
      component={GameplayVideo}
      durationInFrames={GAMEPLAY_DURATION}
      fps={GAMEPLAY_FPS}
      width={1080}
      height={1080}
      defaultProps={{ markers: null }}
      calculateMetadata={calculateGameplayMetadata}
    />
  </>
);

import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { Scene } from "./components";
import { DashboardScene } from "./scenes/DashboardScene";
import { GameScene } from "./scenes/GameScene";
import { IntroScene } from "./scenes/IntroScene";
import { MistakesScene } from "./scenes/MistakesScene";
import { OutroScene } from "./scenes/OutroScene";
import { PipelineScene } from "./scenes/PipelineScene";
import { SecurityScene } from "./scenes/SecurityScene";
import { colors } from "./theme";

export const FPS = 30;

// Scene lengths in frames at 30 fps. Total 1200 frames = 40 s.
export const SCENES = {
  intro: 120,
  game: 210,
  security: 120,
  pipeline: 210,
  mistakes: 180,
  dashboard: 210,
  outro: 150,
} as const;

export const DURATION = Object.values(SCENES).reduce((a, b) => a + b, 0);

export const IntroVideo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: colors.bg }}>
    <Series>
      <Series.Sequence durationInFrames={SCENES.intro} name="Intro">
        <IntroScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENES.game} name="Game">
        <Scene>
          <GameScene />
        </Scene>
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENES.security} name="Security">
        <Scene>
          <SecurityScene />
        </Scene>
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENES.pipeline} name="Pipeline">
        <Scene>
          <PipelineScene />
        </Scene>
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENES.mistakes} name="Mistakes">
        <Scene>
          <MistakesScene />
        </Scene>
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENES.dashboard} name="Dashboard">
        <Scene>
          <DashboardScene />
        </Scene>
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENES.outro} name="Outro">
        <Scene fadeOut={false}>
          <OutroScene />
        </Scene>
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);

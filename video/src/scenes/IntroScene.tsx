import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { Caption, Scene, useIn } from "../components";
import { colors } from "../theme";

export const IntroScene: React.FC = () => {
  const kicker = useIn(4);
  const line1 = useIn(12);
  const line2 = useIn(44);
  const symbols = useIn(0);

  return (
    <Scene>
      {/* Faint math symbols in the background */}
      <AbsoluteFill style={{ opacity: 0.07 * symbols, fontSize: 220, fontWeight: 800 }}>
        <span style={{ position: "absolute", left: 60, top: 40 }}>+</span>
        <span style={{ position: "absolute", right: 90, top: 120 }}>×</span>
        <span style={{ position: "absolute", left: 140, bottom: 160 }}>÷</span>
        <span style={{ position: "absolute", right: 120, bottom: 60 }}>−</span>
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: "center", padding: 80 }}>
        <div style={{ fontSize: 34, fontWeight: 700, color: colors.blue, letterSpacing: 2, opacity: kicker }}>
          MATH TRAIL
        </div>
        <div
          style={{
            fontSize: 92,
            fontWeight: 800,
            lineHeight: 1.05,
            marginTop: 16,
            opacity: line1,
            transform: `translateY(${interpolate(line1, [0, 1], [30, 0])}px)`,
          }}
        >
          A math and spelling game for children aged 8–12
        </div>
        <div
          style={{
            fontSize: 60,
            fontWeight: 700,
            lineHeight: 1.15,
            marginTop: 28,
            color: colors.gold,
            opacity: line2,
            transform: `translateY(${interpolate(line2, [0, 1], [30, 0])}px)`,
          }}
        >
          …and the data pipeline
          <br />
          behind it.
        </div>
      </AbsoluteFill>

      <Caption delay={70}>A data engineering portfolio project</Caption>
    </Scene>
  );
};

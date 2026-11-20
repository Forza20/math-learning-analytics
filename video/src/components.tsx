import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { baseGradient, colors, FADE_FRAMES, fontFamily } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 0 -> 1 spring that starts `delay` frames into the scene.
export const useIn = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 200 } });
};

// Fades a scene in at its start and out at its end, over the shared background.
export const Scene: React.FC<{ children: React.ReactNode; fadeIn?: boolean; fadeOut?: boolean }> = ({
  children,
  fadeIn = true,
  fadeOut = true,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacityIn = fadeIn ? interpolate(frame, [0, FADE_FRAMES], [0, 1], clamp) : 1;
  const opacityOut = fadeOut
    ? interpolate(frame, [durationInFrames - FADE_FRAMES, durationInFrames], [1, 0], clamp)
    : 1;
  return (
    <AbsoluteFill style={{ background: baseGradient, fontFamily, color: colors.text }}>
      <AbsoluteFill style={{ opacity: Math.min(opacityIn, opacityOut), padding: 80 }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// Small label above a heading, e.g. "1 · The game".
export const Kicker: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = colors.blue }) => {
  const t = useIn(0);
  return (
    <div style={{ fontSize: 30, fontWeight: 700, color, letterSpacing: 2, textTransform: "uppercase", opacity: t }}>
      {children}
    </div>
  );
};

export const Heading: React.FC<{ children: React.ReactNode; delay?: number; size?: number }> = ({
  children,
  delay = 4,
  size = 64,
}) => {
  const t = useIn(delay);
  return (
    <h2
      style={{
        margin: "12px 0 0",
        fontSize: size,
        lineHeight: 1.12,
        fontWeight: 800,
        opacity: t,
        transform: `translateY(${interpolate(t, [0, 1], [24, 0])}px)`,
      }}
    >
      {children}
    </h2>
  );
};

// Caption pinned to the bottom of the frame: the "voice" of the video, since it plays muted.
export const Caption: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 20 }) => {
  const t = useIn(delay);
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        bottom: 72,
        fontSize: 34,
        lineHeight: 1.35,
        color: colors.muted,
        opacity: t,
        transform: `translateY(${interpolate(t, [0, 1], [16, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
};

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      background: colors.card,
      border: `2px solid ${colors.cardBorder}`,
      borderRadius: 24,
      padding: 32,
      boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
      ...style,
    }}
  >
    {children}
  </div>
);

import React from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily } from "./theme";

// A 20-second gameplay video for LinkedIn, cut from real screen recordings of the
// game (gameplay/record.mjs). The phone on the right plays the clips; the captions
// on the left say what is happening. Silent: LinkedIn plays videos muted.

export const GAMEPLAY_FPS = 30;

// Milliseconds from the start of each recording, written by gameplay/record.mjs.
export type Markers = { math: Record<string, number>; danish: Record<string, number> };
export type GameplayProps = { markers: Markers | null };

// The game's own colours, so the video looks like the app.
const C = {
  skyTop: "#4db8ff",
  skyBottom: "#c9ecff",
  ink: "#23272f",
  green: "#2fbf4f",
  yellow: "#ffd84d",
  red: "#e23b3b",
  white: "#ffffff",
};

const outline = (w: number) =>
  `0 ${w + 1}px 0 ${C.ink}, ${w}px 0 0 ${C.ink}, -${w}px 0 0 ${C.ink}, 0 -${w}px 0 ${C.ink}`;

type Clip = {
  name: string;
  src: "math" | "danish";
  from: (m: Markers) => number; // ms in the recording where the clip starts
  frames: number; // length in the video
  rate: number; // playback speed
  caption: string;
};

// 525 frames of gameplay + 75 frames outro = 600 frames = 20 s.
const CLIPS: Clip[] = [
  { name: "Start", src: "math", from: (m) => m.math.tapSubject - 400, frames: 60, rate: 1.3, caption: "Pick a subject and a level" },
  { name: "Play", src: "math", from: (m) => m.math.go - 200, frames: 150, rate: 1.5, caption: "Solve the task to jump the obstacle" },
  { name: "Wrong", src: "math", from: (m) => m.math.q4 - 200, frames: 105, rate: 1, caption: "A wrong answer costs 10 seconds" },
  { name: "Dansk", src: "danish", from: (m) => m.danish.q1 - 300, frames: 75, rate: 1.2, caption: "Dansk: pick the right spelling" },
  { name: "Finish", src: "math", from: (m) => m.math.a10 - 300, frames: 60, rate: 1.5, caption: "Race to the finish line" },
  { name: "Reward", src: "math", from: (m) => m.math.end - 200, frames: 75, rate: 1, caption: "Beat your best time and meet the dino" },
];
const OUTRO_FRAMES = 75;
export const GAMEPLAY_DURATION = CLIPS.reduce((sum, c) => sum + c.frames, 0) + OUTRO_FRAMES;

// Reads the markers from the recording before rendering.
export const calculateGameplayMetadata: CalculateMetadataFunction<GameplayProps> = async ({ props }) => {
  if (props.markers) return {};
  const res = await fetch(staticFile("gameplay/markers.json"));
  return { props: { markers: res.ok ? ((await res.json()) as Markers) : null } };
};

// Phone frame: the recording is 390×760 CSS px (recorded at 2x).
const SCREEN = { w: 478, h: 932 };
const BEZEL = 14;
const PHONE = { x: 1080 - (SCREEN.w + 2 * BEZEL) - 56, y: (1080 - (SCREEN.h + 2 * BEZEL)) / 2 };
const LEFT = { x: 56, w: PHONE.x - 56 - 40 };

const useSpring = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
};

const Sky: React.FC = () => (
  <AbsoluteFill style={{ background: `linear-gradient(${C.skyTop}, ${C.skyBottom})` }}>
    {[
      { x: 60, y: 820, w: 150 },
      { x: 300, y: 930, w: 110 },
      { x: 150, y: 990, w: 80 },
    ].map((c, i) => (
      <div
        key={i}
        style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.w / 4, background: C.white, borderRadius: 10, opacity: 0.85 }}
      />
    ))}
  </AbsoluteFill>
);

const Title: React.FC = () => (
  <div style={{ position: "absolute", left: LEFT.x, top: 72, width: LEFT.w }}>
    <div style={{ fontSize: 76, fontWeight: 900, color: C.white, textShadow: outline(4), letterSpacing: 1 }}>Regnestien</div>
    <div style={{ marginTop: 14, fontSize: 30, fontWeight: 800, color: C.ink, lineHeight: 1.25 }}>
      A math and spelling game for kids aged 8–12
    </div>
  </div>
);

const Caption: React.FC<{ text: string; rate: number }> = ({ text, rate }) => {
  const t = useSpring(2);
  return (
    <div
      style={{
        position: "absolute",
        left: LEFT.x,
        top: 400,
        width: LEFT.w,
        transform: `translateY(${interpolate(t, [0, 1], [40, 0])}px) scale(${interpolate(t, [0, 1], [0.92, 1])})`,
        opacity: Math.min(1, t * 1.5),
      }}
    >
      <div
        style={{
          background: C.white,
          border: `5px solid ${C.ink}`,
          borderRadius: 24,
          boxShadow: `0 9px 0 ${C.ink}`,
          padding: "26px 30px",
          fontSize: 50,
          fontWeight: 900,
          lineHeight: 1.12,
          color: C.ink,
        }}
      >
        {text}
      </div>
      {rate !== 1 && (
        <div
          style={{
            display: "inline-block",
            marginTop: 26,
            background: C.yellow,
            border: `4px solid ${C.ink}`,
            borderRadius: 99,
            padding: "6px 20px",
            fontSize: 26,
            fontWeight: 900,
            color: C.ink,
          }}
        >
          ⏩ {rate}× speed
        </div>
      )}
    </div>
  );
};

const Footer: React.FC = () => (
  <div style={{ position: "absolute", left: LEFT.x, bottom: 64, width: LEFT.w, fontSize: 24, fontWeight: 800, color: C.ink, opacity: 0.75 }}>
    Real gameplay, recorded in the browser
  </div>
);

const Phone: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: "absolute",
      left: PHONE.x,
      top: PHONE.y,
      width: SCREEN.w + 2 * BEZEL,
      height: SCREEN.h + 2 * BEZEL,
      padding: BEZEL,
      background: C.ink,
      borderRadius: 60,
      boxShadow: `0 10px 0 ${C.ink}, 0 34px 60px rgba(0, 0, 0, .22)`,
    }}
  >
    <div style={{ position: "relative", width: SCREEN.w, height: SCREEN.h, borderRadius: 46, overflow: "hidden", background: C.skyTop }}>
      {children}
    </div>
  </div>
);

const ClipVideo: React.FC<{ clip: Clip; markers: Markers }> = ({ clip, markers }) => (
  <OffthreadVideo
    src={staticFile(`gameplay/${clip.src}.webm`)}
    startFrom={Math.max(0, Math.round((clip.from(markers) / 1000) * GAMEPLAY_FPS))}
    playbackRate={clip.rate}
    muted
    style={{ width: SCREEN.w, height: SCREEN.h, objectFit: "cover" }}
  />
);

const Outro: React.FC = () => {
  const a = useSpring(0);
  const b = useSpring(10);
  const c = useSpring(22);
  const rise = (t: number) => ({ opacity: Math.min(1, t * 1.5), transform: `translateY(${interpolate(t, [0, 1], [30, 0])}px)` });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80, textAlign: "center" }}>
      <Sky />
      <div style={{ position: "relative", fontSize: 96, fontWeight: 900, color: C.white, textShadow: outline(5), ...rise(a) }}>Regnestien</div>
      <div style={{ position: "relative", marginTop: 30, fontSize: 46, fontWeight: 900, color: C.ink, lineHeight: 1.2, maxWidth: 860, ...rise(b) }}>
        Every answer becomes an anonymous event in a nightly data pipeline
      </div>
      <div
        style={{
          position: "relative",
          marginTop: 56,
          background: C.white,
          border: `5px solid ${C.ink}`,
          borderRadius: 22,
          boxShadow: `0 8px 0 ${C.ink}`,
          padding: "18px 30px",
          ...rise(c),
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 800, color: C.ink, opacity: 0.7 }}>Play it, and see the dashboard and code</div>
        <div style={{ fontSize: 40, fontWeight: 900, color: "#2f6fdf", marginTop: 6 }}>forza20.github.io/math-learning-analytics</div>
      </div>
    </AbsoluteFill>
  );
};

export const GameplayVideo: React.FC<GameplayProps> = ({ markers }) => {
  if (!markers) {
    return (
      <AbsoluteFill style={{ fontFamily, background: C.skyTop, justifyContent: "center", alignItems: "center", fontSize: 40, padding: 80 }}>
        No recording yet: run gameplay/record.mjs first (see README).
      </AbsoluteFill>
    );
  }
  let start = 0;
  return (
    <AbsoluteFill style={{ fontFamily, color: C.ink }}>
      <Sky />
      <Title />
      <Footer />
      {CLIPS.map((clip) => {
        const from = start;
        start += clip.frames;
        return (
          <Sequence key={clip.name} name={clip.name} from={from} durationInFrames={clip.frames}>
            <Phone>
              <ClipVideo clip={clip} markers={markers} />
            </Phone>
            <Caption text={clip.caption} rate={clip.rate} />
          </Sequence>
        );
      })}
      <Sequence name="Outro" from={start} durationInFrames={OUTRO_FRAMES}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};

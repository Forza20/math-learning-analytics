import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

// The screen recording of the real game made by gameplay/record.mjs, shared by
// GameplayVideo and the game scene of IntroVideo.

// Per round: when each moment happened, when each game sound played, the events
// the game sent (answered in the browser, never stored), and when each frame
// (public/gameplay/<round>/<n>.jpg) was painted. Times in ms from the first frame.
export type Recording = {
  marks: Record<string, number>;
  sounds: [string, number][];
  events: Record<string, unknown>[];
  frames: number[];
};
export type Markers = { math: Recording; danish: Recording };

// Reads markers.json; null if there is no recording yet.
export async function loadMarkers(): Promise<Markers | null> {
  const res = await fetch(staticFile("gameplay/markers.json"));
  return res.ok ? ((await res.json()) as Markers) : null;
}

// The recording is a 412×800 CSS px phone screen (frames at 2x).
export const SCREEN_RATIO = 412 / 800;

// Shows the frame on screen at fromMs + the time since this sequence began × rate.
export const RecordedScreen: React.FC<{
  recording: Recording;
  src: "math" | "danish";
  fromMs: number;
  rate?: number;
  width: number;
  height: number;
}> = ({ recording, src, fromMs, rate = 1, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = fromMs + (frame / fps) * 1000 * rate;
  const times = recording.frames;
  let lo = 0;
  let hi = times.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (times[mid] <= ms) lo = mid;
    else hi = mid - 1;
  }
  return <Img src={staticFile(`gameplay/${src}/${lo}.jpg`)} style={{ width, height, objectFit: "cover", objectPosition: "top" }} />;
};

import React from "react";
import { interpolate, useVideoConfig } from "remotion";
import { Caption, Heading, Kicker, useIn } from "../components";
import { RecordedScreen, Recording, SCREEN_RATIO } from "../recording";
import { colors, monoFamily } from "../theme";

// Real gameplay from the recording (gameplay/record.mjs): obstacle 3 answered right,
// obstacle 4 answered wrong. Next to the phone, the event the game sent for each
// answer appears at the moment of the answer. The events are the recorded ones.

const FIRST = 3; // the two obstacles shown
const FIELDS = ["topic", "task_type", "operand_a", "operand_b", "given_answer", "response_ms"];
const SCREEN = { h: 560, w: Math.round(560 * SCREEN_RATIO) };
const BEZEL = 10;

const EventCard: React.FC<{ event: Record<string, unknown>; appearAt: number; offset: number }> = ({
  event,
  appearAt,
  offset,
}) => {
  const t = useIn(appearAt);
  const lines = FIELDS.filter((k) => event[k] !== undefined).map((k) => `"${k}": ${JSON.stringify(event[k])}`);
  const wrong = event.topic !== "spelling" && String(event.given_answer) !== String(event.correct_answer);
  return (
    <div
      style={{
        fontFamily: monoFamily,
        fontSize: 21,
        lineHeight: 1.45,
        background: "#0b1220",
        border: `2px solid ${wrong ? colors.bad : colors.good}`,
        borderRadius: 16,
        padding: "14px 20px",
        marginTop: offset,
        opacity: t,
        transform: `translateX(${interpolate(t, [0, 1], [-60, 0])}px)`,
        color: colors.silver,
      }}
    >
      <div style={{ color: colors.muted }}>{"{"}</div>
      {lines.map((line, i) => (
        <div key={line} style={{ paddingLeft: 18 }}>
          {line}
          {i < lines.length - 1 ? "," : ""}
        </div>
      ))}
      <div style={{ color: colors.muted }}>{"}"}</div>
    </div>
  );
};

export const GameScene: React.FC<{ recording: Recording }> = ({ recording }) => {
  const { fps } = useVideoConfig();
  const dbLabel = useIn(20);
  const fromMs = recording.marks["q" + FIRST] - 300;
  const frameOf = (ms: number) => Math.round(((ms - fromMs) / 1000) * fps);
  const shown = [FIRST, FIRST + 1].map((i) => ({
    event: recording.events.find((e) => e.question_index === i) ?? {},
    at: frameOf(recording.marks["a" + i]),
  }));

  return (
    <>
      <Kicker>1 · The game</Kicker>
      <Heading>Every answer becomes an event</Heading>

      <div style={{ display: "flex", gap: 40, marginTop: 36, alignItems: "flex-start" }}>
        <div
          style={{
            flexShrink: 0,
            padding: BEZEL,
            background: "#0b1220",
            border: `2px solid ${colors.cardBorder}`,
            borderRadius: 40,
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
          }}
        >
          <div style={{ width: SCREEN.w, height: SCREEN.h, borderRadius: 30, overflow: "hidden" }}>
            <RecordedScreen recording={recording} src="math" fromMs={fromMs} width={SCREEN.w} height={SCREEN.h} />
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 24, color: colors.muted, opacity: dbLabel, marginBottom: 4 }}>
            → bronze.answer_events (Postgres)
          </div>
          {shown.map(({ event, at }, i) => (
            <EventCard key={i} event={event} appearAt={at} offset={i === 0 ? 8 : 16} />
          ))}
        </div>
      </div>

      <Caption delay={165}>Right, wrong or skipped: every answer is one row in the database.</Caption>
    </>
  );
};

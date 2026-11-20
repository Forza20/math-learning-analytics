import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Caption, Card, Heading, Kicker, useIn } from "../components";
import { colors, monoFamily } from "../theme";

type Step = {
  question: string;
  index: number;
  typed: [number, string][]; // [frame, text so far]
  feedbackAt: number;
  correct: boolean;
  answer: number;
  event: string[];
};

const STEPS: Step[] = [
  {
    question: "7 × 8 = ?",
    index: 3,
    typed: [[34, "5"], [44, "54"]],
    feedbackAt: 62,
    correct: false,
    answer: 56,
    event: ['"topic": "multiplication"', '"operand_a": 7', '"operand_b": 8', '"given_answer": "54"', '"response_ms": 4210'],
  },
  {
    question: "47 + 38 = ?",
    index: 4,
    typed: [[124, "8"], [134, "85"]],
    feedbackAt: 150,
    correct: true,
    answer: 85,
    event: ['"topic": "addition"', '"operand_a": 47', '"operand_b": 38', '"given_answer": "85"', '"response_ms": 3180'],
  },
];
const SWITCH_AT = 108;

const EventCard: React.FC<{ step: Step; appearAt: number; offset: number }> = ({ step, appearAt, offset }) => {
  const t = useIn(appearAt);
  return (
    <div
      style={{
        fontFamily: monoFamily,
        fontSize: 20,
        lineHeight: 1.45,
        background: "#0b1220",
        border: `2px solid ${colors.cardBorder}`,
        borderRadius: 16,
        padding: "16px 20px",
        marginTop: offset,
        opacity: t,
        transform: `translateX(${interpolate(t, [0, 1], [-60, 0])}px)`,
        color: colors.silver,
      }}
    >
      <div style={{ color: colors.muted }}>{"{"}</div>
      {step.event.map((line, i) => (
        <div key={line} style={{ paddingLeft: 18 }}>
          {line}
          {i < step.event.length - 1 ? "," : ""}
        </div>
      ))}
      <div style={{ color: colors.muted }}>{"}"}</div>
    </div>
  );
};

export const GameScene: React.FC = () => {
  const frame = useCurrentFrame();
  const step = frame < SWITCH_AT ? STEPS[0] : STEPS[1];
  const typed = [...step.typed].reverse().find(([f]) => frame >= f)?.[1] ?? "";
  const showFeedback = frame >= step.feedbackAt;
  const caretOn = Math.floor(frame / 15) % 2 === 0;
  const dbLabel = useIn(70);

  return (
    <>
      <Kicker>1 · The game</Kicker>
      <Heading>Every answer becomes an event</Heading>

      <div style={{ display: "flex", gap: 32, marginTop: 48 }}>
        <Card style={{ width: 430, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: colors.muted, fontSize: 22 }}>
            <span>Question {step.index}/10</span>
            <span>★ {step.index - 1}</span>
          </div>
          <div style={{ height: 8, background: "#334155", borderRadius: 99, marginTop: 12, overflow: "hidden" }}>
            <div style={{ width: `${(step.index - 1) * 10}%`, height: "100%", background: colors.blue }} />
          </div>
          <div style={{ fontSize: 66, fontWeight: 800, textAlign: "center", margin: "36px 0 28px" }}>{step.question}</div>
          <div
            style={{
              border: `3px solid ${colors.blue}`,
              borderRadius: 14,
              height: 76,
              fontSize: 44,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {typed}
            {!showFeedback && <span style={{ opacity: caretOn ? 1 : 0, color: colors.blue }}>|</span>}
          </div>
          <div
            style={{
              minHeight: 44,
              marginTop: 18,
              textAlign: "center",
              fontSize: 27,
              fontWeight: 700,
              color: step.correct ? colors.good : colors.bad,
              opacity: showFeedback ? 1 : 0,
            }}
          >
            {step.correct ? "Correct!" : `Not quite. The answer is ${step.answer}`}
          </div>
        </Card>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 24, color: colors.muted, opacity: dbLabel, marginBottom: 4 }}>
            → bronze.answer_events (Postgres)
          </div>
          <EventCard step={STEPS[0]} appearAt={STEPS[0].feedbackAt} offset={8} />
          <EventCard step={STEPS[1]} appearAt={STEPS[1].feedbackAt} offset={16} />
        </div>
      </div>

      <Caption delay={160}>Right, wrong or skipped: every answer is one row in the database.</Caption>
    </>
  );
};

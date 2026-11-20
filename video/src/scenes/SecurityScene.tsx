import React from "react";
import { interpolate } from "remotion";
import { Caption, Heading, Kicker, useIn } from "../components";
import { colors } from "../theme";

const RULES = [
  { allowed: true, text: "Add an answer" },
  { allowed: false, text: "Read any data" },
  { allowed: false, text: "Change or delete rows" },
  { allowed: false, text: "Pretend to be simulated data" },
];

const Rule: React.FC<{ allowed: boolean; text: string; delay: number }> = ({ allowed, text, delay }) => {
  const t = useIn(delay);
  const color = allowed ? colors.good : colors.bad;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        fontSize: 44,
        fontWeight: 700,
        opacity: t,
        transform: `translateX(${interpolate(t, [0, 1], [-40, 0])}px)`,
      }}
    >
      <span
        style={{
          width: 64,
          height: 64,
          borderRadius: 99,
          border: `4px solid ${color}`,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
          flexShrink: 0,
        }}
      >
        {allowed ? "✓" : "✕"}
      </span>
      <span style={{ color: allowed ? colors.text : colors.muted }}>{text}</span>
    </div>
  );
};

export const SecurityScene: React.FC = () => (
  <>
    <Kicker color={colors.good}>2 · Security and privacy</Kicker>
    <Heading>The browser can only insert</Heading>
    <div style={{ display: "flex", flexDirection: "column", gap: 34, marginTop: 64 }}>
      {RULES.map((r, i) => (
        <Rule key={r.text} {...r} delay={14 + i * 9} />
      ))}
    </div>
    <Caption delay={60}>No name, age, login or IP address is stored. Every player is anonymous.</Caption>
  </>
);

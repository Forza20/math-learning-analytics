import React from "react";
import { interpolate } from "remotion";
import { Caption, Heading, Kicker, useIn } from "../components";
import { colors, monoFamily } from "../theme";

// Examples taken from the dbt unit tests in dbt/models/silver/_silver.yml
const EXAMPLES = [
  { sum: "47 + 38", given: "75", label: "Forgot to carry", color: colors.orange },
  { sum: "7 × 8", given: "65", label: "Reversed digits", color: colors.aqua },
  { sum: "7 × 8", given: "49", label: "Times table neighbour", color: colors.magenta },
  { sum: "7 × 8", given: "15", label: "Wrong operation", color: colors.yellow },
  { sum: "7 × 8", given: "57", label: "Off by one", color: colors.blue },
];

const Row: React.FC<(typeof EXAMPLES)[number] & { delay: number }> = ({ sum, given, label, color, delay }) => {
  const t = useIn(delay);
  const tag = useIn(delay + 12);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, opacity: t }}>
      <span style={{ fontFamily: monoFamily, fontSize: 40, width: 360, flexShrink: 0 }}>
        {sum} = <span style={{ color: colors.bad, fontWeight: 700 }}>{given}</span>
      </span>
      <span style={{ fontSize: 34, color: colors.muted, opacity: tag }}>→</span>
      <span
        style={{
          fontSize: 32,
          fontWeight: 700,
          padding: "10px 20px",
          borderRadius: 12,
          background: color,
          color: "#ffffff",
          opacity: tag,
          transform: `scale(${interpolate(tag, [0, 1], [0.85, 1])})`,
        }}
      >
        {label}
      </span>
    </div>
  );
};

export const MistakesScene: React.FC = () => (
  <>
    <Kicker color={colors.orange}>4 · Classifying mistakes</Kicker>
    <Heading>Not just wrong, but how it's wrong</Heading>
    <div style={{ display: "flex", flexDirection: "column", gap: 30, marginTop: 56 }}>
      {EXAMPLES.map((e, i) => (
        <Row key={e.label} {...e} delay={14 + i * 14} />
      ))}
    </div>
    <Caption delay={110}>Seven rules in SQL, each pinned down by a dbt unit test.</Caption>
  </>
);

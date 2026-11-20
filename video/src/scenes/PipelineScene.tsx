import React from "react";
import { interpolate } from "remotion";
import { Caption, Heading, Kicker, useIn } from "../components";
import { colors } from "../theme";

const LAYERS = [
  { name: "Bronze", text: "Raw events, exactly as received", color: colors.bronze },
  { name: "Silver", text: "Deduplicated, typed, every mistake classified", color: colors.silver },
  { name: "Gold", text: "Star schema and dashboard marts", color: colors.gold },
  { name: "Live", text: "Game · dashboard · dbt docs on GitHub Pages", color: colors.blue },
];

const TOOLS = ["Python simulator", "dbt · about 50 tests", "GitHub Actions · 03:00 every night"];

const Layer: React.FC<{ name: string; text: string; color: string; delay: number; last: boolean }> = ({
  name,
  text,
  color,
  delay,
  last,
}) => {
  const t = useIn(delay);
  const arrow = useIn(delay + 10);
  return (
    <div style={{ opacity: t, transform: `translateY(${interpolate(t, [0, 1], [20, 0])}px)` }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          background: colors.card,
          border: `2px solid ${colors.cardBorder}`,
          borderLeft: `10px solid ${color}`,
          borderRadius: 18,
          padding: "20px 26px",
        }}
      >
        <span style={{ fontSize: 34, fontWeight: 800, color, width: 130, flexShrink: 0 }}>{name}</span>
        <span style={{ fontSize: 29 }}>{text}</span>
      </div>
      {!last && (
        <div style={{ height: 34, display: "flex", justifyContent: "center", alignItems: "center", opacity: arrow }}>
          <span style={{ fontSize: 30, color: colors.muted }}>↓</span>
        </div>
      )}
    </div>
  );
};

export const PipelineScene: React.FC = () => (
  <>
    <Kicker color={colors.gold}>3 · The pipeline</Kicker>
    <Heading>A tested pipeline that runs every night</Heading>
    <div style={{ marginTop: 40 }}>
      {LAYERS.map((l, i) => (
        <Layer key={l.name} {...l} delay={14 + i * 22} last={i === LAYERS.length - 1} />
      ))}
    </div>
    <div style={{ display: "flex", gap: 14, marginTop: 30, flexWrap: "wrap" }}>
      {TOOLS.map((tool, i) => (
        <ToolChip key={tool} label={tool} delay={110 + i * 8} />
      ))}
    </div>
    <Caption delay={150}>Running a night again never creates duplicates.</Caption>
  </>
);

const ToolChip: React.FC<{ label: string; delay: number }> = ({ label, delay }) => {
  const t = useIn(delay);
  return (
    <span
      style={{
        fontSize: 25,
        fontWeight: 600,
        padding: "10px 18px",
        borderRadius: 99,
        border: `2px solid ${colors.cardBorder}`,
        background: "#0b1220",
        opacity: t,
      }}
    >
      {label}
    </span>
  );
};

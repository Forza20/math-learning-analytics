import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { useIn } from "../components";
import { colors } from "../theme";

const STACK = ["PostgreSQL", "Python", "dbt", "SQL", "GitHub Actions", "Chart.js"];

export const OutroScene: React.FC = () => {
  const title = useIn(4);
  const stack = useIn(18);
  const link = useIn(36);
  const role = useIn(54);

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: 80 }}>
      <div
        style={{
          fontSize: 80,
          fontWeight: 800,
          lineHeight: 1.08,
          opacity: title,
          transform: `translateY(${interpolate(title, [0, 1], [24, 0])}px)`,
        }}
      >
        Math Learning Analytics
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 36, opacity: stack }}>
        {STACK.map((s) => (
          <span
            key={s}
            style={{
              fontSize: 28,
              fontWeight: 600,
              padding: "10px 20px",
              borderRadius: 99,
              border: `2px solid ${colors.cardBorder}`,
              background: colors.card,
            }}
          >
            {s}
          </span>
        ))}
      </div>

      <div style={{ marginTop: 64, opacity: link }}>
        <div style={{ fontSize: 28, color: colors.muted }}>Play the game, see the dashboard and the code</div>
        <div style={{ fontSize: 40, fontWeight: 700, color: colors.blue, marginTop: 8 }}>
          forza20.github.io/math-learning-analytics
        </div>
      </div>

      <div style={{ marginTop: 64, fontSize: 36, fontWeight: 700, color: colors.gold, opacity: role }}>
        Looking for a role as data engineer or BI developer
      </div>
    </AbsoluteFill>
  );
};

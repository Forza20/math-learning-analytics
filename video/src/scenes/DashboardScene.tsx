import React from "react";
import { Caption, Card, Heading, Kicker, useIn } from "../components";
import { colors } from "../theme";

// From the live dashboard (gold.mart_times_tables, simulated players, 2026-11-20).
const TABLES: [number, number][] = [
  [2, 0.93], [3, 0.83], [4, 0.86], [5, 0.79], [6, 0.74], [7, 0.71], [8, 0.72], [9, 0.72], [10, 0.75],
];
const KPIS: [string, string][] = [
  ["16,016", "answers"],
  ["1,812", "rounds"],
  ["42", "days of data"],
];
const HARD = new Set([7, 8, 9]);
const CHART_H = 300;
const Y_MIN = 0.5; // axis starts at 50% so the differences are visible; labelled below

const Bar: React.FC<{ table: number; rate: number; delay: number }> = ({ table, rate, delay }) => {
  const grow = useIn(delay);
  const h = ((rate - Y_MIN) / (1 - Y_MIN)) * CHART_H * grow;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ fontSize: 22, color: colors.muted, marginBottom: 6, opacity: grow }}>{Math.round(rate * 100)}%</div>
      <div
        style={{
          width: "100%",
          height: h,
          background: HARD.has(table) ? colors.orange : colors.blue,
          borderRadius: "6px 6px 0 0",
        }}
      />
    </div>
  );
};

export const DashboardScene: React.FC = () => {
  return (
    <>
      <Kicker color={colors.aqua}>5 · The dashboard</Kicker>
      <Heading>What the data shows</Heading>

      <div style={{ display: "flex", gap: 18, marginTop: 36 }}>
        {KPIS.map(([value, label], i) => (
          <Kpi key={label} value={value} label={label} delay={10 + i * 6} />
        ))}
      </div>

      <Card style={{ marginTop: 26, padding: "26px 30px 18px" }}>
        <div style={{ fontSize: 28, fontWeight: 700 }}>Correct answers per times table</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height: CHART_H, marginTop: 20 }}>
          {TABLES.map(([table, rate], i) => (
            <Bar key={table} table={table} rate={rate} delay={30 + i * 5} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 18, borderTop: `2px solid ${colors.cardBorder}`, paddingTop: 8 }}>
          {TABLES.map(([table]) => (
            <div key={table} style={{ flex: 1, textAlign: "center", fontSize: 24, color: colors.muted }}>
              {table}×
            </div>
          ))}
        </div>
        <div style={{ fontSize: 18, color: colors.muted, marginTop: 8 }}>Axis from 50% · Easy level · simulated players</div>
      </Card>

      <Caption delay={120}>The 7, 8 and 9 times tables trip players up most.</Caption>
    </>
  );
};

const Kpi: React.FC<{ value: string; label: string; delay: number }> = ({ value, label, delay }) => {
  const t = useIn(delay);
  return (
    <Card style={{ flex: 1, padding: "18px 24px", opacity: t }}>
      <div style={{ fontSize: 46, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 24, color: colors.muted }}>{label}</div>
    </Card>
  );
};

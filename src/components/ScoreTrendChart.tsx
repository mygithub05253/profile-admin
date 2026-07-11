"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export interface ScorePoint {
  date: string;
  score: number;
}

export function ScoreTrendChart({ points }: { points: ScorePoint[] }) {
  if (points.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={points} margin={{ left: 0, right: 16, top: 16, bottom: 4 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={28} />
        <Tooltip />
        <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

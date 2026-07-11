"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export interface ChartSegment {
  label: string;
  count: number;
  colorClass: string; // 레거시 필드 — recharts 전환 후에도 호출부 호환을 위해 유지, hex로 매핑
}

// bg-{color}-500 형태 Tailwind 클래스를 recharts용 hex로 매핑
const COLOR_HEX: Record<string, string> = {
  "bg-blue-500": "#3b82f6",
  "bg-green-500": "#22c55e",
  "bg-green-600": "#16a34a",
  "bg-purple-500": "#a855f7",
  "bg-amber-500": "#f59e0b",
  "bg-pink-500": "#ec4899",
  "bg-cyan-500": "#06b6d4",
  "bg-black/25 dark:bg-white/25": "#9ca3af",
  "bg-black/20 dark:bg-white/20": "#9ca3af",
};

function toHex(colorClass: string): string {
  return COLOR_HEX[colorClass] ?? "#9ca3af";
}

export function StackedBarChart({ segments }: { segments: ChartSegment[] }) {
  const data = segments.map((s) => ({ name: s.label, count: s.count, fill: toHex(s.colorClass) }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip cursor={{ fill: "transparent" }} />
          <Bar dataKey="count" radius={4} barSize={20}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: toHex(s.colorClass) }} />
            {s.label} {s.count}
          </span>
        ))}
      </div>
    </div>
  );
}

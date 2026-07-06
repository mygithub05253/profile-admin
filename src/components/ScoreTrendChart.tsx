export interface ScorePoint {
  date: string;
  score: number;
}

const WIDTH = 600;
const HEIGHT = 160;
const PAD_X = 24;
const PAD_Y = 20;

// 순수 SVG 라인 차트 — 평가 점수 추이(0~100)를 보여준다 (차트 라이브러리 미사용)
export function ScoreTrendChart({ points }: { points: ScorePoint[] }) {
  if (points.length === 0) return null;

  const xStep = points.length > 1 ? (WIDTH - PAD_X * 2) / (points.length - 1) : 0;
  const xFor = (i: number) => PAD_X + i * xStep;
  const yFor = (score: number) => HEIGHT - PAD_Y - (score / 100) * (HEIGHT - PAD_Y * 2);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.score)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="평가 점수 추이 그래프">
      <line
        x1={PAD_X}
        y1={yFor(100)}
        x2={WIDTH - PAD_X}
        y2={yFor(100)}
        className="stroke-black/10 dark:stroke-white/15"
        strokeWidth={1}
      />
      <line
        x1={PAD_X}
        y1={yFor(0)}
        x2={WIDTH - PAD_X}
        y2={yFor(0)}
        className="stroke-black/10 dark:stroke-white/15"
        strokeWidth={1}
      />
      {points.length > 1 && <path d={path} fill="none" className="stroke-green-500" strokeWidth={2} />}
      {points.map((p, i) => (
        <g key={p.date}>
          <circle cx={xFor(i)} cy={yFor(p.score)} r={4} className="fill-green-500" />
          <text x={xFor(i)} y={yFor(p.score) - 10} textAnchor="middle" className="fill-black/60 text-[11px] dark:fill-white/60">
            {p.score}
          </text>
          <text x={xFor(i)} y={HEIGHT - 4} textAnchor="middle" className="fill-black/40 text-[10px] dark:fill-white/40">
            {p.date}
          </text>
        </g>
      ))}
    </svg>
  );
}

export interface ChartSegment {
  label: string;
  count: number;
  colorClass: string; // 예: "bg-green-500"
}

// 순수 CSS 가로 막대 차트 — 차트 라이브러리 추가 없이 상태 분포를 한눈에 보여준다
export function StackedBarChart({ segments }: { segments: ChartSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        {total === 0 ? null : (
          segments.map(
            (s) =>
              s.count > 0 && (
                <div
                  key={s.label}
                  className={s.colorClass}
                  style={{ width: `${(s.count / total) * 100}%` }}
                  title={`${s.label}: ${s.count}`}
                />
              )
          )
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/60 dark:text-white/60">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${s.colorClass}`} />
            {s.label} {s.count}
          </span>
        ))}
      </div>
    </div>
  );
}

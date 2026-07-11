import { listUxScoreHistory } from "@/lib/ux-scores";
import { StatusBadge } from "@/components/StatusBadge";
import { ScoreTrendChart } from "@/components/ScoreTrendChart";
import { DataTable, type DataTableColumn } from "@/components/DataTable";

export const dynamic = "force-dynamic";

const SOURCE_LABELS: Record<string, string> = {
  "claude-review": "Claude 검토",
  "perplexity-research": "Perplexity 리서치",
  "web-benchmark": "웹 벤치마킹",
  manual: "직접 평가",
};

const SEVERITY_LABELS: Record<string, string> = { low: "낮음", medium: "보통", high: "높음" };
const FINDING_STATUS_LABELS: Record<string, string> = { open: "미해결", resolved: "해결됨" };

function scoreBarColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

// UX/제품 품질 평가 추적 (신규, 세션 13 사용자 요청) — 웹 벤치마킹·Perplexity 리서치·직접 사용
// 피드백을 바탕으로 한 평가를 content-hub data/ux-scores.yml에 누적 기록하고 여기서 추이를 본다
export default async function EvaluationPage() {
  const history = await listUxScoreHistory();
  const latest = history[history.length - 1];

  const findings = history
    .flatMap((entry) => entry.findings.map((finding) => ({ ...finding, date: entry.date })))
    .sort((a, b) => (a.status === b.status ? b.date.localeCompare(a.date) : a.status === "open" ? -1 : 1));

  const columns: DataTableColumn<(typeof findings)[number]>[] = [
    { key: "area", header: "영역", cell: (f) => f.area },
    {
      key: "severity",
      header: "심각도",
      cell: (f) => <StatusBadge label={SEVERITY_LABELS[f.severity] ?? f.severity} tone={f.severity} />,
    },
    { key: "issue", header: "이슈", cell: (f) => f.issue },
    { key: "suggestion", header: "제안", cell: (f) => <span className="text-muted-foreground">{f.suggestion}</span> },
    {
      key: "status",
      header: "상태",
      cell: (f) => <StatusBadge label={FINDING_STATUS_LABELS[f.status] ?? f.status} tone={f.status} />,
    },
    { key: "date", header: "평가일", cell: (f) => <span className="text-muted-foreground">{f.date}</span> },
  ];

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="mb-1 text-lg font-semibold">Evaluation</h1>
        <p className="text-sm text-black/50 dark:text-white/50">
          웹 벤치마킹·Perplexity 리서치·직접 사용 피드백을 바탕으로 한 UX/제품 품질 평가 이력입니다.
        </p>
      </div>

      {latest ? (
        <section className="rounded-lg border border-black/10 p-6 dark:border-white/15">
          <p className="text-xs text-black/50 dark:text-white/50">최근 종합 점수</p>
          <p className="mt-1 text-4xl font-semibold">
            {latest.overallScore}
            <span className="text-lg font-normal text-black/40 dark:text-white/40">/100</span>
          </p>
          <div className="mt-3 h-2 w-full rounded-full bg-black/5 dark:bg-white/10">
            <div className={`h-2 rounded-full ${scoreBarColor(latest.overallScore)}`} style={{ width: `${latest.overallScore}%` }} />
          </div>
          <p className="mt-4 text-sm text-black/70 dark:text-white/70">{latest.summary}</p>
          <p className="mt-2 text-xs text-black/40 dark:text-white/40">
            {SOURCE_LABELS[latest.source] ?? latest.source} · {latest.date}
          </p>
        </section>
      ) : (
        <p className="text-sm text-black/40 dark:text-white/40">평가 이력이 없습니다.</p>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold">점수 추이</h2>
        {history.length > 1 ? (
          <ScoreTrendChart points={history.map((h) => ({ date: h.date, score: h.overallScore }))} />
        ) : (
          <p className="text-xs text-black/40 dark:text-white/40">평가가 2건 이상 쌓이면 추이 그래프가 표시됩니다.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">발견사항 ({findings.length})</h2>
        <DataTable
          columns={columns}
          data={findings}
          rowKey={(f, i) => `${f.date}-${i}`}
          emptyState="발견사항이 없습니다"
        />
      </section>
    </div>
  );
}

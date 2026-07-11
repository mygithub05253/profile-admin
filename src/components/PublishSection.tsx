import { StatCard } from "./StatCard";
import { AnalyticsError } from "./AnalyticsStatus";
import { StackedBarChart } from "./StackedBarChart";
import { StatusBadge, statusDotClass } from "./StatusBadge";
import type { AdminPrSummary, PostStatusRow, WorkflowRunSummary } from "@/lib/dashboard";

const WORKFLOW_LABELS: Record<string, string> = {
  "velog-publish": "velog 발행",
  "deploy-site": "사이트 배포",
  "blog-post": "README 최신글",
};

const CONCLUSION_LABELS: Record<string, string> = {
  success: "성공",
  failure: "실패",
  cancelled: "취소",
  skipped: "건너뜀",
  action_required: "승인 대기",
};

const PR_STATE_LABELS: Record<string, string> = {
  open: "열림",
  merged: "병합됨",
  closed: "닫힘(미병합)",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-black/25 dark:bg-white/25",
  ready: "bg-amber-500",
  published: "bg-green-500",
  synced: "bg-green-600",
};

interface PublishSectionProps {
  runs: WorkflowRunSummary[];
  posts: PostStatusRow[];
  prs: AdminPrSummary[];
  runsFailed: boolean;
  postsFailed: boolean;
  prsFailed: boolean;
}

// 기존 /dashboard 발행 섹션(FR-M20) — 세션 14에서 page.tsx 밖으로 추출해 탭 조립을 단순화
export function PublishSection({ runs, posts, prs, runsFailed, postsFailed, prsFailed }: PublishSectionProps) {
  const workflows = Object.keys(WORKFLOW_LABELS);

  const exposedCount = posts.filter((p) => p.siteExposed).length;
  const velogCount = posts.filter((p) => p.hasVelogUrl).length;
  const completedRuns = runs.filter((r) => r.status === "completed" && r.conclusion);
  const successRuns = completedRuns.filter((r) => r.conclusion === "success");
  const successRate = completedRuns.length > 0 ? Math.round((successRuns.length / completedRuns.length) * 100) : null;

  const statusCounts = ["draft", "ready", "published", "synced"].map((status) => ({
    label: status,
    count: posts.filter((p) => p.status === status).length,
    colorClass: STATUS_COLORS[status],
  }));

  return (
    <div className="grid gap-8">
      <section>
        <h1 className="mb-4 text-lg font-semibold">Dashboard</h1>
        {postsFailed && <AnalyticsError label="글 상태" />}
        {runsFailed && <AnalyticsError label="워크플로 실행 이력" />}
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <StatCard label="총 글" value={`${posts.length}개`} />
          <StatCard label="사이트 노출" value={`${exposedCount}개`} sub={ratioText(exposedCount, posts.length)} />
          <StatCard label="velog 발행 완료" value={`${velogCount}개`} sub={ratioText(velogCount, posts.length)} />
          <StatCard
            label="최근 워크플로 성공률"
            value={successRate === null ? "-" : `${successRate}%`}
            sub={`최근 ${completedRuns.length}건 기준`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">워크플로 실행 이력</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {workflows.map((workflow) => {
            const workflowRuns = runs.filter((run) => run.workflow === workflow);
            const latest = workflowRuns[0];
            const history = [...workflowRuns].reverse();

            return (
              <div key={workflow} className="rounded-lg border border-black/10 p-4 dark:border-white/15">
                <h3 className="mb-2 text-sm font-semibold">{WORKFLOW_LABELS[workflow]}</h3>

                {latest ? (
                  <div className="mb-3 flex items-center gap-2">
                    <StatusBadge
                      label={
                        latest.status === "completed"
                          ? (CONCLUSION_LABELS[latest.conclusion ?? ""] ?? latest.conclusion ?? "-")
                          : "진행 중"
                      }
                      tone={latest.status === "completed" ? (latest.conclusion ?? "unknown") : "in_progress"}
                    />
                    <span className="text-xs text-black/40 dark:text-white/40">
                      {new Date(latest.createdAt).toLocaleString("ko-KR")}
                    </span>
                  </div>
                ) : (
                  <p className="mb-3 text-xs text-black/40 dark:text-white/40">실행 이력 없음</p>
                )}

                <div className="flex gap-1">
                  {history.map((run) => (
                    <a
                      key={run.htmlUrl}
                      href={run.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      title={`#${run.runNumber} · ${run.conclusion ?? run.status} · ${new Date(run.createdAt).toLocaleString("ko-KR")}`}
                      className={`block h-4 w-4 shrink-0 rounded-sm ${statusDotClass(run.status === "completed" ? (run.conclusion ?? "unknown") : "in_progress")}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">글 상태 분포</h2>
        <StackedBarChart segments={statusCounts} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">글별 상태 ({posts.length})</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-black/50 dark:border-white/15 dark:text-white/50">
              <th className="py-2 font-normal">제목</th>
              <th className="py-2 font-normal">status</th>
              <th className="py-2 font-normal">velog_url</th>
              <th className="py-2 font-normal">사이트 노출</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.slug} className="border-b border-black/5 dark:border-white/10">
                <td className="py-2">{post.title}</td>
                <td className="py-2">
                  <StatusBadge label={post.status} tone={post.status} />
                </td>
                <td className="py-2">{post.hasVelogUrl ? "O" : "-"}</td>
                <td className="py-2">{post.siteExposed ? "O" : "-"}</td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-black/40 dark:text-white/40">
                  게시글이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">admin PR 이력 ({prs.length})</h2>
        {prsFailed && <AnalyticsError label="admin PR 이력" />}
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-black/50 dark:border-white/15 dark:text-white/50">
              <th className="py-2 font-normal">제목</th>
              <th className="py-2 font-normal">브랜치</th>
              <th className="py-2 font-normal">상태</th>
              <th className="py-2 font-normal">생성일</th>
            </tr>
          </thead>
          <tbody>
            {prs.map((pr) => (
              <tr key={pr.number} className="border-b border-black/5 dark:border-white/10">
                <td className="py-2">
                  <a href={pr.htmlUrl} target="_blank" rel="noreferrer" className="hover:underline">
                    #{pr.number} {pr.title}
                  </a>
                </td>
                <td className="py-2 text-black/50 dark:text-white/50">{pr.branch}</td>
                <td className="py-2">
                  <StatusBadge label={PR_STATE_LABELS[pr.state]} tone={pr.state} />
                </td>
                <td className="py-2 text-black/50 dark:text-white/50">
                  {new Date(pr.createdAt).toLocaleDateString("ko-KR")}
                </td>
              </tr>
            ))}
            {prs.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-black/40 dark:text-white/40">
                  PR 이력이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ratioText(count: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

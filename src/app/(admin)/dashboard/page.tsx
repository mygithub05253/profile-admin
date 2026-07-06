import { listAdminPullRequests, listPostsStatusMatrix, listRecentWorkflowRuns } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

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

// A-05 발행 대시보드 (FR-M20, P2)
export default async function DashboardPage() {
  const [runs, posts, prs] = await Promise.all([
    listRecentWorkflowRuns(),
    listPostsStatusMatrix(),
    listAdminPullRequests(),
  ]);

  const workflows = Object.keys(WORKFLOW_LABELS);

  return (
    <div className="grid gap-8">
      <section>
        <h1 className="mb-4 text-lg font-semibold">Dashboard</h1>
        <div className="grid gap-4 sm:grid-cols-3">
          {workflows.map((workflow) => {
            const workflowRuns = runs.filter((run) => run.workflow === workflow);
            return (
              <div key={workflow} className="rounded-lg border border-black/10 p-4 dark:border-white/15">
                <h2 className="mb-3 text-sm font-semibold">{WORKFLOW_LABELS[workflow]}</h2>
                <ul className="flex flex-col gap-2 text-xs">
                  {workflowRuns.map((run) => (
                    <li key={run.htmlUrl} className="flex items-center justify-between gap-2">
                      <span
                        className={
                          run.conclusion === "failure"
                            ? "font-medium text-red-500"
                            : "text-black/60 dark:text-white/60"
                        }
                      >
                        {run.status === "completed"
                          ? (CONCLUSION_LABELS[run.conclusion ?? ""] ?? run.conclusion)
                          : "진행 중"}
                      </span>
                      <span className="text-black/40 dark:text-white/40">
                        {new Date(run.createdAt).toLocaleString("ko-KR")}
                      </span>
                      <a href={run.htmlUrl} target="_blank" rel="noreferrer" className="shrink-0 underline">
                        로그
                      </a>
                    </li>
                  ))}
                  {workflowRuns.length === 0 && (
                    <li className="text-black/40 dark:text-white/40">실행 이력 없음</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
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
                <td className="py-2">{post.status}</td>
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
        <table className="w-full text-left text-sm">
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
                <td className="py-2">{PR_STATE_LABELS[pr.state]}</td>
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

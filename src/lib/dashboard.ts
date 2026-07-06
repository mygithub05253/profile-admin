import { getOctokit } from "./github/client";
import {
  CONTENT_HUB_OWNER,
  CONTENT_HUB_REPO,
  POSTS_DIR,
  PROFILE_README_OWNER,
  PROFILE_README_REPO,
} from "./github/config";
import { parseFrontmatter } from "./frontmatter";
import type { PostFrontmatter } from "./schema/post";

export interface WorkflowRunSummary {
  workflow: string;
  runNumber: number;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
  createdAt: string;
}

// 발행 대시보드가 추적하는 워크플로 3종 (FR-M20 §20 — velog-publish·deploy-site는 content-hub, blog-post는 프로필 README 레포)
const WATCHED_WORKFLOWS = [
  { owner: CONTENT_HUB_OWNER, repo: CONTENT_HUB_REPO, workflowId: "velog-publish.yml", label: "velog-publish" },
  { owner: CONTENT_HUB_OWNER, repo: CONTENT_HUB_REPO, workflowId: "deploy-site.yml", label: "deploy-site" },
  { owner: PROFILE_README_OWNER, repo: PROFILE_README_REPO, workflowId: "blog-post.yml", label: "blog-post" },
] as const;

const RUNS_PER_WORKFLOW = 3;

// 워크플로 3종 최근 실행 이력 (FR-M20, A-05 상단 카드)
export async function listRecentWorkflowRuns(): Promise<WorkflowRunSummary[]> {
  const octokit = getOctokit();
  const results = await Promise.all(
    WATCHED_WORKFLOWS.map(async ({ owner, repo, workflowId, label }) => {
      const { data } = await octokit.actions.listWorkflowRuns({
        owner,
        repo,
        workflow_id: workflowId,
        per_page: RUNS_PER_WORKFLOW,
      });
      return data.workflow_runs.map(
        (run) =>
          ({
            workflow: label,
            runNumber: run.run_number,
            status: run.status ?? "unknown",
            conclusion: run.conclusion,
            htmlUrl: run.html_url,
            createdAt: run.created_at,
          }) satisfies WorkflowRunSummary
      );
    })
  );
  return results.flat();
}

export interface PostStatusRow {
  slug: string;
  title: string;
  status: string;
  hasVelogUrl: boolean;
  siteExposed: boolean;
}

// posts/ 상태 매트릭스 — status × velog_url 유무 × 사이트 노출 여부 (FR-M20 §20, lib/posts.ts 노출 조건과 동일)
export async function listPostsStatusMatrix(): Promise<PostStatusRow[]> {
  const octokit = getOctokit();
  const { data } = await octokit.repos.getContent({
    owner: CONTENT_HUB_OWNER,
    repo: CONTENT_HUB_REPO,
    path: POSTS_DIR,
  });
  if (!Array.isArray(data)) return [];
  const files = data.filter((item) => item.type === "file" && item.name.endsWith(".md"));

  return Promise.all(
    files.map(async (file) => {
      const { data: content } = await octokit.repos.getContent({
        owner: CONTENT_HUB_OWNER,
        repo: CONTENT_HUB_REPO,
        path: file.path,
      });
      if (Array.isArray(content) || content.type !== "file" || typeof content.content !== "string") {
        throw new Error(`예상치 못한 콘텐츠 형식: ${file.path}`);
      }
      const raw = Buffer.from(content.content, "base64").toString("utf-8");
      const { frontmatter } = parseFrontmatter(raw);
      const fm = frontmatter as PostFrontmatter;
      return {
        slug: fm.slug,
        title: fm.title,
        status: fm.status,
        hasVelogUrl: Boolean(fm.velog_url),
        siteExposed: fm.visibility === "public" && (fm.status === "published" || fm.status === "synced"),
      } satisfies PostStatusRow;
    })
  );
}

export interface AdminPrSummary {
  number: number;
  title: string;
  htmlUrl: string;
  branch: string;
  state: "open" | "merged" | "closed";
  createdAt: string;
}

const ADMIN_PR_LIMIT = 15;

// admin발 PR(브랜치 접두 admin/) 최근 이력 — CI/병합 상태 (FR-M20 D-2 (b)안)
export async function listAdminPullRequests(): Promise<AdminPrSummary[]> {
  const octokit = getOctokit();
  const { data } = await octokit.pulls.list({
    owner: CONTENT_HUB_OWNER,
    repo: CONTENT_HUB_REPO,
    state: "all",
    sort: "created",
    direction: "desc",
    per_page: 50,
  });

  return data
    .filter((pr) => pr.head.ref.startsWith("admin/"))
    .slice(0, ADMIN_PR_LIMIT)
    .map(
      (pr) =>
        ({
          number: pr.number,
          title: pr.title,
          htmlUrl: pr.html_url,
          branch: pr.head.ref,
          state: pr.merged_at ? "merged" : pr.state === "closed" ? "closed" : "open",
          createdAt: pr.created_at,
        }) satisfies AdminPrSummary
    );
}

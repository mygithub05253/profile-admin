import type { Octokit } from "@octokit/rest";
import { getOctokit } from "./client";
import { BASE_BRANCH, CONTENT_HUB_OWNER, CONTENT_HUB_REPO } from "./config";
import { sleep } from "../sleep";

export interface FileUpsert {
  path: string;
  content: string; // UTF-8 원문 (base64 인코딩은 내부에서 처리)
}

export interface CommitAndPrOptions {
  branch: string;
  upserts?: FileUpsert[];
  deletions?: string[];
  commitMessage: string;
  prTitle: string;
  prBody?: string;
}

export interface CommitAndPrResult {
  prUrl: string;
  prNumber: number;
  branch: string;
}

const RETRY_DELAYS_MS = [200, 400, 800]; // §21: 지수 백오프 3회

// content-hub에 브랜치→Git Database API 원자 커밋(blob→tree→commit→ref)→PR→auto-merge까지
// 한 번에 수행한다 (관리자 기능명세서 §17 Step 5, API 명세서 §3.2.1·§3.2.2).
export async function commitFilesAndOpenPR(options: CommitAndPrOptions): Promise<CommitAndPrResult> {
  const octokit = getOctokit();

  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await attemptCommitAndPr(octokit, options);
    } catch (err) {
      lastError = err;
      if (!isRetryableRefError(err) || attempt === RETRY_DELAYS_MS.length) {
        throw err;
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastError;
}

function isRetryableRefError(err: unknown): boolean {
  const status = (err as { status?: number } | undefined)?.status;
  // 422 = ref 논-fast-forward, 409 = 리소스 충돌 — Git Database API 경로의 sha 충돌 신호(§21)
  return status === 422 || status === 409;
}

async function attemptCommitAndPr(
  octokit: Octokit,
  { branch, upserts = [], deletions = [], commitMessage, prTitle, prBody }: CommitAndPrOptions
): Promise<CommitAndPrResult> {
  const owner = CONTENT_HUB_OWNER;
  const repo = CONTENT_HUB_REPO;

  // sha는 항상 직전 조회에서만 취득한다 — 캐시 재사용 금지(§21)
  const { data: baseRef } = await octokit.git.getRef({ owner, repo, ref: `heads/${BASE_BRANCH}` });
  const baseSha = baseRef.object.sha;

  const { data: baseCommit } = await octokit.git.getCommit({ owner, repo, commit_sha: baseSha });
  const baseTreeSha = baseCommit.tree.sha;

  await ensureBranch(octokit, owner, repo, branch, baseSha);

  const upsertItems = await Promise.all(
    upserts.map(async (file) => {
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo,
        content: Buffer.from(file.content, "utf-8").toString("base64"),
        encoding: "base64",
      });
      return { path: file.path, mode: "100644" as const, type: "blob" as const, sha: blob.sha };
    })
  );
  const deletionItems = deletions.map((path) => ({
    path,
    mode: "100644" as const,
    type: "blob" as const,
    sha: null,
  }));

  // base_tree 지정 필수 — 생략 시 기존 파일 전삭제(R-1)
  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: [...upsertItems, ...deletionItems],
  });

  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message: commitMessage,
    tree: newTree.sha,
    parents: [baseSha],
  });

  await octokit.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: newCommit.sha, force: false });

  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    title: prTitle,
    head: branch,
    base: BASE_BRANCH,
    body: prBody ?? "",
  });

  await enableAutoMerge(octokit, pr.node_id);

  return { prUrl: pr.html_url, prNumber: pr.number, branch };
}

async function ensureBranch(octokit: Octokit, owner: string, repo: string, branch: string, baseSha: string) {
  try {
    await octokit.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: baseSha });
  } catch (err) {
    const status = (err as { status?: number } | undefined)?.status;
    if (status === 422) {
      // 동일 브랜치명이 이미 존재 — 타임스탬프 접미로 실충돌은 희박, 최신 base로 재설정 후 진행
      await octokit.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: baseSha, force: true });
      return;
    }
    throw err;
  }
}

// REST 불가 — GraphQL PR node_id 기반 mutation 필수(D-2)
async function enableAutoMerge(octokit: Octokit, pullRequestId: string) {
  await octokit.graphql(
    `mutation($pullRequestId: ID!) {
      enablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId, mergeMethod: SQUASH }) {
        pullRequest { id }
      }
    }`,
    { pullRequestId }
  );
}

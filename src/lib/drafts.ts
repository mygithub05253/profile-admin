import { getOctokit } from "./github/client";
import { CONTENT_HUB_OWNER, CONTENT_HUB_REPO, DRAFTS_DIR, POSTS_DIR } from "./github/config";
import { commitFilesAndOpenPR } from "./github/atomic-commit";
import { parseFrontmatter, stringifyFrontmatter } from "./frontmatter";
import type { PostFrontmatter, DraftListItem } from "./schema/post";
import { NotFoundError, ShaConflictError } from "./errors";
import { sleep } from "./sleep";

export interface DraftRecord {
  frontmatter: PostFrontmatter;
  body: string;
  sha: string;
}

function draftPath(slug: string): string {
  return `${DRAFTS_DIR}/${slug}.md`;
}

function postPath(slug: string): string {
  return `${POSTS_DIR}/${slug}.md`;
}

// content-hub drafts/{slug}.md 단건 조회 (FR-M19, A-04 편집 진입)
export async function getDraft(slug: string): Promise<DraftRecord | null> {
  const octokit = getOctokit();
  try {
    const { data } = await octokit.repos.getContent({
      owner: CONTENT_HUB_OWNER,
      repo: CONTENT_HUB_REPO,
      path: draftPath(slug),
    });
    if (Array.isArray(data) || data.type !== "file" || typeof data.content !== "string") {
      throw new Error(`예상치 못한 콘텐츠 형식: ${draftPath(slug)}`);
    }
    const raw = Buffer.from(data.content, "base64").toString("utf-8");
    const { frontmatter, body } = parseFrontmatter(raw);
    return { frontmatter: frontmatter as PostFrontmatter, body, sha: data.sha };
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

// drafts/ 목록 조회 (FR-M19, A-04)
export async function listDrafts(): Promise<DraftListItem[]> {
  const octokit = getOctokit();
  const { data } = await octokit.repos.getContent({
    owner: CONTENT_HUB_OWNER,
    repo: CONTENT_HUB_REPO,
    path: DRAFTS_DIR,
  });
  if (!Array.isArray(data)) return [];
  const files = data.filter((item) => item.type === "file" && item.name.endsWith(".md"));

  return Promise.all(
    files.map(async (file) => {
      const [{ data: content }, { data: commits }] = await Promise.all([
        octokit.repos.getContent({ owner: CONTENT_HUB_OWNER, repo: CONTENT_HUB_REPO, path: file.path }),
        octokit.repos.listCommits({
          owner: CONTENT_HUB_OWNER,
          repo: CONTENT_HUB_REPO,
          path: file.path,
          per_page: 1,
        }),
      ]);
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
        source: fm.source,
        date: fm.date,
        updatedAt: commits[0]?.commit.committer?.date ?? "",
      } satisfies DraftListItem;
    })
  );
}

export interface SaveDraftResult {
  prUrl: string;
}

// 편집 저장 — drafts/{slug}.md 그대로 갱신 (낙관적 잠금 FR-M21)
export async function updateDraft(
  slug: string,
  frontmatter: PostFrontmatter,
  body: string,
  expectedSha: string
): Promise<SaveDraftResult> {
  await checkShaOrConflict(slug, expectedSha);

  const raw = stringifyFrontmatter(frontmatter, body);
  const branch = `admin/draft-${slug}-${Date.now()}`;
  const { prUrl } = await commitFilesAndOpenPR({
    branch,
    upserts: [{ path: draftPath(slug), content: raw }],
    commitMessage: `admin: update draft ${slug}`,
    prTitle: `admin: update draft ${slug}`,
    prBody: "profile-admin에서 자동 생성된 PR입니다. CI(frontmatter 검증) 통과 시 자동 병합됩니다.",
  });
  return { prUrl };
}

// 발행 준비 (FR-M19, A-04) — drafts/{slug}.md → posts/{slug}.md 이동 + status: ready 승격
// 이 PR이 병합되어 main에 push되면 velog-publish.yml이 status: ready 글을 실제 velog에 발행한다
export async function promoteDraft(
  slug: string,
  frontmatter: PostFrontmatter,
  body: string,
  expectedSha: string
): Promise<SaveDraftResult> {
  await checkShaOrConflict(slug, expectedSha);

  const promoted: PostFrontmatter = { ...frontmatter, status: "ready" };
  const raw = stringifyFrontmatter(promoted, body);
  const branch = `admin/promote-${slug}-${Date.now()}`;
  const { prUrl } = await commitFilesAndOpenPR({
    branch,
    upserts: [{ path: postPath(slug), content: raw }],
    deletions: [draftPath(slug)],
    commitMessage: `admin: promote draft ${slug} to ready`,
    prTitle: `admin: ${slug} 발행 준비 (ready 승격)`,
    prBody: "profile-admin에서 발행 준비 처리된 PR입니다. 병합 시 velog 자동 발행 파이프라인이 트리거됩니다.",
  });
  return { prUrl };
}

const CONFLICT_RETRY_DELAYS_MS = [0, 200, 400, 800]; // §21: 최신 sha 재조회 + 지수 백오프 3회

async function checkShaOrConflict(slug: string, expectedSha: string): Promise<DraftRecord> {
  let latest: DraftRecord | null = null;
  for (const delay of CONFLICT_RETRY_DELAYS_MS) {
    if (delay) await sleep(delay);
    latest = await getDraft(slug);
    if (!latest) throw new NotFoundError(`초안을 찾을 수 없습니다: ${slug}`);
    if (latest.sha === expectedSha) return latest;
  }
  throw new ShaConflictError(`저장 충돌: 최신 버전과 다릅니다 (slug: ${slug})`, latest!);
}

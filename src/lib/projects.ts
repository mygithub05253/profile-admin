import { getOctokit } from "./github/client";
import { ASSETS_DIR, CONTENT_HUB_OWNER, CONTENT_HUB_REPO, PROJECTS_DIR } from "./github/config";
import { commitFilesAndOpenPR, type FileUpsert } from "./github/atomic-commit";
import { parseFrontmatter, stringifyFrontmatter } from "./frontmatter";
import type { ProjectFrontmatter, ProjectImageUpload, ProjectListItem } from "./schema/project";
import { NotFoundError, ShaConflictError, SlugConflictError, SlugImmutableError } from "./errors";
import { sleep } from "./sleep";

export interface ProjectRecord {
  frontmatter: ProjectFrontmatter;
  body: string;
  sha: string;
}

function projectPath(slug: string): string {
  return `${PROJECTS_DIR}/${slug}.mdx`;
}

// FR-M22: assets/{slug}/{filename} — 본문·썸네일과 같은 커밋에 포함(§22 R-3)
function imageUpserts(slug: string, images: ProjectImageUpload[] = []): FileUpsert[] {
  return images.map((image) => ({
    path: `${ASSETS_DIR}/${slug}/${image.filename}`,
    content: image.content,
    encoding: "base64" as const,
  }));
}

// content-hub projects/{slug}.mdx 단건 조회 (FR-M17 §6.2 GET)
export async function getProject(slug: string): Promise<ProjectRecord | null> {
  const octokit = getOctokit();
  try {
    const { data } = await octokit.repos.getContent({
      owner: CONTENT_HUB_OWNER,
      repo: CONTENT_HUB_REPO,
      path: projectPath(slug),
    });
    if (Array.isArray(data) || data.type !== "file" || typeof data.content !== "string") {
      throw new Error(`예상치 못한 콘텐츠 형식: ${projectPath(slug)}`);
    }
    const raw = Buffer.from(data.content, "base64").toString("utf-8");
    const { frontmatter, body } = parseFrontmatter(raw);
    return { frontmatter: frontmatter as ProjectFrontmatter, body, sha: data.sha };
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

// projects/ 목록 조회 (FR-M17 §6.2 GET /api/projects, A-02)
export async function listProjects(): Promise<ProjectListItem[]> {
  const octokit = getOctokit();
  const { data } = await octokit.repos.getContent({
    owner: CONTENT_HUB_OWNER,
    repo: CONTENT_HUB_REPO,
    path: PROJECTS_DIR,
  });
  if (!Array.isArray(data)) return [];
  const files = data.filter((item) => item.type === "file" && item.name.endsWith(".mdx"));

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
      const fm = frontmatter as ProjectFrontmatter;
      return {
        slug: fm.slug,
        title: fm.title,
        category: fm.category,
        scope: fm.scope,
        status: fm.status,
        featured: fm.featured,
        updatedAt: commits[0]?.commit.committer?.date ?? "",
      } satisfies ProjectListItem;
    })
  );
}

export interface SaveProjectResult {
  prUrl: string;
}

// 신규 생성 (FR-M17 §6.2 POST /api/projects)
export async function createProject(
  frontmatter: ProjectFrontmatter,
  body: string,
  images: ProjectImageUpload[] = []
): Promise<SaveProjectResult> {
  const existing = await getProject(frontmatter.slug);
  if (existing) {
    throw new SlugConflictError(`slug '${frontmatter.slug}'가 이미 존재합니다`);
  }
  const raw = stringifyFrontmatter(frontmatter, body);
  const branch = `admin/${frontmatter.slug}-${Date.now()}`;
  const { prUrl } = await commitFilesAndOpenPR({
    branch,
    upserts: [{ path: projectPath(frontmatter.slug), content: raw }, ...imageUpserts(frontmatter.slug, images)],
    commitMessage: `admin: create project ${frontmatter.slug}`,
    prTitle: `admin: create project ${frontmatter.slug}`,
    prBody: "profile-admin에서 자동 생성된 PR입니다. CI(frontmatter 검증) 통과 시 자동 병합됩니다.",
  });
  return { prUrl };
}

// 수정 (FR-M17 §6.2 PUT /api/projects/[slug]) — slug 불변 + 낙관적 잠금(FR-M21)
export async function updateProject(
  slug: string,
  frontmatter: ProjectFrontmatter,
  body: string,
  expectedSha: string,
  images: ProjectImageUpload[] = []
): Promise<SaveProjectResult> {
  if (frontmatter.slug !== slug) {
    throw new SlugImmutableError("slug는 수정할 수 없습니다 (rename은 삭제 후 재생성)");
  }
  const current = await checkShaOrConflict(slug, expectedSha);

  const raw = stringifyFrontmatter(frontmatter, body);
  const branch = `admin/${slug}-${Date.now()}`;
  const { prUrl } = await commitFilesAndOpenPR({
    branch,
    upserts: [{ path: projectPath(slug), content: raw }, ...imageUpserts(slug, images)],
    commitMessage: `admin: update project ${slug}`,
    prTitle: `admin: update project ${slug}`,
    prBody: "profile-admin에서 자동 생성된 PR입니다. CI(frontmatter 검증) 통과 시 자동 병합됩니다.",
  });
  void current;
  return { prUrl };
}

// 삭제 (FR-M17 §6.2 DELETE /api/projects/[slug]) — 파괴 조작, slug 재입력 확인은 UI(A-02) 담당
export async function deleteProject(slug: string, expectedSha: string): Promise<SaveProjectResult> {
  await checkShaOrConflict(slug, expectedSha);

  const branch = `admin/${slug}-delete-${Date.now()}`;
  const { prUrl } = await commitFilesAndOpenPR({
    branch,
    deletions: [projectPath(slug)],
    commitMessage: `admin: delete project ${slug}`,
    prTitle: `admin: delete project ${slug}`,
    prBody: "profile-admin에서 자동 생성된 삭제 PR입니다. CI 통과 시 자동 병합됩니다.",
  });
  return { prUrl };
}

const CONFLICT_RETRY_DELAYS_MS = [0, 200, 400, 800]; // §21: 최신 sha 재조회 + 지수 백오프 3회

// FR-M21 낙관적 잠금 — 최신 sha와 비교, 불일치 시 재시도 후에도 다르면 진짜 충돌로 확정
async function checkShaOrConflict(slug: string, expectedSha: string): Promise<ProjectRecord> {
  let latest: ProjectRecord | null = null;
  for (const delay of CONFLICT_RETRY_DELAYS_MS) {
    if (delay) await sleep(delay);
    latest = await getProject(slug);
    if (!latest) throw new NotFoundError(`프로젝트를 찾을 수 없습니다: ${slug}`);
    if (latest.sha === expectedSha) return latest;
  }
  throw new ShaConflictError(`저장 충돌: 최신 버전과 다릅니다 (slug: ${slug})`, latest!);
}

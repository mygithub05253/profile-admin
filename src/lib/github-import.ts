import { remark } from "remark";
import { toString as mdastToString } from "mdast-util-to-string";
import { getOctokit } from "./github/client";

export interface GithubImportResult {
  title: string;
  slug: string;
  github: string;
  repoVisibility: "public" | "private";
  period: string;
  stack: string[];
  summary: string;
  // 참고용 배지 — scope 필드 자체는 관리자가 직접 선택(§10 Step 4)
  scopeHint: "personal" | "team";
}

export class RepoNotFoundError extends Error {}

// 언어 → 스택 후보 매핑(확정 아님, 관리자가 수정) — §10 Step 4
const LANGUAGE_STACK_MAP: Record<string, string> = {
  TypeScript: "Next.js",
  JavaScript: "Node.js",
  Python: "Python",
  Java: "Spring Boot",
  Kotlin: "Kotlin",
  Go: "Go",
  Rust: "Rust",
  Ruby: "Ruby on Rails",
  PHP: "Laravel",
  "C#": ".NET",
  Swift: "SwiftUI",
  Dart: "Flutter",
  HTML: "HTML/CSS",
};

// GitHub 레포 메타데이터 조회 → projects 폼 프리필 (FR-M10 §10 Step 5, 읽기 전용)
export async function importFromGithubRepo(input: string): Promise<GithubImportResult> {
  const parsed = parseOwnerRepo(input);
  if (!parsed) {
    throw new RepoNotFoundError(
      `저장소 형식이 올바르지 않습니다 (owner/repo 또는 GitHub URL 형태 필요): ${input}`
    );
  }
  const { owner, repo } = parsed;

  const octokit = getOctokit();

  const repoData = await (async () => {
    try {
      const { data } = await octokit.repos.get({ owner, repo });
      return data;
    } catch (err) {
      if ((err as { status?: number }).status === 404) {
        throw new RepoNotFoundError(`레포를 찾을 수 없습니다: ${owner}/${repo}`);
      }
      throw err;
    }
  })();

  const readmeParagraph = await tryGetReadmeFirstParagraph(octokit, owner, repo);
  const scopeHint = await tryGetScopeHint(octokit, owner, repo);

  const language = repoData.language ?? undefined;
  const topics = repoData.topics ?? [];
  const stack = [language ? LANGUAGE_STACK_MAP[language] ?? language : undefined, ...topics].filter(
    (v): v is string => Boolean(v)
  );

  return {
    title: repoData.name,
    slug: toKebabSlug(repoData.name),
    github: repoData.html_url,
    repoVisibility: repoData.private ? "private" : "public",
    period: formatPeriod(repoData.created_at, repoData.pushed_at),
    stack,
    // description 우선, 없으면 README 첫 문단 (§10 Step 4)
    summary: repoData.description ?? readmeParagraph ?? "",
    scopeHint,
  };
}

async function tryGetReadmeFirstParagraph(
  octokit: ReturnType<typeof getOctokit>,
  owner: string,
  repo: string
): Promise<string | undefined> {
  try {
    const { data } = await octokit.repos.getReadme({ owner, repo });
    if (!("content" in data) || !data.content) return undefined;
    const markdown = Buffer.from(data.content, "base64").toString("utf-8");
    return extractFirstParagraphAfterHeading(markdown);
  } catch {
    // README 없음/파싱 실패 — 빈 글보다 부실한 초안이 낫다는 원칙(§10 Step 6)
    return undefined;
  }
}

async function tryGetScopeHint(
  octokit: ReturnType<typeof getOctokit>,
  owner: string,
  repo: string
): Promise<"personal" | "team"> {
  try {
    const { data } = await octokit.repos.listCollaborators({ owner, repo });
    return data.length > 1 ? "team" : "personal";
  } catch {
    return "personal";
  }
}

// 마크다운 AST 파싱으로 첫 heading 다음 paragraph 노드를 추출 (정규식 아님 — §10 Step 4)
function extractFirstParagraphAfterHeading(markdown: string): string | undefined {
  const tree = remark().parse(markdown) as { children: Array<{ type: string }> };
  const headingIndex = tree.children.findIndex((node) => node.type === "heading");
  if (headingIndex === -1) return undefined;
  const paragraph = tree.children.slice(headingIndex + 1).find((node) => node.type === "paragraph");
  return paragraph ? mdastToString(paragraph).trim() : undefined;
}

// "owner/repo" 뿐 아니라 브라우저 주소창/클론 버튼에서 그대로 복사한 값도 받아들인다
// (https://github.com/owner/repo, .git 접미, git@github.com:owner/repo.git, 트레일링 슬래시 등)
function parseOwnerRepo(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim();

  const ssh = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (ssh) return { owner: ssh[1], repo: ssh[2] };

  const https = trimmed.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (https) return { owner: https[1], repo: https[2] };

  const plain = trimmed.match(/^([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/);
  if (plain) return { owner: plain[1], repo: plain[2] };

  return null;
}

function toKebabSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9가-힣.-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatPeriod(createdAt: string, pushedAt: string): string {
  const format = (iso: string) => {
    const date = new Date(iso);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
  };
  return `${format(createdAt)} ~ ${format(pushedAt)}`;
}

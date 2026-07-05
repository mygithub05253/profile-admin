import { NextRequest, NextResponse } from "next/server";
import { importFromGithubRepo, RepoNotFoundError } from "@/lib/github-import";

// GET /api/admin/github-import?repo={owner}/{repo} — 읽기 전용 (FR-M10 §10 Step 5)
// content-hub에 직접 쓰지 않는다 — 결과는 FR-M17 신규 폼 프리필로만 사용된다.
export async function GET(request: NextRequest) {
  const repo = request.nextUrl.searchParams.get("repo");
  if (!repo) {
    return NextResponse.json(
      { error: "missing_repo", message: "repo 쿼리 파라미터가 필요합니다 (owner/repo)" },
      { status: 400 }
    );
  }

  try {
    const result = await importFromGithubRepo(repo);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof RepoNotFoundError) {
      return NextResponse.json({ error: "not_found", message: err.message }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "upstream_error", message: "GitHub 조회 중 오류가 발생했습니다" },
      { status: 502 }
    );
  }
}

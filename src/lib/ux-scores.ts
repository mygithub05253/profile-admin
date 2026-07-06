import { load } from "js-yaml";
import { getOctokit } from "./github/client";
import { CONTENT_HUB_OWNER, CONTENT_HUB_REPO, UX_SCORES_PATH } from "./github/config";
import { uxScoreHistorySchema, type UxScoreEntry } from "./schema/ux-score";

// data/ux-scores.yml 전체 이력 조회 (신규, 세션 13 사용자 요청) — 오래된 순으로 정렬해 반환
export async function listUxScoreHistory(): Promise<UxScoreEntry[]> {
  const octokit = getOctokit();
  const { data } = await octokit.repos.getContent({
    owner: CONTENT_HUB_OWNER,
    repo: CONTENT_HUB_REPO,
    path: UX_SCORES_PATH,
  });
  if (Array.isArray(data) || data.type !== "file" || typeof data.content !== "string") {
    throw new Error(`예상치 못한 콘텐츠 형식: ${UX_SCORES_PATH}`);
  }
  const raw = Buffer.from(data.content, "base64").toString("utf-8");
  const parsed = uxScoreHistorySchema.parse(load(raw));
  return [...parsed].sort((a, b) => a.date.localeCompare(b.date));
}

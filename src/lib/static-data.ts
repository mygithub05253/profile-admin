import { load, dump } from "js-yaml";
import { getOctokit } from "./github/client";
import {
  CONTENT_HUB_OWNER,
  CONTENT_HUB_REPO,
  PROFILE_DATA_PATH,
  RECORDS_DATA_PATH,
  STACKS_DATA_PATH,
} from "./github/config";
import { commitFilesAndOpenPR } from "./github/atomic-commit";
import { profileDataSchema, recordsDataSchema, stacksDataSchema } from "./schema/static-data";
import type { ProfileData, RecordsData, StacksData } from "./schema/static-data";
import { NotFoundError, ShaConflictError } from "./errors";
import { sleep } from "./sleep";

export interface DataRecord<T> {
  data: T;
  sha: string;
}

async function getFile(path: string): Promise<{ raw: string; sha: string } | null> {
  const octokit = getOctokit();
  try {
    const { data } = await octokit.repos.getContent({ owner: CONTENT_HUB_OWNER, repo: CONTENT_HUB_REPO, path });
    if (Array.isArray(data) || data.type !== "file" || typeof data.content !== "string") {
      throw new Error(`예상치 못한 콘텐츠 형식: ${path}`);
    }
    return { raw: Buffer.from(data.content, "base64").toString("utf-8"), sha: data.sha };
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

const CONFLICT_RETRY_DELAYS_MS = [0, 200, 400, 800]; // §21과 동일한 낙관적 잠금 재시도 정책

// FR-M21과 동일한 sha 낙관적 잠금 — 최신 sha와 비교, 재시도 후에도 다르면 진짜 충돌로 확정
async function checkShaOrConflict(path: string, expectedSha: string): Promise<{ raw: string; sha: string }> {
  let latest: { raw: string; sha: string } | null = null;
  for (const delay of CONFLICT_RETRY_DELAYS_MS) {
    if (delay) await sleep(delay);
    latest = await getFile(path);
    if (!latest) throw new NotFoundError(`파일을 찾을 수 없습니다: ${path}`);
    if (latest.sha === expectedSha) return latest;
  }
  throw new ShaConflictError(`저장 충돌: 최신 버전과 다릅니다 (${path})`, { frontmatter: null, body: "", sha: latest!.sha });
}

async function saveFile(path: string, expectedSha: string, content: string, label: string) {
  await checkShaOrConflict(path, expectedSha);
  const branch = `admin/data-${label}-${Date.now()}`;
  return commitFilesAndOpenPR({
    branch,
    upserts: [{ path, content }],
    commitMessage: `admin: update ${label} data`,
    prTitle: `admin: update ${label} data`,
    prBody: "profile-admin에서 자동 생성된 PR입니다. CI(frontmatter 검증) 통과 시 자동 병합됩니다.",
  });
}

// data/profile.yml (FR-M23) — 단일 객체, slug 없음
export async function getProfileData(): Promise<DataRecord<ProfileData> | null> {
  const file = await getFile(PROFILE_DATA_PATH);
  if (!file) return null;
  return { data: profileDataSchema.parse(load(file.raw)), sha: file.sha };
}

export async function updateProfileData(data: ProfileData, expectedSha: string) {
  const parsed = profileDataSchema.parse(data);
  const { prUrl } = await saveFile(PROFILE_DATA_PATH, expectedSha, dump(parsed, { lineWidth: -1 }), "profile");
  return { prUrl };
}

// data/stacks.yml (FR-M23)
export async function getStacksData(): Promise<DataRecord<StacksData> | null> {
  const file = await getFile(STACKS_DATA_PATH);
  if (!file) return null;
  return { data: stacksDataSchema.parse(load(file.raw)), sha: file.sha };
}

export async function updateStacksData(data: StacksData, expectedSha: string) {
  const parsed = stacksDataSchema.parse(data);
  const { prUrl } = await saveFile(STACKS_DATA_PATH, expectedSha, dump(parsed, { lineWidth: -1 }), "stacks");
  return { prUrl };
}

// data/records.yml (FR-M23)
export async function getRecordsData(): Promise<DataRecord<RecordsData> | null> {
  const file = await getFile(RECORDS_DATA_PATH);
  if (!file) return null;
  return { data: recordsDataSchema.parse(load(file.raw)), sha: file.sha };
}

export async function updateRecordsData(data: RecordsData, expectedSha: string) {
  const parsed = recordsDataSchema.parse(data);
  const { prUrl } = await saveFile(RECORDS_DATA_PATH, expectedSha, dump(parsed, { lineWidth: -1 }), "records");
  return { prUrl };
}

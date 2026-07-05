import { Octokit } from "@octokit/rest";

let cached: Octokit | undefined;

// GITHUB_PAT은 서버 전용(클라이언트 미노출) — content-hub contents:write + pull-requests:write 스코프
export function getOctokit(): Octokit {
  if (!cached) {
    const token = process.env.GITHUB_PAT;
    if (!token) {
      throw new Error("GITHUB_PAT 환경변수가 설정되지 않았습니다");
    }
    cached = new Octokit({ auth: token });
  }
  return cached;
}

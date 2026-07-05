// FR-M17/M18/M21 공통 도메인 에러 — API 라우트에서 HTTP 상태코드로 매핑
export class NotFoundError extends Error {}

export class SlugConflictError extends Error {}

export class SlugImmutableError extends Error {}

// FR-M21: sha 불일치 — 재시도 3회 실패 후 최신 콘텐츠와 함께 던짐(수동 diff 해소용)
export class ShaConflictError extends Error {
  constructor(
    message: string,
    public readonly latest: { frontmatter: unknown; body: string; sha: string }
  ) {
    super(message);
    this.name = "ShaConflictError";
  }
}

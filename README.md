# profile-admin

개인 브랜딩 자동화 생태계의 관리자 웹. [content-hub](https://github.com/mygithub05253/content-hub)의
`projects/`·`drafts/`를 GitHub API로 커밋하는 서버리스 CRUD 도구다. `my-profile-site`(공개 사이트)와는
별도 레포로 분리되어 있다 — 사용자/관리자 서사·배포·장애 영향 범위를 나눈다(ADR-9).

> 설계 정본: `my-profile-site` 레포 `docs/md/features/version2.0/admin/`,
> `docs/md/api/admin/version1.0/`, `docs/md/ui/admin/version1.0/`

## 스택

- Next.js 15 (App Router) + TypeScript Strict
- Auth.js v5 (GitHub OAuth, 숫자 ID allowlist)
- Tailwind CSS v4
- zod (content-hub velite 스키마와 동기화한 검증)
- `@octokit/rest` (Git Database API 원자 커밋 + PR + auto-merge)
- `remark` / `gray-matter` (frontmatter·마크다운 처리)

## 주요 기능

| 기능 | 설명 |
|------|------|
| FR-M9 | 등록 레포의 완성 신호(topics `portfolio-ready`) 수신 → content-hub가 velog 초안 자동 생성 (연동 대상) |
| FR-M16 | GitHub OAuth 로그인 + 숫자 ID allowlist 3중 방어(signIn/jwt·session/미들웨어) |
| FR-M17/M18 | 프로젝트 CRUD — 브랜치 커밋 → PR → auto-merge, zod 즉시 검증 |
| FR-M10 | GitHub 레포 지정 → 메타데이터 조회 → 프로젝트 폼 프리필(읽기 전용, 저장은 FR-M17 경로 재사용) |
| FR-M19 | 블로그 초안 관리(`/drafts`) — 편집·발행 준비(drafts→posts 이동, velog 자동 발행 트리거) |
| FR-M20 | 발행 대시보드(`/dashboard`) — 워크플로 실행 이력 시각화, 글 상태 매트릭스, admin PR 상태 |
| FR-M21 | sha 낙관적 잠금 — 충돌 시 재조회+백오프 재시도 후 diff 안내 |
| FR-M22 | 이미지 업로드 — 클라이언트 리사이즈·WebP 압축·5MB 가드, 본문·frontmatter와 단일 커밋 |
| A-06 | UX/제품 품질 평가 추적(`/evaluation`) — 점수 추이 차트, 발견사항 테이블 |

FR-M23(정적 데이터 편집)만 아직 미구현.

## 환경변수

`.env.example` 참고. Vercel 배포 시 5종 모두 프로젝트 env로 등록해야 한다.

```
AUTH_SECRET            # npx auth secret
AUTH_GITHUB_ID         # profile-admin 전용 GitHub OAuth App
AUTH_GITHUB_SECRET
ALLOWED_GITHUB_ID      # 본인 GitHub 숫자 ID(profile.id) — 사용자명 아님
GITHUB_PAT             # content-hub contents:write + pull-requests:write, fine-grained
```

## 개발

```bash
npm install
npm run dev
```

`GITHUB_PAT`이 없으면 `/projects` 조회·저장 API가 502를 반환한다. 로그인(FR-M16)은 GitHub OAuth App의
콜백 URL을 `http://localhost:3000/api/auth/callback/github`로 등록해야 로컬에서 동작한다.

## 저장 흐름 (FR-M17)

`admin/{slug}-{ts}` 브랜치 생성 → Git Database API 4단계(blob→tree→commit→ref) 원자 커밋 →
content-hub PR 생성 → GraphQL `enablePullRequestAutoMerge`(SQUASH) 활성화 → content-hub CI(frontmatter
검증) 통과 시 자동 병합. 실패 시 PR은 병합되지 않고 남는다.

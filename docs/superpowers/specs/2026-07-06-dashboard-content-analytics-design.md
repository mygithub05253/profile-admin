# Dashboard 콘텐츠 분석 탭 설계

- 작성일: 2026-07-06
- 배경: my-profile-site 세션에서 넘어온 사용자 피드백 — "관리자 Dashboard가 단순 '글 작성' 통계뿐, 기술 스택·프로젝트 등 전체를 아우르는 데이터분석 기능으로 확장 필요"
- 관련: FR-M20(발행 대시보드), FR-M23(정적 데이터 편집)

## 배경 — 현재 상태

`/dashboard`(`src/app/(admin)/dashboard/page.tsx`)는 FR-M20 범위인 "발행" 지표만 다룬다:
워크플로 실행 이력(velog-publish/deploy-site/blog-post), 글 상태 매트릭스(draft/ready/published/synced),
admin PR 이력. `data/stacks.yml`·`projects/*.mdx`·`data/records.yml`은 각각 `/data/stacks`, `/projects`,
`/data/records` 편집 화면에서만 개별적으로 다뤄지고, 이들을 가로질러 보는 화면이 없다.

## 목표

기존 "발행" 대시보드는 그대로 두고, 같은 페이지에 "콘텐츠 분석" 탭을 추가해 스택·프로젝트·성장
타임라인을 한눈에 본다. 확인 우선순위(사용자 확정):

1. **포트폴리오 균형** — 어떤 카테고리·스택이 과다/과소한지
2. **featured/공개 상태 점검** — 관리가 누락된 항목(draft 방치 등) 파악
3. **성장 추이** — 연도별 활동량

## 비목표 (이번 스코프에서 제외)

- 탭 URL 상태 저장(새로고침 시 발행 탭으로 복귀되는 것은 허용)
- 프로젝트/스택 목록 외 항목(카테고리·필터 등)에 대한 전면 인터랙션 — 필터링은 "관리 누락 프로젝트" 표 1곳에만 적용
- 차트 라이브러리 도입 — 기존 `StackedBarChart`(순수 CSS) 재사용

## 아키텍처

### 1. 데이터 fetch 전략 — `Promise.allSettled`

`page.tsx`의 기존 `Promise.all([runs, posts, prs])`에 3개를 추가하되, **`Promise.all`이 아니라
`Promise.allSettled`를 사용**한다. 이유: `Promise.all`은 6개 중 하나만 실패해도 전체를 reject해
대시보드 전체가 에러 화면이 된다 — 이번에 고친 `/data/stacks` 크래시(스키마 drift로 인한 전체
페이지 throw)와 같은 실패 패턴이다. `allSettled`로 섹션 단위 격리:

```ts
const [runsR, postsR, prsR, stacksR, projectsR, recordsR] = await Promise.allSettled([
  listRecentWorkflowRuns(),
  listPostsStatusMatrix(),
  listAdminPullRequests(),
  getStacksData(),
  listProjects(),
  getRecordsData(),
]);
```

각 결과는 `status === "fulfilled"`일 때만 해당 섹션을 렌더링하고, `rejected`거나(`getStacksData`/
`getRecordsData`가 `null`을 반환하는 경우 포함) 실패 시 그 섹션에만 "데이터를 불러오지 못했습니다"
인라인 메시지를 표시한다. 다른 5개 섹션은 정상 렌더링을 계속한다.

### 2. 순수 집계 함수 — `src/lib/content-analytics.ts` (신규)

I/O 없는 순수 함수만 모은다 (GitHub API 호출은 기존 `dashboard.ts`/`projects.ts`/`static-data.ts`가
담당, 이 파일은 이미 fetch된 데이터를 받아 뷰 모델로 변환만 한다).

```ts
export interface CategoryCount {
  label: string;
  count: number;
}

export interface StackAnalytics {
  byCategory: CategoryCount[];
  featuredCount: number;
  usage: { name: string; category: string; featured: boolean; projectCount: number }[];
  unusedStacks: string[]; // stacks.yml엔 있지만 어떤 프로젝트에도 안 쓰인 이름
  unlistedStackNames: string[]; // 프로젝트 stack엔 있지만 stacks.yml엔 없는 이름(오탈자/등록 누락 후보)
}

export interface ProjectAnalytics {
  byCategory: CategoryCount[];
  byStatus: CategoryCount[];
  featuredCount: number;
  draftItems: ProjectListItem[];
}

export interface RecordsAnalytics {
  byYear: CategoryCount[]; // 연도 파싱 실패 시 "기타" 버킷
  byCategory: CategoryCount[];
}

export function buildStackAnalytics(stacks: StacksData, projects: ProjectListItem[]): StackAnalytics;
export function buildProjectAnalytics(projects: ProjectListItem[]): ProjectAnalytics;
export function buildRecordsAnalytics(records: RecordsData): RecordsAnalytics;
```

**방어적 파싱 (예외 처리 보강 — 스키마 drift 재발 방지):**

- `buildStackAnalytics`에서 프로젝트별 `stack`을 순회할 때 `Array.isArray(project.stack) ? project.stack : []`로
  방어한다. `listProjects()`는 content-hub mdx frontmatter를 zod 검증 없이 캐스팅만 하므로(`as ProjectFrontmatter`),
  실제 데이터가 스키마와 어긋나도(예: `stack` 누락) 분석 탭 전체가 죽지 않아야 한다.
- `buildRecordsAnalytics`의 연도 파싱은 `date` 문자열(`"2021.03 ~"`, `"2025"`, `"2026.03 ~ 2026.06"` 등 자유
  포맷)에서 정규식 `/\d{4}/`으로 첫 4자리 숫자만 추출한다. 매치가 없으면 예외를 던지지 않고 "기타" 버킷으로
  분류한다.
- `getStacksData()`/`getRecordsData()`가 `null`(파일 없음)을 반환하면 해당 섹션에 "데이터 없음" 메시지만
  표시하고 throw하지 않는다.

### 3. 기존 코드 확장

- `src/lib/schema/project.ts`의 `ProjectListItem`에 `stack: string[]` 필드 추가 (스택 사용 빈도 교차 집계에 필요).
- `src/lib/projects.ts`의 `listProjects()`가 이미 각 프로젝트 frontmatter 전체를 읽고 있으므로, `stack` 필드를
  버리지 않고 반환값에 포함한다 (`Array.isArray(fm.stack) ? fm.stack : []` — 방어적 처리와 동일 원칙).

### 4. 컴포넌트 구조

- **`src/components/DashboardTabs.tsx`** (신규, client) — "발행"/"콘텐츠 분석" 버튼 토글. 두 섹션 모두
  서버에서 미리 렌더링된 `ReactNode`를 props로 받아 `display: none/block`으로 전환한다(언마운트하지 않음 —
  아래 필터 컴포넌트의 클라이언트 상태가 탭 전환 후에도 유지되도록).
- **`src/components/ProjectStatusFilterTable.tsx`** (신규, client) — "관리 누락 프로젝트"(draft) 표 +
  카테고리 필터 칩(전체/ai-data/finance/fullstack). 기존 `ProjectsTable.tsx`의 `useState`+`useMemo` 필터
  패턴을 그대로 따른다. 이 화면의 유일한 인터랙션 지점.
- **`src/app/(admin)/dashboard/page.tsx`** (수정) — fetch 확장(`allSettled`), `content-analytics.ts` 호출,
  섹션 조립, `DashboardTabs`에 두 트리 전달.
- 기존 `StackedBarChart`, `StatusBadge`는 그대로 재사용(신규 차트 컴포넌트 없음).

## UI 구성 — "콘텐츠 분석" 탭 (우선순위 순)

**① 포트폴리오 균형**
- 스택 카테고리 분포 / 프로젝트 카테고리 분포 — `StackedBarChart` 2개
- "스택 사용 빈도" 표 — 스택명·카테고리·featured·프로젝트 사용 횟수(내림차순). 미사용 스택은 회색 "미사용" 배지.
- 정합성 경고 박스 — `unlistedStackNames`가 있으면 amber 박스로 노출

**② featured/공개 상태 점검**
- StatCard 4개: 총 프로젝트 / featured 프로젝트 / draft 프로젝트 / featured 스택 비율
- "관리 누락 프로젝트" 표(`ProjectStatusFilterTable`) — draft 목록 + 카테고리 필터

**③ 성장 추이**
- 연도별 활동 수 / 카테고리별 활동 수 — `StackedBarChart` 2개

## 에러 처리 요약

| 실패 지점 | 처리 |
|---|---|
| 워크플로/PR/글 목록 fetch 실패 (기존 3종) | 해당 섹션만 인라인 오류, 나머지 섹션 정상 |
| `getStacksData`/`getRecordsData`/`listProjects` 실패 | 분석 탭 해당 섹션만 인라인 오류 |
| `getStacksData`/`getRecordsData` → `null` | "데이터 없음" 메시지, throw 없음 |
| 프로젝트 frontmatter의 `stack` 누락/형식 오류 | 빈 배열로 취급, 집계에서 제외 |
| `records.yml`의 `date` 파싱 실패 | "기타" 연도 버킷 |

## 파일 변경 목록

- 신규: `src/lib/content-analytics.ts`, `src/components/DashboardTabs.tsx`, `src/components/ProjectStatusFilterTable.tsx`
- 수정: `src/app/(admin)/dashboard/page.tsx`, `src/lib/schema/project.ts`, `src/lib/projects.ts`

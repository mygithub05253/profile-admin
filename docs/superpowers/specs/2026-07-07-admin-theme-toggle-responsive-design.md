# 관리자 화면 디자인 시스템 도입 · 테마 토글 · 공개 사이트 링크 · 반응형 지원 설계

- 작성일: 2026-07-07
- 배경: my-profile-site 세션에서 넘어온 사용자 피드백 #3 — "관리자 화면(profile-admin)에 테마 토글이 없고, 사용자용 공개 사이트로 이동하는 버튼도 없음"
- 관련: 없음(신규). 브레인스토밍 중 사용자가 본인의 다른 프로젝트(gc-dating-app, `Frontend/admin`)를 벤치마킹 대상으로 지정하면서 스코프가 크게 확장됨.

## 배경 — 현재 상태 및 스코프 확장 경위

`(admin)/layout.tsx`는 좌측 사이드바(`w-56` 고정) + 우측 메인 콘텐츠로 구성된 데스크톱 전용 셸이다. 테마 토글도, 공개 사이트로 가는 링크도 없다.

브레인스토밍이 진행되며 사용자가 세 차례에 걸쳐 스코프를 확장했다:
1. "사용자/관리자 모두 반응형" — 실사용 확인 결과 my-profile-site는 이미 Mobile First로 대부분 구현되어 있었고(Footer·blog 목록만 소소 보완), profile-admin은 셸·테이블 3개·폼 2개가 반응형 처리 전무.
2. "참고하라고 준 gc-dating-app(`https://github.com/mygithub05253/gc-dating-app.git`)의 admin 폴더처럼 기능을 어느 정도 가져와서 구현" — 확인해보니 `Frontend/admin`은 Next.js 14 + Tailwind v3 + shadcn/ui 패턴 + Radix 프리미티브로 지어진 정식 디자인 시스템("Ember Signal")이었음.
3. "가져오되 필요 없는 기능은 상관없고, 데이터분석·오류 처리 등 도움되는 기능을 우리 프로젝트에 맞게 커스터마이징" — 전체 이식이 아니라 선별적 벤치마킹으로 범위를 좁혀서 확정.

이 설계 문서는 최종 확정된 범위를 기준으로 한다.

## 목표

1. 관리자 화면에 라이트→다크→시스템 3단 테마 토글 추가
2. 관리자 화면에 공개 사이트(my-profile-site, `https://my-profile-site-coral.vercel.app`)로 이동하는 링크 추가
3. profile-admin에 shadcn/ui 스타일 컴포넌트 인프라(Button/Card/Table/Badge/Input) 도입, 기존 raw-Tailwind 산발 패턴을 대체
4. 관리자 셸(사이드바+헤더)·테이블 3개·폼 2개를 모바일/태블릿에서 사용 가능하게 반응형 처리
5. 콘텐츠 분석 대시보드의 차트를 recharts로, 섹션 상태 표시를 Loading/Empty/Error 3상태로 고도화
6. 클라이언트 폼 제출 성공/실패에 토스트 피드백 추가(profile-admin 자체 에러 코드 기반)
7. my-profile-site의 남은 반응형 미세 갭(Footer, blog 목록) 보완

## 비목표

- gc-dating-app의 시각 브랜딩("Ember Signal" 웜 오렌지 포인트 컬러, Instrument Serif 로고체, Pretendard 폰트 교체) — profile-admin과 무관한 다른 앱의 브랜드라 이식하지 않음. 색 토큰은 값만 profile-admin 기존 흑백 미니멀 톤 + 기존 `StatusBadge`의 시맨틱 색(green/red/amber/blue)에 맞춰 중립화한다. 폰트는 기존 Geist 유지.
- `@tanstack/react-query`, axios, JWT 토큰 갱신 인터셉터 — profile-admin은 next-auth 세션 기반 Server Component/Server Action 구조라 아키텍처가 다름. 도입하지 않음.
- `AnalyticsDateRangePicker`(최근 7일/30일 등 일 단위 프리셋) — content-hub records는 연도 단위 데이터라 일 단위 프리셋이 맞지 않음.
- `MockPageNotice`, 데이팅앱 도메인 전용 분석 훅(`useAnalytics`, `useDashboard`, matching/retention 등) — profile-admin 도메인과 무관.
- Radix Dialog/Select/Tabs/DropdownMenu — 지금 당장 구체적으로 대체할 대상이 없어 이번 스코프에서 제외(필요해지면 별도 추가).
- system/light/dark 중 "system" 단계를 없애는 것 — gc-dating-app 실사용 패턴을 그대로 따라 3단 유지.

## 아키텍처

### 1. shadcn/ui 스타일 컴포넌트 인프라 도입

**신규 의존성**: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `next-themes`, `@radix-ui/react-slot`, `@radix-ui/react-separator`, `recharts`, `react-hot-toast`, `dayjs`(포맷 유틸로 필요 시).

**신규 파일**:
- `src/lib/utils.ts` — `cn()` (`clsx` + `tailwind-merge`)
- `src/components/ui/button.tsx` — cva variant(default/destructive/outline/secondary/ghost/link) + size(xs/sm/default/lg/icon), gc-dating-app `ui/button.tsx` 그대로 포팅(색 토큰만 교체)
- `src/components/ui/card.tsx` — Card/CardHeader/CardTitle/CardContent
- `src/components/ui/table.tsx` — Table/TableHeader/TableBody/TableRow/TableHead/TableCell. **자체적으로 `overflow-x-auto` 래퍼를 내장**하고 있어 테이블 반응형이 이 컴포넌트 도입만으로 해결됨
- `src/components/ui/badge.tsx` — cva variant(default/destructive/warning/soft-primary/soft-muted 등, 기존 `StatusBadge` 톤과 매핑)
- `src/components/ui/input.tsx`

**디자인 토큰** (`src/app/globals.css`, Tailwind v4 CSS-first 방식 — my-profile-site의 `@theme inline` 브리지 패턴과 동일한 기법 사용, 단 색상값은 gc-dating-app이 아니라 profile-admin 고유):

```css
:root {
  --border: 0 0% 89.8%;         /* 기존 black/10 톤에 대응 */
  --background: 0 0% 100%;
  --foreground: 0 0% 9%;
  --card: 0 0% 100%;
  --muted: 0 0% 96.1%;
  --muted-foreground: 0 0% 45.1%;
  --primary: 0 0% 9%;           /* 흑백 미니멀 유지 — Ember 오렌지 대신 */
  --primary-foreground: 0 0% 98%;
  --destructive: 0 84% 60%;     /* 기존 StatusBadge red-500 계열 */
  --success: 142 71% 45%;       /* 기존 StatusBadge green-500 계열 */
  --warning: 38 92% 50%;        /* 기존 StatusBadge amber-500 계열 */
  --info: 217 91% 60%;          /* 기존 StatusBadge blue-500 계열 */
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px;
}
.dark { /* 각 변수의 다크 버전 — 기존 dark:white/* 톤에 대응 */ }

@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  --color-border: hsl(var(--border));
  --color-primary: hsl(var(--primary));
  /* ... 나머지 색 토큰 브리지 */
}
```

### 2. 테마 토글 시스템

- `src/app/layout.tsx`에 `next-themes`의 `ThemeProvider`(`attribute="class"`, `defaultTheme="system"`, `enableSystem`)로 래핑. FOUC 방지·시스템 설정 실시간 반영을 라이브러리가 처리(직접 구현 불필요).
- `src/components/ThemeToggle.tsx` — gc-dating-app `ThemeToggle.tsx` 로직 그대로: `useTheme()` 훅, light→dark→system→light 순환, Monitor/Moon/Sun 아이콘(lucide-react), 마운트 전 placeholder. 새로 만든 `Button variant="ghost" size="icon"` 프리미티브 사용.

### 3. 공개 사이트 링크

- `src/lib/constants.ts`: `export const PUBLIC_SITE_URL = "https://my-profile-site-coral.vercel.app";`
- `src/components/PublicSiteLink.tsx`: `<a href={PUBLIC_SITE_URL} target="_blank" rel="noopener noreferrer">`. 새 탭.

### 4. 헤더 배치 & 사이드바 반응형 셸

`(admin)/layout.tsx`는 서버 컴포넌트 유지(`await auth()`), 클라이언트 상호작용은 신규 `src/components/AdminShell.tsx`로 추출.

```
AdminLayout (server) → handleSignOut("use server") 정의 →
  AdminShell (client, session/onSignOut prop)
    - md 이상: 사이드바 항상 노출(새 Card/border 토큰으로 재스타일, lucide-react 아이콘 + 활성 항목 좌측 강조바 — gc-dating-app Sidebar.tsx 스타일 차용, 중첩 서브메뉴는 불필요해 생략)
    - md 미만: 사이드바 숨김 + 헤더 햄버거 → 좌측 드로어 오버레이(body 스크롤 잠금, ESC/배경클릭 닫기 — my-profile-site Header.tsx 패턴, gc-dating-app엔 이 부분이 아예 없어서 참고 불가했음)
    - 헤더 우측: 공개사이트링크 · 구분선 · ThemeToggle · 구분선 · {이름}·로그아웃
```

Server Action(`signOut`)은 `AdminLayout`에서 정의해 prop으로 전달.

### 5. 테이블 반응형 — DataTable 도입

- `src/components/DataTable.tsx` — gc-dating-app `common/DataTable.tsx` API 그대로(`columns` 스키마, `align`, `emptyState`, `rowKey`, `onRowClick`, `wrapInCard`) 포팅. 신규 `ui/table.tsx` 기반이라 `overflow-x-auto`가 자동 적용됨.
- `ProjectsTable.tsx`, `DraftsTable.tsx`, `evaluation/page.tsx`의 발견사항 테이블 → `DataTable`로 재작성.
- `src/components/SearchBar.tsx` — gc-dating-app 것 포팅, 단 원본도 반응형이 아니어서(`flex items-center gap-2` 한 줄 고정) `flex-col gap-2 sm:flex-row`로 보완해서 적용.
- `src/components/Pagination.tsx` — gc-dating-app 것 그대로 포팅. Projects/Drafts 목록에 신규 적용(현재는 클라이언트 필터링만 있고 페이지네이션 없음 — 항목 수가 늘어날 걸 대비한 선제 도입).

### 6. 폼 반응형

- `ProfileDataForm.tsx`(123, 155행), `RecordsDataForm.tsx`(121, 149행)의 `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
- `ProjectForm.tsx`는 이미 단일 컬럼이라 수정 대상 아님(코드 직접 확인 완료)

### 7. 데이터 분석 섹션 고도화

- **recharts 도입**: 기존 순수 CSS `StackedBarChart`(콘텐츠 분석 스택 분포), `ScoreTrendChart`(Evaluation 점수 추이)를 recharts 기반(`BarChart`/`LineChart`, `ResponsiveContainer`)으로 교체. 새 색 토큰(`--primary`, `--success` 등)을 recharts 시리즈 색상에 연결.
- **`AnalyticsStatus.tsx` 패턴 도입**: `src/components/AnalyticsStatus.tsx`에 `AnalyticsLoading`/`AnalyticsEmpty`/`AnalyticsError(onRetry)` 3종을 gc-dating-app 것 기반으로 포팅(디자인 토큰 새 것으로 교체). 기존 `SectionErrorNotice.tsx`(성공/실패 2상태)를 이걸로 대체 — `ContentAnalyticsSection.tsx`·`PublishSection.tsx`의 `Promise.allSettled` 실패 섹션에 적용.
- `DegradedBadge`/`AnalyticsMetaBar`/`AnalyticsToolbar`는 profile-admin에 "degraded 모드"·"algorithm 메타" 개념 자체가 없어 이식하지 않음(비목표).

### 8. 클라이언트 에러 토스트

- `react-hot-toast`의 `<Toaster />`를 루트 레이아웃에 추가.
- profile-admin은 이미 서버 API 라우트에서 `api-errors.ts`의 `toErrorResponse()`가 `{ error: "slug_conflict" | "sha_conflict" | "invalid_schema" | "not_found" | "upstream_error", message }` 형태로 응답하고 있음(기존 구조 그대로 유지). 클라이언트 폼(ProjectForm 등)에서 fetch 실패 시 이 `error` 코드를 한글 메시지로 매핑해 `toast.error(...)`로 표시하는 유틸을 `src/lib/toast-errors.ts`에 추가(gc-dating-app `client.ts`의 "에러코드→메시지 매핑" 개념만 차용, axios/토큰갱신 로직은 이식하지 않음). 성공 시 `toast.success("저장되었습니다")` 등 추가.

### 9. my-profile-site 소소 보완

- `components/Footer.tsx`: `gap-6` → `gap-4 sm:gap-5 md:gap-6`
- `app/blog/page.tsx`: 목록 아이템 메타 영역에 `flex-wrap gap-x-3 gap-y-1` 추가

## 컴포넌트/파일 변경 목록

**profile-admin — 신규**
- `src/components/ui/{button,card,table,badge,input}.tsx`
- `src/lib/utils.ts`, `src/lib/constants.ts`, `src/lib/toast-errors.ts`
- `src/components/{ThemeToggle,PublicSiteLink,AdminShell,DataTable,SearchBar,Pagination,AnalyticsStatus}.tsx`

**profile-admin — 수정**
- `package.json`(신규 의존성), `src/app/globals.css`(디자인 토큰 + `@custom-variant dark`), `src/app/layout.tsx`(ThemeProvider, Toaster)
- `src/app/(admin)/layout.tsx`(AdminShell 위임), `src/app/(admin)/evaluation/page.tsx`(테이블 DataTable화, 차트 recharts화)
- `src/components/{ProjectsTable,DraftsTable,ProfileDataForm,RecordsDataForm,ContentAnalyticsSection,PublishSection,SectionErrorNotice,StatusBadge,StatCard,ScoreTrendChart}.tsx`(대체 또는 내부 리팩터)

**my-profile-site — 수정**
- `components/Footer.tsx`, `app/blog/page.tsx`

## 검증 계획

- `npm run build`, `npm run lint`, `npm run verify`(기존 content-analytics 회귀 스크립트가 컴포넌트 교체 후에도 통과하는지 — 순수 함수 로직 자체는 안 건드리므로 통과 예상, 확인 필요)
- 뷰포트 리사이즈(모바일/태블릿/데스크톱)로 드로어·테이블·폼·차트 반응형 확인
- 테마 토글 3단 순환, 새로고침 시 FOUC 없는지, 폼 제출 성공/실패 토스트 노출 확인
- **profile-admin은 FR-M16(로그인 필요)으로 실제 로그인 후 화면은 Claude가 직접 볼 수 없음** — 빌드/린트/verify 통과 + 코드 리뷰까지 완료 후, 실제 렌더·인터랙션 확인은 사용자 몫으로 별도 보고

## 구현 규모에 대한 메모

이번 스펙은 원래 피드백(테마 토글 부재)보다 훨씬 커졌다 — shadcn/ui 인프라 신규 도입, 테이블/폼/차트/에러처리 전반 리팩터를 포함한다. `writing-plans`에서 여러 단계(① 인프라+토큰 → ② 테마토글+공개링크 → ③ 셸 반응형 → ④ 테이블/폼 → ⑤ 분석/차트/토스트 → ⑥ my-profile-site 보완)로 나눠 계획하고, 피드백 #2때처럼 `subagent-driven-development`로 단계별 진행하는 것을 권장한다.

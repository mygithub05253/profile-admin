# 관리자 화면 테마 토글 · 공개 사이트 링크 · 반응형 지원 설계

- 작성일: 2026-07-07
- 배경: my-profile-site 세션에서 넘어온 사용자 피드백 #3 — "관리자 화면(profile-admin)에 테마 토글이 없고, 사용자용 공개 사이트로 이동하는 버튼도 없음"
- 관련: 없음(신규)

## 배경 — 현재 상태

`(admin)/layout.tsx`는 좌측 사이드바(Projects/Drafts/Dashboard/Evaluation/Data, `w-56` 고정) + 우측 메인 콘텐츠로 구성된 데스크톱 전용 셸이다. 상단 헤더에는 `{이름} · 로그아웃`만 있다.

- **테마**: Tailwind `dark:` 클래스가 이미 여러 컴포넌트에 쓰이고 있지만(`(admin)/layout.tsx`, `DashboardTabs.tsx` 등), 전부 `prefers-color-scheme` 미디어쿼리 기반이라 사용자가 수동으로 전환할 방법이 없다.
- **공개 사이트 이동**: profile-admin 어디에도 공개 사이트(my-profile-site, 프로덕션 주소 `https://my-profile-site-coral.vercel.app`)로 가는 링크가 없다.
- **반응형**: 브레인스토밍 중 사용자가 범위를 확장해, "사용자(my-profile-site)/관리자(profile-admin) 모두 휴대폰·태블릿에서 들어가도 되도록"을 요청했다. 실제 코드로 확인한 결과:
  - my-profile-site는 `Header.tsx`, `ProjectsExplorer.tsx`, 홈/블로그/프로젝트 상세 페이지 등 대부분 이미 `md:`/`sm:` 브레이크포인트로 Mobile First 구현되어 있음. `Footer.tsx`와 `app/blog/page.tsx` 목록 메타 영역만 소소하게 보완할 부분이 있음.
  - profile-admin은 레이아웃 셸부터 브레이크포인트가 전혀 없고, `ProjectsTable`/`DraftsTable`/`evaluation/page.tsx` 테이블 3개(전부 고정폭 `<table>`), `ProfileDataForm.tsx`·`RecordsDataForm.tsx`의 `grid-cols-2` 4곳이 모바일에서 깨질 위험이 높음(`ProjectForm.tsx`는 이미 단일 컬럼이라 수정 불필요 — 코드로 직접 확인).

## 목표

1. 관리자 화면에 라이트⇄다크 수동 테마 토글 추가
2. 관리자 화면에 공개 사이트(my-profile-site)로 이동하는 링크 추가
3. profile-admin 관리자 셸(사이드바+헤더)·테이블 3개·폼 2개를 모바일/태블릿에서 사용 가능하게 반응형 처리
4. my-profile-site의 남은 반응형 미세 갭(Footer, blog 목록) 보완

## 비목표

- system/light/dark 3단 토글 — 라이트⇄다크 2단 토글로 충분(YAGNI)
- `next-themes` 등 테마 라이브러리 도입 — 이 정도 요구사항엔 과함
- 테이블을 모바일 카드형 레이아웃으로 재구현 — `overflow-x-auto` 래퍼로 충분, 카드 전환은 별도 백로그로 보류
- my-profile-site 디자인 토큰(`--color-border` 등)을 profile-admin으로 이식 — profile-admin은 기존 raw opacity 클래스(`black/10`, `white/60`) 컨벤션을 그대로 유지
- profile-admin 문서 구조(마스터인덱스+버전폴더) 마이그레이션 — 사용자가 이 작업 이후로 순서를 확정함(별도 백로그)

## 아키텍처

### 1. 테마 토글 시스템

Tailwind v4 기본 `dark:` variant는 `prefers-color-scheme` 미디어쿼리 기반이다. 이를 수동 토글 가능하게 바꾸려면 `globals.css`에 커스텀 variant를 추가한다.

```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

이렇게 하면 프로젝트 전체에 이미 쓰인 `dark:` 클래스가 코드 수정 없이 전부 "OS 기반"에서 "속성 기반"으로 전환된다.

**초기 로드 시퀀스** (my-profile-site 패턴 준용, 단 세부 구현은 다름):
- `src/app/layout.tsx`에 FOUC 방지 인라인 스크립트 추가. my-profile-site와 달리, 여기서는 `data-theme`를 항상 명시적으로 세팅한다(localStorage 값이 없으면 `matchMedia("(prefers-color-scheme: dark)")`로 계산해서 세팅) — `@custom-variant` 방식은 속성이 아예 없으면 항상 라이트로 떨어지기 때문에, my-profile-site처럼 "속성 미설정 시 CSS 미디어쿼리로 폴백"이 안 된다.
- 같은 이유로, 수동 선택을 안 한 사용자가 OS 다크모드를 라이브로 바꿀 경우에도 반영되도록 `ThemeToggle.tsx`에서 `matchMedia(...).addEventListener("change", ...)` 리스너를 등록한다(단, `localStorage`에 수동 값이 저장되어 있으면 이 리스너는 무시).

**`src/components/ThemeToggle.tsx`** (신규): my-profile-site의 `ThemeToggle.tsx` 로직(마운트 전 placeholder, `dataset.theme` + `localStorage` 저장, sun/moon SVG 토글)을 참고하되, 클래스명은 profile-admin 컨벤션(`border-black/15 dark:border-white/20` 등)으로 새로 작성한다. my-profile-site 컴포넌트를 직접 import하지 않는다(두 레포는 별도 배포 단위이고, 디자인 토큰이 다름).

### 2. 공개 사이트 링크

**`src/lib/constants.ts`** (신규):
```ts
export const PUBLIC_SITE_URL = "https://my-profile-site-coral.vercel.app";
```

**`src/components/PublicSiteLink.tsx`** (신규): `<a href={PUBLIC_SITE_URL} target="_blank" rel="noopener noreferrer">`. 새 탭으로 열어 관리자 세션/작업 컨텍스트를 잃지 않게 한다.

### 3. 헤더 배치 & 클라이언트 아일랜드 분리

`(admin)/layout.tsx`는 서버 컴포넌트로 유지(`await auth()`), 상호작용이 필요한 부분만 신규 `src/components/AdminShell.tsx`(클라이언트)로 추출한다.

```
AdminLayout (server)
  - session = await auth()
  - handleSignOut: "use server" 함수 정의
  └─ <AdminShell session={session} onSignOut={handleSignOut}>{children}</AdminShell>
```

헤더 우측 배치(로그아웃 왼쪽부터): `공개 사이트 보기 ↗` · 구분선 · `ThemeToggle` · 구분선 · `{이름} · 로그아웃`. 구분선은 기존 컨벤션대로 `border-black/10 dark:border-white/15` 톤 세로선.

### 4. 사이드바 반응형 셸

브레이크포인트: `md`(768px) — my-profile-site `Header.tsx`와 동일 기준.

- **`md` 이상**: 기존처럼 사이드바 항상 노출(변경 없음).
- **`md` 미만**: 사이드바 기본 숨김, 헤더 좌측에 햄버거 버튼 추가. 클릭 시 좌측에서 슬라이드인하는 드로어 오버레이로 동일한 nav 표시.
- 드로어 상호작용은 my-profile-site `Header.tsx`의 모바일 오버레이 패턴을 재사용: `body` 스크롤 잠금, `Escape` 키로 닫기, 배경 클릭으로 닫기. `open` 상태는 `AdminShell` 내부 `useState`.
- Server Action(`signOut`) 전달: 클라이언트 컴포넌트는 `"use server"` 함수를 직접 정의할 수 없으므로, `AdminLayout`에서 정의해 `AdminShell`에 prop으로 내려준다(Next.js에서 유효한 패턴).

### 5. 테이블 3개 반응형 (Projects/Drafts/Evaluation)

- 각 테이블을 `<div className="overflow-x-auto">`로 감싼다. 마크업 자체는 바꾸지 않는다.
- 상단 검색/필터(`ProjectsTable.tsx:22`, `DraftsTable.tsx:22`)의 `flex gap-3`를 `flex flex-col gap-3 sm:flex-row`로 변경해 모바일에서 세로로 쌓이게 한다.
- Evaluation 페이지(`evaluation/page.tsx`)의 점수 카드·차트 섹션은 이미 `grid gap-8` 단일 컬럼이라 추가 수정 불필요, 테이블 부분만 동일하게 `overflow-x-auto` 래퍼 적용.

### 6. 폼 반응형

- `ProfileDataForm.tsx` 123행, 155행의 `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
- `RecordsDataForm.tsx` 121행, 149행의 `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
- `ProjectForm.tsx`는 이미 단일 컬럼 그리드(`grid max-w-3xl gap-5`)라 수정 대상 아님.

### 7. my-profile-site 소소 보완

- `components/Footer.tsx`: 링크 그룹 간격을 `gap-6` → `gap-4 sm:gap-5 md:gap-6`로 세분화.
- `app/blog/page.tsx`: 목록 아이템의 제목·날짜 `flex justify-between`에 `flex-wrap gap-x-3 gap-y-1` 추가해 좁은 화면(≤320px)에서 텍스트 겹침 방지.

## 컴포넌트/파일 변경 목록

**profile-admin — 신규**
- `src/components/ThemeToggle.tsx`
- `src/components/PublicSiteLink.tsx`
- `src/components/AdminShell.tsx`
- `src/lib/constants.ts`

**profile-admin — 수정**
- `src/app/globals.css` (`@custom-variant dark` 추가)
- `src/app/layout.tsx` (FOUC 방지 인라인 스크립트)
- `src/app/(admin)/layout.tsx` (AdminShell로 셸 위임)
- `src/components/ProjectsTable.tsx`, `src/components/DraftsTable.tsx` (`overflow-x-auto` 래퍼, 필터 반응형)
- `src/app/(admin)/evaluation/page.tsx` (테이블 `overflow-x-auto` 래퍼)
- `src/components/ProfileDataForm.tsx`, `src/components/RecordsDataForm.tsx` (`grid-cols-2` → 반응형)

**my-profile-site — 수정**
- `components/Footer.tsx`, `app/blog/page.tsx`

## 검증 계획

- `npm run build`, `npm run lint` (양쪽 레포)
- 브라우저 뷰포트 리사이즈(모바일/태블릿/데스크톱)로 사이드바 드로어·테이블 스크롤·폼 스택 확인 — my-profile-site는 로그인 불필요라 직접 확인 가능
- **profile-admin은 FR-M16(로그인 필요)으로 실제 로그인 후 화면은 Claude가 직접 볼 수 없음** — 빌드/린트 통과 + 코드 리뷰까지 완료 후, 실제 렌더·인터랙션 확인은 사용자 몫으로 별도 보고
- 테마 토글: localStorage 저장/복원, 새로고침 시 FOUC 없는지, OS 다크모드 변경 시 미수동선택 상태에서 라이브 반영되는지 확인

# Dashboard 콘텐츠 분석 탭 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/dashboard`에 기존 "발행" 통계 옆에 "콘텐츠 분석" 탭을 추가해 스택·프로젝트·성장 타임라인(records)을 한 화면에서 확인할 수 있게 한다.

**Architecture:** 순수 집계 로직(`src/lib/content-analytics.ts`)과 화면(서버 컴포넌트 2개 + 클라이언트 컴포넌트 2개)을 분리한다. `page.tsx`는 `Promise.allSettled`로 6개 데이터 소스를 가져와 실패를 섹션 단위로 격리하고, 얇은 조립 역할만 한다.

**Tech Stack:** Next.js 15 App Router (Server Component 우선), TypeScript strict, Tailwind CSS. 이 저장소엔 테스트 프레임워크(jest/vitest 등)가 설치돼 있지 않다 — 순수 함수 검증은 Node 24가 기본 지원하는 TypeScript 실행(타입 스트리핑, 별도 플래그 불필요)과 `node:assert/strict`로 하고, 그 외는 기존 CI가 이미 쓰는 `npm run build`(타입 체크 포함) + `npm run lint`로 확인한다.

**설계 문서와의 차이(파일 분해 세부화):** `docs/superpowers/specs/2026-07-06-dashboard-content-analytics-design.md`가 정의한 동작·데이터 흐름은 그대로 따르되, `page.tsx`가 발행 섹션 JSX까지 그대로 안고 있으면 400줄에 육박해 파일 하나의 책임이 커진다. 그래서 기존 발행 섹션 JSX를 `PublishSection.tsx`로 옮기고(동작 변화 없는 리팩터링), 공용 `StatCard`/`SectionErrorNotice`를 별도 파일로 뽑아 두 섹션이 공유하도록 세분화했다. 데이터 구조·에러 처리·UI 우선순위는 설계 문서와 동일하다.

---

## 사전 확인

- [ ] **Step 0: 브랜치 확인**

Run: `git -C /c/Users/kik32/workspace/profile-admin branch --show-current`
Expected: `feat/dashboard-content-analytics` (design 문서 커밋 `9beafff`가 이미 이 브랜치에 있어야 함)

---

### Task 1: `ProjectListItem`에 `stack` 필드 추가

**Files:**
- Modify: `src/lib/schema/project.ts:67-75`
- Modify: `src/lib/projects.ts:77-86`

- [ ] **Step 1: `ProjectListItem`에 `stack` 필드 추가**

`src/lib/schema/project.ts`의 `ProjectListItem` 인터페이스를 다음으로 교체:

```ts
export interface ProjectListItem {
  slug: string;
  title: string;
  category: string[];
  scope: string;
  status: string;
  featured: boolean;
  stack: string[];
  updatedAt: string;
}
```

- [ ] **Step 2: `listProjects()`가 `stack`을 반환하도록 수정**

`src/lib/projects.ts`의 `listProjects()` 안, `files.map(async (file) => { ... })` 콜백의 `return { ... } satisfies ProjectListItem;` 블록을 다음으로 교체 (frontmatter가 zod 검증 없이 캐스팅만 되므로 `stack`이 배열이 아닐 가능성을 방어):

```ts
      return {
        slug: fm.slug,
        title: fm.title,
        category: fm.category,
        scope: fm.scope,
        status: fm.status,
        featured: fm.featured,
        stack: Array.isArray(fm.stack) ? fm.stack : [],
        updatedAt: commits[0]?.commit.committer?.date ?? "",
      } satisfies ProjectListItem;
```

- [ ] **Step 3: 타입 체크**

Run (repo root `/c/Users/kik32/workspace/profile-admin`): `npx tsc --noEmit`
Expected: 에러 없음 (`ProjectsTable.tsx` 등 기존 `ProjectListItem` 소비처는 구조적 타이핑이라 `stack` 필드가 늘어도 깨지지 않음)

- [ ] **Step 4: Commit**

```bash
git add src/lib/schema/project.ts src/lib/projects.ts
git commit -m "feat: 프로젝트 목록에 stack 필드 노출 (대시보드 분석용)"
```

---

### Task 2: `content-analytics.ts` 순수 집계 함수 구현

**Files:**
- Create: `src/lib/content-analytics.ts`
- Create: `scripts/verify-content-analytics.mjs`
- Modify: `package.json` (scripts에 `verify` 추가)

- [ ] **Step 1: 검증 스크립트를 먼저 작성 (아직 구현 전이라 실패해야 정상)**

`scripts/verify-content-analytics.mjs` 생성:

```js
import assert from "node:assert/strict";
import {
  buildStackAnalytics,
  buildProjectAnalytics,
  buildRecordsAnalytics,
} from "../src/lib/content-analytics.ts";

const stacks = {
  items: [
    { name: "Python", category: "data-ai", featured: true },
    { name: "Pandas", category: "data-ai", featured: false },
    { name: "GhostLib", category: "infra", featured: false },
  ],
};

// project c는 stack이 통째로 없는 경우(frontmatter 이상 데이터)를 시뮬레이션 — 방어 로직 검증용
const projects = [
  {
    slug: "a",
    title: "A",
    category: ["ai-data"],
    scope: "personal",
    status: "published",
    featured: true,
    stack: ["Python", "TypoLib"],
    updatedAt: "2026-01-01",
  },
  {
    slug: "b",
    title: "B",
    category: ["finance"],
    scope: "personal",
    status: "draft",
    featured: false,
    stack: ["Python"],
    updatedAt: "2026-02-01",
  },
  {
    slug: "c",
    title: "C",
    category: ["fullstack"],
    scope: "team",
    status: "draft",
    featured: false,
    stack: undefined,
    updatedAt: "2026-03-01",
  },
];

const stackResult = buildStackAnalytics(stacks, projects);
assert.deepEqual(stackResult.byCategory, [
  { label: "data-ai", count: 2 },
  { label: "infra", count: 1 },
]);
assert.equal(stackResult.featuredCount, 1);
assert.deepEqual(
  stackResult.usage.map((r) => [r.name, r.projectCount]),
  [
    ["Python", 2],
    ["Pandas", 0],
    ["GhostLib", 0],
  ]
);
assert.deepEqual(stackResult.unusedStacks, ["Pandas", "GhostLib"]);
assert.deepEqual(stackResult.unlistedStackNames, ["TypoLib"]);

const projectResult = buildProjectAnalytics(projects);
assert.deepEqual(projectResult.byStatus, [
  { label: "published", count: 1 },
  { label: "draft", count: 2 },
]);
assert.equal(projectResult.featuredCount, 1);
assert.deepEqual(
  projectResult.draftItems.map((p) => p.slug),
  ["b", "c"]
);

const records = {
  intro: {
    badge: "x",
    title: "y",
    description: "z",
    loop: [{ label: "a", description: "b" }],
  },
  items: [
    { date: "2021.03 ~", category: "education", title: "t1", description: "d1" },
    { date: "2025", category: "certification", title: "t2", description: "d2" },
    { date: "no-year-here", category: "activity", title: "t3", description: "d3" },
  ],
};
const recordsResult = buildRecordsAnalytics(records);
assert.deepEqual(recordsResult.byYear, [
  { label: "2021", count: 1 },
  { label: "2025", count: 1 },
  { label: "기타", count: 1 },
]);
assert.deepEqual(recordsResult.byCategory, [
  { label: "education", count: 1 },
  { label: "certification", count: 1 },
  { label: "activity", count: 1 },
]);

console.log("content-analytics.ts 검증 통과");
```

- [ ] **Step 2: 검증 스크립트 실행 — 실패 확인**

Run (repo root): `node scripts/verify-content-analytics.mjs`
Expected: FAIL — `Cannot find module '.../src/lib/content-analytics.ts'` (아직 파일이 없으므로 정상)

- [ ] **Step 3: `content-analytics.ts` 구현**

`src/lib/content-analytics.ts` 생성:

```ts
import type { RecordsData, StacksData } from "./schema/static-data";
import type { ProjectListItem } from "./schema/project";

export interface CategoryCount {
  label: string;
  count: number;
}

export interface StackUsageRow {
  name: string;
  category: string;
  featured: boolean;
  projectCount: number;
}

export interface StackAnalytics {
  byCategory: CategoryCount[];
  featuredCount: number;
  usage: StackUsageRow[];
  unusedStacks: string[];
  unlistedStackNames: string[];
}

// 프로젝트 frontmatter의 stack은 zod 검증 없이 캐스팅만 되어 들어오므로(listProjects) 방어적으로 다룬다
function safeStackNames(project: ProjectListItem): string[] {
  return Array.isArray(project.stack) ? project.stack : [];
}

export function buildStackAnalytics(stacks: StacksData, projects: ProjectListItem[]): StackAnalytics {
  const usageCountByName = new Map<string, number>();
  for (const project of projects) {
    for (const name of safeStackNames(project)) {
      usageCountByName.set(name, (usageCountByName.get(name) ?? 0) + 1);
    }
  }

  const byCategoryMap = new Map<string, number>();
  for (const item of stacks.items) {
    byCategoryMap.set(item.category, (byCategoryMap.get(item.category) ?? 0) + 1);
  }

  const usage: StackUsageRow[] = stacks.items
    .map((item) => ({
      name: item.name,
      category: item.category,
      featured: item.featured,
      projectCount: usageCountByName.get(item.name) ?? 0,
    }))
    .sort((a, b) => b.projectCount - a.projectCount);

  const knownStackNames = new Set(stacks.items.map((item) => item.name));
  const unlistedStackNames = [
    ...new Set(
      projects.flatMap((project) => safeStackNames(project)).filter((name) => !knownStackNames.has(name))
    ),
  ];

  return {
    byCategory: [...byCategoryMap.entries()].map(([label, count]) => ({ label, count })),
    featuredCount: stacks.items.filter((item) => item.featured).length,
    usage,
    unusedStacks: usage.filter((row) => row.projectCount === 0).map((row) => row.name),
    unlistedStackNames,
  };
}

export interface ProjectAnalytics {
  byCategory: CategoryCount[];
  byStatus: CategoryCount[];
  featuredCount: number;
  draftItems: ProjectListItem[];
}

export function buildProjectAnalytics(projects: ProjectListItem[]): ProjectAnalytics {
  const byCategoryMap = new Map<string, number>();
  const byStatusMap = new Map<string, number>();
  for (const project of projects) {
    for (const category of project.category) {
      byCategoryMap.set(category, (byCategoryMap.get(category) ?? 0) + 1);
    }
    byStatusMap.set(project.status, (byStatusMap.get(project.status) ?? 0) + 1);
  }

  return {
    byCategory: [...byCategoryMap.entries()].map(([label, count]) => ({ label, count })),
    byStatus: [...byStatusMap.entries()].map(([label, count]) => ({ label, count })),
    featuredCount: projects.filter((project) => project.featured).length,
    draftItems: projects.filter((project) => project.status === "draft"),
  };
}

export interface RecordsAnalytics {
  byYear: CategoryCount[];
  byCategory: CategoryCount[];
}

export const OTHER_YEAR_LABEL = "기타";

// records.yml의 date는 자유 텍스트("2021.03 ~", "2025", "2026.03 ~ 2026.06")라
// 첫 4자리 숫자만 뽑아 연도로 쓰고, 못 찾으면 throw 대신 "기타"로 분류한다
function extractYear(date: string): string {
  const match = date.match(/\d{4}/);
  return match ? match[0] : OTHER_YEAR_LABEL;
}

export function buildRecordsAnalytics(records: RecordsData): RecordsAnalytics {
  const byYearMap = new Map<string, number>();
  const byCategoryMap = new Map<string, number>();
  for (const item of records.items) {
    const year = extractYear(item.date);
    byYearMap.set(year, (byYearMap.get(year) ?? 0) + 1);
    byCategoryMap.set(item.category, (byCategoryMap.get(item.category) ?? 0) + 1);
  }

  const byYear = [...byYearMap.entries()]
    .sort((a, b) => {
      if (a[0] === OTHER_YEAR_LABEL) return 1;
      if (b[0] === OTHER_YEAR_LABEL) return -1;
      return a[0].localeCompare(b[0]);
    })
    .map(([label, count]) => ({ label, count }));

  return {
    byYear,
    byCategory: [...byCategoryMap.entries()].map(([label, count]) => ({ label, count })),
  };
}
```

- [ ] **Step 4: 검증 스크립트 재실행 — 통과 확인**

Run (repo root): `node scripts/verify-content-analytics.mjs`
Expected: `content-analytics.ts 검증 통과` 출력, exit code 0

(참고: Node 24는 `.ts` 파일을 별도 플래그 없이 타입만 지워서 바로 실행한다 — 단, ESM 상대 임포트는 확장자를 명시해야 하므로 검증 스크립트의 `from "../src/lib/content-analytics.ts"`처럼 `.ts`를 반드시 붙인다.)

- [ ] **Step 5: `package.json`에 `verify` 스크립트 추가**

`package.json`의 `"scripts"` 블록에 `"lint": "eslint"` 다음 줄로 추가:

```json
    "verify": "node scripts/verify-content-analytics.mjs"
```

- [ ] **Step 6: `npm run verify`로도 동일하게 통과하는지 확인**

Run: `npm run verify`
Expected: `content-analytics.ts 검증 통과`

- [ ] **Step 7: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 8: Commit**

```bash
git add src/lib/content-analytics.ts scripts/verify-content-analytics.mjs package.json
git commit -m "feat: 스택/프로젝트/records 집계 순수 함수(content-analytics) 추가"
```

---

### Task 3: `StatCard` 공용 컴포넌트로 추출

**Files:**
- Create: `src/components/StatCard.tsx`

- [ ] **Step 1: 기존 `page.tsx`의 `StatCard` 함수를 그대로 옮겨 새 파일 작성**

`src/components/StatCard.tsx` 생성:

```tsx
export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <p className="text-xs text-black/50 dark:text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-black/40 dark:text-white/40">{sub}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/StatCard.tsx
git commit -m "refactor: StatCard를 발행/분석 섹션 공용 컴포넌트로 추출"
```

(이 시점엔 아직 `page.tsx`가 옛 `StatCard`를 그대로 쓰고 있어 빌드는 여전히 성공한다 — 배선은 Task 9에서.)

---

### Task 4: `SectionErrorNotice` 구현

**Files:**
- Create: `src/components/SectionErrorNotice.tsx`

- [ ] **Step 1: 구현**

```tsx
// Promise.allSettled로 개별 데이터 소스가 실패했을 때 섹션 단위로 보여주는 인라인 오류 —
// 전체 페이지를 죽이지 않고 실패한 부분만 알린다 (스키마 drift로 /data/stacks 전체가 죽었던 버그 재발 방지)
export function SectionErrorNotice({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
      {label} 데이터를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SectionErrorNotice.tsx
git commit -m "feat: 섹션별 fetch 실패 알림 컴포넌트 추가"
```

---

### Task 5: `DashboardTabs` 구현

**Files:**
- Create: `src/components/DashboardTabs.tsx`

- [ ] **Step 1: 구현**

```tsx
"use client";

import { useState, type ReactNode } from "react";

const TABS = [
  { id: "publish", label: "발행" },
  { id: "analytics", label: "콘텐츠 분석" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface DashboardTabsProps {
  publish: ReactNode;
  analytics: ReactNode;
}

// 콘텐츠 분석 탭 신설(세션 14 피드백) — 두 섹션 모두 서버에서 미리 렌더링해 두고
// display로만 전환한다(언마운트하지 않음 — ProjectStatusFilterTable의 필터 상태가 탭 전환 후에도 유지됨)
export function DashboardTabs({ publish, analytics }: DashboardTabsProps) {
  const [active, setActive] = useState<TabId>("publish");

  return (
    <div>
      <div className="mb-6 flex gap-2 border-b border-black/10 dark:border-white/15">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`px-3 py-2 text-sm font-medium ${
              active === tab.id
                ? "border-b-2 border-black text-black dark:border-white dark:text-white"
                : "text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ display: active === "publish" ? "block" : "none" }}>{publish}</div>
      <div style={{ display: active === "analytics" ? "block" : "none" }}>{analytics}</div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/DashboardTabs.tsx
git commit -m "feat: 대시보드 발행/콘텐츠 분석 탭 토글 컴포넌트 추가"
```

---

### Task 6: `ProjectStatusFilterTable` 구현

**Files:**
- Create: `src/components/ProjectStatusFilterTable.tsx`

- [ ] **Step 1: 구현 (기존 `ProjectsTable.tsx`의 `useState`+`useMemo` 필터 패턴을 따름)**

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProjectListItem } from "@/lib/schema/project";

const CATEGORY_OPTIONS = ["all", "ai-data", "finance", "fullstack"] as const;

// 관리 누락(draft) 프로젝트 점검용 축소판 표 — 카테고리 필터만 지원 (세션 14 대시보드 분석 탭)
export function ProjectStatusFilterTable({ projects }: { projects: ProjectListItem[] }) {
  const [categoryFilter, setCategoryFilter] = useState<(typeof CATEGORY_OPTIONS)[number]>("all");

  const filtered = useMemo(() => {
    if (categoryFilter === "all") return projects;
    return projects.filter((project) => project.category.includes(categoryFilter));
  }, [projects, categoryFilter]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {CATEGORY_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setCategoryFilter(option)}
            className={`rounded-full border px-3 py-1 text-xs ${
              categoryFilter === option
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/15 text-black/60 hover:border-black/30 dark:border-white/20 dark:text-white/60"
            }`}
          >
            {option === "all" ? "전체" : option}
          </button>
        ))}
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-black/10 text-black/50 dark:border-white/15 dark:text-white/50">
            <th className="py-2 font-normal">제목</th>
            <th className="py-2 font-normal">category</th>
            <th className="py-2 font-normal">수정일</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((project) => (
            <tr key={project.slug} className="border-b border-black/5 dark:border-white/10">
              <td className="py-2">
                <Link href={`/projects/${project.slug}`} className="hover:underline">
                  {project.title}
                </Link>
              </td>
              <td className="py-2">{project.category.join(", ")}</td>
              <td className="py-2 text-black/50 dark:text-white/50">
                {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString("ko-KR") : "-"}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={3} className="py-6 text-center text-black/40 dark:text-white/40">
                관리 누락 프로젝트가 없습니다
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/ProjectStatusFilterTable.tsx
git commit -m "feat: draft 프로젝트 카테고리 필터 표 추가"
```

---

### Task 7: `PublishSection`으로 기존 발행 섹션 이전 (동작 변화 없는 리팩터링)

**Files:**
- Create: `src/components/PublishSection.tsx`

- [ ] **Step 1: 구현 — 기존 `page.tsx` 본문(요약 카드~PR 이력 표)을 그대로 옮기되, `runsFailed`/`postsFailed`/`prsFailed` prop으로 섹션별 오류 배너를 추가**

```tsx
import { StatCard } from "./StatCard";
import { SectionErrorNotice } from "./SectionErrorNotice";
import { StackedBarChart } from "./StackedBarChart";
import { StatusBadge, statusDotClass } from "./StatusBadge";
import type { AdminPrSummary, PostStatusRow, WorkflowRunSummary } from "@/lib/dashboard";

const WORKFLOW_LABELS: Record<string, string> = {
  "velog-publish": "velog 발행",
  "deploy-site": "사이트 배포",
  "blog-post": "README 최신글",
};

const CONCLUSION_LABELS: Record<string, string> = {
  success: "성공",
  failure: "실패",
  cancelled: "취소",
  skipped: "건너뜀",
  action_required: "승인 대기",
};

const PR_STATE_LABELS: Record<string, string> = {
  open: "열림",
  merged: "병합됨",
  closed: "닫힘(미병합)",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-black/25 dark:bg-white/25",
  ready: "bg-amber-500",
  published: "bg-green-500",
  synced: "bg-green-600",
};

interface PublishSectionProps {
  runs: WorkflowRunSummary[];
  posts: PostStatusRow[];
  prs: AdminPrSummary[];
  runsFailed: boolean;
  postsFailed: boolean;
  prsFailed: boolean;
}

// 기존 /dashboard 발행 섹션(FR-M20) — 세션 14에서 page.tsx 밖으로 추출해 탭 조립을 단순화
export function PublishSection({ runs, posts, prs, runsFailed, postsFailed, prsFailed }: PublishSectionProps) {
  const workflows = Object.keys(WORKFLOW_LABELS);

  const exposedCount = posts.filter((p) => p.siteExposed).length;
  const velogCount = posts.filter((p) => p.hasVelogUrl).length;
  const completedRuns = runs.filter((r) => r.status === "completed" && r.conclusion);
  const successRuns = completedRuns.filter((r) => r.conclusion === "success");
  const successRate = completedRuns.length > 0 ? Math.round((successRuns.length / completedRuns.length) * 100) : null;

  const statusCounts = ["draft", "ready", "published", "synced"].map((status) => ({
    label: status,
    count: posts.filter((p) => p.status === status).length,
    colorClass: STATUS_COLORS[status],
  }));

  return (
    <div className="grid gap-8">
      <section>
        <h1 className="mb-4 text-lg font-semibold">Dashboard</h1>
        {postsFailed && <SectionErrorNotice label="글 상태" />}
        {runsFailed && <SectionErrorNotice label="워크플로 실행 이력" />}
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <StatCard label="총 글" value={`${posts.length}개`} />
          <StatCard label="사이트 노출" value={`${exposedCount}개`} sub={ratioText(exposedCount, posts.length)} />
          <StatCard label="velog 발행 완료" value={`${velogCount}개`} sub={ratioText(velogCount, posts.length)} />
          <StatCard
            label="최근 워크플로 성공률"
            value={successRate === null ? "-" : `${successRate}%`}
            sub={`최근 ${completedRuns.length}건 기준`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">워크플로 실행 이력</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {workflows.map((workflow) => {
            const workflowRuns = runs.filter((run) => run.workflow === workflow);
            const latest = workflowRuns[0];
            const history = [...workflowRuns].reverse();

            return (
              <div key={workflow} className="rounded-lg border border-black/10 p-4 dark:border-white/15">
                <h3 className="mb-2 text-sm font-semibold">{WORKFLOW_LABELS[workflow]}</h3>

                {latest ? (
                  <div className="mb-3 flex items-center gap-2">
                    <StatusBadge
                      label={
                        latest.status === "completed"
                          ? (CONCLUSION_LABELS[latest.conclusion ?? ""] ?? latest.conclusion ?? "-")
                          : "진행 중"
                      }
                      tone={latest.status === "completed" ? (latest.conclusion ?? "unknown") : "in_progress"}
                    />
                    <span className="text-xs text-black/40 dark:text-white/40">
                      {new Date(latest.createdAt).toLocaleString("ko-KR")}
                    </span>
                  </div>
                ) : (
                  <p className="mb-3 text-xs text-black/40 dark:text-white/40">실행 이력 없음</p>
                )}

                <div className="flex gap-1">
                  {history.map((run) => (
                    <a
                      key={run.htmlUrl}
                      href={run.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      title={`#${run.runNumber} · ${run.conclusion ?? run.status} · ${new Date(run.createdAt).toLocaleString("ko-KR")}`}
                      className={`block h-4 w-4 shrink-0 rounded-sm ${statusDotClass(run.status === "completed" ? (run.conclusion ?? "unknown") : "in_progress")}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">글 상태 분포</h2>
        <StackedBarChart segments={statusCounts} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">글별 상태 ({posts.length})</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-black/50 dark:border-white/15 dark:text-white/50">
              <th className="py-2 font-normal">제목</th>
              <th className="py-2 font-normal">status</th>
              <th className="py-2 font-normal">velog_url</th>
              <th className="py-2 font-normal">사이트 노출</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.slug} className="border-b border-black/5 dark:border-white/10">
                <td className="py-2">{post.title}</td>
                <td className="py-2">
                  <StatusBadge label={post.status} tone={post.status} />
                </td>
                <td className="py-2">{post.hasVelogUrl ? "O" : "-"}</td>
                <td className="py-2">{post.siteExposed ? "O" : "-"}</td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-black/40 dark:text-white/40">
                  게시글이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">admin PR 이력 ({prs.length})</h2>
        {prsFailed && <SectionErrorNotice label="admin PR 이력" />}
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-black/50 dark:border-white/15 dark:text-white/50">
              <th className="py-2 font-normal">제목</th>
              <th className="py-2 font-normal">브랜치</th>
              <th className="py-2 font-normal">상태</th>
              <th className="py-2 font-normal">생성일</th>
            </tr>
          </thead>
          <tbody>
            {prs.map((pr) => (
              <tr key={pr.number} className="border-b border-black/5 dark:border-white/10">
                <td className="py-2">
                  <a href={pr.htmlUrl} target="_blank" rel="noreferrer" className="hover:underline">
                    #{pr.number} {pr.title}
                  </a>
                </td>
                <td className="py-2 text-black/50 dark:text-white/50">{pr.branch}</td>
                <td className="py-2">
                  <StatusBadge label={PR_STATE_LABELS[pr.state]} tone={pr.state} />
                </td>
                <td className="py-2 text-black/50 dark:text-white/50">
                  {new Date(pr.createdAt).toLocaleDateString("ko-KR")}
                </td>
              </tr>
            ))}
            {prs.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-black/40 dark:text-white/40">
                  PR 이력이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ratioText(count: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}
```

- [ ] **Step 2: 타입 체크 (아직 `page.tsx`는 옛 코드를 그대로 쓰므로 새 파일이 단순히 추가되는 것만 확인)**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/PublishSection.tsx
git commit -m "refactor: 발행 섹션을 PublishSection 컴포넌트로 추출"
```

---

### Task 8: `ContentAnalyticsSection` 구현 (신규 분석 탭)

**Files:**
- Create: `src/components/ContentAnalyticsSection.tsx`

- [ ] **Step 1: 구현**

```tsx
import { StatCard } from "./StatCard";
import { SectionErrorNotice } from "./SectionErrorNotice";
import { StackedBarChart } from "./StackedBarChart";
import { ProjectStatusFilterTable } from "./ProjectStatusFilterTable";
import type { CategoryCount, ProjectAnalytics, RecordsAnalytics, StackAnalytics } from "@/lib/content-analytics";
import type { ProjectListItem } from "@/lib/schema/project";

const STACK_CATEGORY_COLORS: Record<string, string> = {
  "data-ai": "bg-blue-500",
  backend: "bg-green-500",
  frontend: "bg-purple-500",
  infra: "bg-amber-500",
  "ai-tooling": "bg-pink-500",
};

const PROJECT_CATEGORY_COLORS: Record<string, string> = {
  "ai-data": "bg-blue-500",
  finance: "bg-amber-500",
  fullstack: "bg-purple-500",
};

const RECORD_CATEGORY_COLORS: Record<string, string> = {
  education: "bg-black/25 dark:bg-white/25",
  certification: "bg-blue-500",
  activity: "bg-green-500",
  bootcamp: "bg-purple-500",
  competition: "bg-amber-500",
  project: "bg-pink-500",
};

const YEAR_COLOR_PALETTE = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-cyan-500",
];

function toSegments(counts: CategoryCount[], colorMap: Record<string, string>) {
  return counts.map((c) => ({
    label: c.label,
    count: c.count,
    colorClass: colorMap[c.label] ?? "bg-black/20 dark:bg-white/20",
  }));
}

function toYearSegments(counts: CategoryCount[]) {
  return counts.map((c, i) => ({
    label: c.label,
    count: c.count,
    colorClass: YEAR_COLOR_PALETTE[i % YEAR_COLOR_PALETTE.length],
  }));
}

interface ContentAnalyticsSectionProps {
  stackAnalytics: StackAnalytics | null;
  projectAnalytics: ProjectAnalytics;
  recordsAnalytics: RecordsAnalytics | null;
  projects: ProjectListItem[];
  stacksFailed: boolean;
  projectsFailed: boolean;
  recordsFailed: boolean;
}

// 콘텐츠 분석 탭(세션 14 피드백) — 우선순위: ① 포트폴리오 균형 ② featured/공개 상태 점검 ③ 성장 추이
export function ContentAnalyticsSection({
  stackAnalytics,
  projectAnalytics,
  recordsAnalytics,
  projects,
  stacksFailed,
  projectsFailed,
  recordsFailed,
}: ContentAnalyticsSectionProps) {
  return (
    <div className="grid gap-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold">① 포트폴리오 균형</h2>
        {stacksFailed && <SectionErrorNotice label="스택" />}
        {projectsFailed && <SectionErrorNotice label="프로젝트" />}
        {stackAnalytics ? (
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs text-black/50 dark:text-white/50">스택 카테고리 분포</p>
                <StackedBarChart segments={toSegments(stackAnalytics.byCategory, STACK_CATEGORY_COLORS)} />
              </div>
              <div>
                <p className="mb-2 text-xs text-black/50 dark:text-white/50">프로젝트 카테고리 분포</p>
                <StackedBarChart segments={toSegments(projectAnalytics.byCategory, PROJECT_CATEGORY_COLORS)} />
              </div>
            </div>

            {stackAnalytics.unlistedStackNames.length > 0 && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
                프로젝트에서 쓰였지만 stacks.yml에 등록되지 않은 이름: {stackAnalytics.unlistedStackNames.join(", ")}
              </div>
            )}

            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-black/50 dark:border-white/15 dark:text-white/50">
                  <th className="py-2 font-normal">스택</th>
                  <th className="py-2 font-normal">category</th>
                  <th className="py-2 font-normal">featured</th>
                  <th className="py-2 font-normal">사용 프로젝트 수</th>
                </tr>
              </thead>
              <tbody>
                {stackAnalytics.usage.map((row) => (
                  <tr key={row.name} className="border-b border-black/5 dark:border-white/10">
                    <td className="py-2">{row.name}</td>
                    <td className="py-2">{row.category}</td>
                    <td className="py-2">{row.featured ? "✓" : ""}</td>
                    <td className="py-2">
                      {row.projectCount}
                      {row.projectCount === 0 && (
                        <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs text-black/50 dark:bg-white/10 dark:text-white/50">
                          미사용
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-black/40 dark:text-white/40">스택 데이터가 없습니다</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">② featured/공개 상태 점검</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="총 프로젝트" value={`${projects.length}개`} />
          <StatCard label="featured 프로젝트" value={`${projectAnalytics.featuredCount}개`} />
          <StatCard label="draft 프로젝트" value={`${projectAnalytics.draftItems.length}개`} />
          <StatCard
            label="featured 스택 비율"
            value={stackAnalytics ? `${stackAnalytics.featuredCount}/${stackAnalytics.usage.length}` : "-"}
          />
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs text-black/50 dark:text-white/50">관리 누락 프로젝트 (draft)</p>
          <ProjectStatusFilterTable projects={projectAnalytics.draftItems} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">③ 성장 추이</h2>
        {recordsFailed && <SectionErrorNotice label="Records" />}
        {recordsAnalytics ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs text-black/50 dark:text-white/50">연도별 활동</p>
              <StackedBarChart segments={toYearSegments(recordsAnalytics.byYear)} />
            </div>
            <div>
              <p className="mb-2 text-xs text-black/50 dark:text-white/50">카테고리별 활동</p>
              <StackedBarChart segments={toSegments(recordsAnalytics.byCategory, RECORD_CATEGORY_COLORS)} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-black/40 dark:text-white/40">Records 데이터가 없습니다</p>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/ContentAnalyticsSection.tsx
git commit -m "feat: 콘텐츠 분석 탭 UI(스택/프로젝트/records 3섹션) 구현"
```

---

### Task 9: `dashboard/page.tsx` 재작성 — `allSettled` fetch + 탭 조립

**Files:**
- Modify: `src/app/(admin)/dashboard/page.tsx` (전체 교체)

- [ ] **Step 1: 전체 파일 교체**

```tsx
import { listAdminPullRequests, listPostsStatusMatrix, listRecentWorkflowRuns } from "@/lib/dashboard";
import { getRecordsData, getStacksData } from "@/lib/static-data";
import { listProjects } from "@/lib/projects";
import { buildProjectAnalytics, buildRecordsAnalytics, buildStackAnalytics } from "@/lib/content-analytics";
import { DashboardTabs } from "@/components/DashboardTabs";
import { PublishSection } from "@/components/PublishSection";
import { ContentAnalyticsSection } from "@/components/ContentAnalyticsSection";

export const dynamic = "force-dynamic";

// A-05 발행 대시보드(FR-M20) + 콘텐츠 분석 탭(세션 14 피드백)
// Promise.allSettled로 6개 데이터 소스를 섹션 단위로 격리 — 하나가 실패해도 나머지는 정상 렌더링
export default async function DashboardPage() {
  const [runsR, postsR, prsR, stacksR, projectsR, recordsR] = await Promise.allSettled([
    listRecentWorkflowRuns(),
    listPostsStatusMatrix(),
    listAdminPullRequests(),
    getStacksData(),
    listProjects(),
    getRecordsData(),
  ]);

  const runs = runsR.status === "fulfilled" ? runsR.value : [];
  const posts = postsR.status === "fulfilled" ? postsR.value : [];
  const prs = prsR.status === "fulfilled" ? prsR.value : [];
  const stacksRecord = stacksR.status === "fulfilled" ? stacksR.value : null;
  const projects = projectsR.status === "fulfilled" ? projectsR.value : [];
  const recordsRecord = recordsR.status === "fulfilled" ? recordsR.value : null;

  const stackAnalytics = stacksRecord ? buildStackAnalytics(stacksRecord.data, projects) : null;
  const projectAnalytics = buildProjectAnalytics(projects);
  const recordsAnalytics = recordsRecord ? buildRecordsAnalytics(recordsRecord.data) : null;

  return (
    <DashboardTabs
      publish={
        <PublishSection
          runs={runs}
          posts={posts}
          prs={prs}
          runsFailed={runsR.status === "rejected"}
          postsFailed={postsR.status === "rejected"}
          prsFailed={prsR.status === "rejected"}
        />
      }
      analytics={
        <ContentAnalyticsSection
          stackAnalytics={stackAnalytics}
          projectAnalytics={projectAnalytics}
          recordsAnalytics={recordsAnalytics}
          projects={projects}
          stacksFailed={stacksR.status === "rejected"}
          projectsFailed={projectsR.status === "rejected"}
          recordsFailed={recordsR.status === "rejected"}
        />
      }
    />
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add "src/app/(admin)/dashboard/page.tsx"
git commit -m "feat: 대시보드에 콘텐츠 분석 탭 배선 (allSettled 기반 섹션 격리)"
```

---

### Task 10: 전체 검증 + PR

**Files:** 없음 (검증·PR만)

- [ ] **Step 1: 전체 빌드**

Run (repo root): `npm run build`
Expected: `✓ Compiled successfully`, `/dashboard` 라우트가 `ƒ` (dynamic)로 목록에 나타남, 에러 없음

- [ ] **Step 2: 린트**

Run: `npm run lint`
Expected: 에러 없음 (경고도 없어야 기존 CI 기준과 동일)

- [ ] **Step 3: 순수 함수 회귀 검증 재확인**

Run: `npm run verify`
Expected: `content-analytics.ts 검증 통과`

- [ ] **Step 4: 원격 브랜치로 push**

```bash
git push -u origin feat/dashboard-content-analytics
```

- [ ] **Step 5: PR 생성 (본문에 로그인 게이트 제약 명시 — FR-M16으로 실사용 화면 확인 불가)**

```bash
gh pr create --title "feat: Dashboard 콘텐츠 분석 탭 추가 (스택/프로젝트/records)" --body "$(cat <<'EOF'
## 요약
- 관리자 Dashboard가 "글 작성" 통계뿐이라는 피드백에 따라 "콘텐츠 분석" 탭을 추가했다.
- 우선순위: ① 포트폴리오 균형(스택·프로젝트 카테고리 분포, 스택 사용 빈도, 정합성 경고) ② featured/공개 상태 점검(draft 프로젝트 카테고리 필터) ③ 성장 추이(records 연도·카테고리별).
- 6개 데이터 소스를 Promise.allSettled로 섹션 단위 격리해, 하나가 실패해도 대시보드 전체가 죽지 않게 했다 (Stacks 페이지 크래시와 같은 실패 패턴 방지).
- 설계 문서: `docs/superpowers/specs/2026-07-06-dashboard-content-analytics-design.md`

## 검증
- [x] `npm run build`
- [x] `npm run lint`
- [x] `npm run verify` (content-analytics.ts 순수 함수 회귀 스크립트)
- [ ] (사용자) 로그인 후 `/dashboard` 콘텐츠 분석 탭 실제 렌더 확인 — FR-M16으로 이 세션에서는 로그인 화면 확인 불가
EOF
)"
```

- [ ] **Step 6: squash auto-merge 활성화**

```bash
gh pr merge --squash --auto
```

---

## 완료 기준

- [ ] `/dashboard`에 "발행"/"콘텐츠 분석" 탭이 있고 전환이 즉시 이루어진다 (새로고침 없음)
- [ ] 콘텐츠 분석 탭에 스택/프로젝트/records 3개 섹션이 우선순위 순으로 보인다
- [ ] "관리 누락 프로젝트" 표에 카테고리 필터(전체/ai-data/finance/fullstack)가 동작한다
- [ ] 데이터 소스 6개 중 일부가 실패해도 나머지 섹션은 정상 렌더링된다 (코드 리뷰로 확인 — 로그인 게이트로 실제 장애 재현은 못 함)
- [ ] `npm run build` / `npm run lint` / `npm run verify` 모두 통과
- [ ] PR 생성 + squash auto-merge 활성화

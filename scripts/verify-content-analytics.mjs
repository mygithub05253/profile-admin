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

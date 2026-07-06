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

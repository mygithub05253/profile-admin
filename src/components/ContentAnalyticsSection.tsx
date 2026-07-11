import { StatCard } from "./StatCard";
import { AnalyticsError } from "./AnalyticsStatus";
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
        {stacksFailed && <AnalyticsError label="스택" />}
        {projectsFailed && <AnalyticsError label="프로젝트" />}
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
        {recordsFailed && <AnalyticsError label="Records" />}
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

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

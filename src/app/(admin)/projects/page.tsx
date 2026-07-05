import Link from "next/link";
import { listProjects } from "@/lib/projects";
import { ProjectsTable } from "@/components/ProjectsTable";

export const dynamic = "force-dynamic";

// A-02 프로젝트 관리 목록
export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Projects ({projects.length})</h1>
        <div className="flex gap-2">
          <Link
            href="/projects/import"
            className="rounded-lg border border-black/15 px-4 py-2 text-sm dark:border-white/20"
          >
            GitHub에서 가져오기
          </Link>
          <Link
            href="/projects/new"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            + 새 프로젝트
          </Link>
        </div>
      </div>
      <ProjectsTable projects={projects} />
    </div>
  );
}

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

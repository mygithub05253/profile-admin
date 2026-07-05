"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProjectListItem } from "@/lib/schema/project";

// A-02 프로젝트 관리 목록 — 검색(제목)·필터(status/category) (관리자 UI 설계서 §3)
export function ProjectsTable({ projects }: { projects: ProjectListItem[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const matchesQuery = project.title.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [projects, query, statusFilter]);

  return (
    <div>
      <div className="mb-4 flex gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목 검색"
          className="rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm dark:border-white/20"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm dark:border-white/20"
        >
          <option value="all">전체 status</option>
          <option value="draft">draft</option>
          <option value="published">published</option>
        </select>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-black/10 text-black/50 dark:border-white/15 dark:text-white/50">
            <th className="py-2 font-normal">제목</th>
            <th className="py-2 font-normal">category</th>
            <th className="py-2 font-normal">scope</th>
            <th className="py-2 font-normal">status</th>
            <th className="py-2 font-normal">featured</th>
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
              <td className="py-2">{project.scope}</td>
              <td className="py-2">{project.status}</td>
              <td className="py-2">{project.featured ? "✓" : ""}</td>
              <td className="py-2 text-black/50 dark:text-white/50">
                {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString("ko-KR") : "-"}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-black/40 dark:text-white/40">
                결과 없음
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

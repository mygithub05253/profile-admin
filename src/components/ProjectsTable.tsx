"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ProjectListItem } from "@/lib/schema/project";
import { DataTable, type DataTableColumn } from "./DataTable";
import { SearchBar } from "./SearchBar";
import { Pagination } from "./Pagination";

const PAGE_SIZE = 10;

// A-02 프로젝트 관리 목록 — 검색(제목)·필터(status/category) (관리자 UI 설계서 §3)
export function ProjectsTable({ projects }: { projects: ProjectListItem[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const matchesQuery = project.title.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [projects, query, statusFilter]);

  // 검색/필터가 바뀌면 이전 페이지가 범위를 벗어날 수 있으니 0으로 리셋
  useEffect(() => setPage(0), [query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const columns: DataTableColumn<ProjectListItem>[] = [
    {
      key: "title",
      header: "제목",
      cell: (project) => (
        <Link href={`/projects/${project.slug}`} className="hover:underline">
          {project.title}
        </Link>
      ),
    },
    { key: "category", header: "category", cell: (project) => project.category.join(", ") },
    { key: "scope", header: "scope", cell: (project) => project.scope },
    { key: "status", header: "status", cell: (project) => project.status },
    { key: "featured", header: "featured", cell: (project) => (project.featured ? "✓" : "") },
    {
      key: "updatedAt",
      header: "수정일",
      cell: (project) => (project.updatedAt ? new Date(project.updatedAt).toLocaleDateString("ko-KR") : "-"),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchBar value={query} onChange={setQuery} placeholder="제목 검색" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          <option value="all">전체 status</option>
          <option value="draft">draft</option>
          <option value="published">published</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={paged}
        rowKey={(project) => project.slug}
        emptyState="결과 없음"
      />
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

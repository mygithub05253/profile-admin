"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DraftListItem } from "@/lib/schema/post";
import { DataTable, type DataTableColumn } from "./DataTable";
import { SearchBar } from "./SearchBar";
import { Pagination } from "./Pagination";

const PAGE_SIZE = 10;

// A-04 초안 관리 목록 — 검색(제목)·필터(status) (관리자 UI 설계서 §5)
export function DraftsTable({ drafts }: { drafts: DraftListItem[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return drafts.filter((draft) => {
      const matchesQuery = draft.title.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || draft.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [drafts, query, statusFilter]);

  useEffect(() => setPage(0), [query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const columns: DataTableColumn<DraftListItem>[] = [
    {
      key: "title",
      header: "제목",
      cell: (draft) => (
        <Link href={`/drafts/${draft.slug}`} className="hover:underline">
          {draft.title}
        </Link>
      ),
    },
    { key: "status", header: "status", cell: (draft) => draft.status },
    { key: "source", header: "source", cell: (draft) => draft.source },
    { key: "date", header: "date", cell: (draft) => draft.date },
    {
      key: "updatedAt",
      header: "수정일",
      cell: (draft) => (draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString("ko-KR") : "-"),
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
          <option value="ready">ready</option>
          <option value="published">published</option>
          <option value="synced">synced</option>
        </select>
      </div>

      <DataTable columns={columns} data={paged} rowKey={(draft) => draft.slug} emptyState="초안이 없습니다" />
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DraftListItem } from "@/lib/schema/post";

// A-04 초안 관리 목록 — 검색(제목)·필터(status) (관리자 UI 설계서 §5)
export function DraftsTable({ drafts }: { drafts: DraftListItem[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return drafts.filter((draft) => {
      const matchesQuery = draft.title.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || draft.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [drafts, query, statusFilter]);

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
          <option value="ready">ready</option>
          <option value="published">published</option>
          <option value="synced">synced</option>
        </select>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-black/10 text-black/50 dark:border-white/15 dark:text-white/50">
            <th className="py-2 font-normal">제목</th>
            <th className="py-2 font-normal">status</th>
            <th className="py-2 font-normal">source</th>
            <th className="py-2 font-normal">date</th>
            <th className="py-2 font-normal">수정일</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((draft) => (
            <tr key={draft.slug} className="border-b border-black/5 dark:border-white/10">
              <td className="py-2">
                <Link href={`/drafts/${draft.slug}`} className="hover:underline">
                  {draft.title}
                </Link>
              </td>
              <td className="py-2">{draft.status}</td>
              <td className="py-2">{draft.source}</td>
              <td className="py-2">{draft.date}</td>
              <td className="py-2 text-black/50 dark:text-white/50">
                {draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString("ko-KR") : "-"}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-black/40 dark:text-white/40">
                초안이 없습니다
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

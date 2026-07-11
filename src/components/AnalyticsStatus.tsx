"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

// gc-dating-app AnalyticsStatus 패턴 포팅 — Promise.allSettled 실패 섹션에
// "다시 시도"(router.refresh)까지 갖춘 에러 표시. 기존 SectionErrorNotice(정적 문구만) 대체
export function AnalyticsError({ label }: { label: string }) {
  const router = useRouter();
  return (
    <div className="mb-4 flex flex-col items-start gap-2 rounded-md border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-4 w-4" />
        {label} 데이터를 불러오지 못했습니다.
      </span>
      <button
        onClick={() => router.refresh()}
        className="text-xs font-medium text-primary underline underline-offset-2 hover:text-primary/80"
      >
        다시 시도
      </button>
    </div>
  );
}

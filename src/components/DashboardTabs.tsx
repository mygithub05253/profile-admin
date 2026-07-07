"use client";

import { useState, type ReactNode } from "react";

const TABS = [
  { id: "publish", label: "발행" },
  { id: "analytics", label: "콘텐츠 분석" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface DashboardTabsProps {
  publish: ReactNode;
  analytics: ReactNode;
}

// 콘텐츠 분석 탭 신설(세션 14 피드백) — 두 섹션 모두 서버에서 미리 렌더링해 두고
// display로만 전환한다(언마운트하지 않음 — ProjectStatusFilterTable의 필터 상태가 탭 전환 후에도 유지됨)
export function DashboardTabs({ publish, analytics }: DashboardTabsProps) {
  const [active, setActive] = useState<TabId>("publish");

  return (
    <div>
      <div className="mb-6 flex gap-2 border-b border-black/10 dark:border-white/15">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`px-3 py-2 text-sm font-medium ${
              active === tab.id
                ? "border-b-2 border-black text-black dark:border-white dark:text-white"
                : "text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ display: active === "publish" ? "block" : "none" }}>{publish}</div>
      <div style={{ display: active === "analytics" ? "block" : "none" }}>{analytics}</div>
    </div>
  );
}

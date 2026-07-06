import Link from "next/link";

// FR-M23 §23 — 정적 데이터 편집 진입점
export default function DataIndexPage() {
  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">정적 데이터</h1>
      <p className="mb-6 text-sm text-black/60 dark:text-white/60">
        홈 화면에 노출되는 프로필·기술 스택·성장 기록을 편집합니다. content-hub{" "}
        <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">data/*.yml</code>을 직접 수정하는 것과
        동일하며, 저장하면 PR이 생성되고 CI 통과 시 자동 병합됩니다.
      </p>
      <div className="grid max-w-md gap-3">
        <Link
          href="/data/profile"
          className="rounded-lg border border-black/10 p-4 hover:border-black/30 dark:border-white/15 dark:hover:border-white/40"
        >
          <p className="font-medium">Profile</p>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">이름·소개·연락처·About 강점 카드 5종</p>
        </Link>
        <Link
          href="/data/stacks"
          className="rounded-lg border border-black/10 p-4 hover:border-black/30 dark:border-white/15 dark:hover:border-white/40"
        >
          <p className="font-medium">Stacks</p>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">Core Stack 바에 노출되는 기술 스택 목록</p>
        </Link>
        <Link
          href="/data/records"
          className="rounded-lg border border-black/10 p-4 hover:border-black/30 dark:border-white/15 dark:hover:border-white/40"
        >
          <p className="font-medium">Records</p>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">Growth Map 소개 + 성장 타임라인</p>
        </Link>
      </div>
    </div>
  );
}

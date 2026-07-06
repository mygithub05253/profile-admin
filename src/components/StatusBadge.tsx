// 대시보드·목록 전반에서 재사용하는 상태 배지 — 텍스트만 나열되던 것을 색으로 구분되게 함
const TONE_CLASS: Record<string, string> = {
  success: "bg-green-500/15 text-green-600 dark:text-green-400",
  published: "bg-green-500/15 text-green-600 dark:text-green-400",
  synced: "bg-green-500/15 text-green-600 dark:text-green-400",
  merged: "bg-green-500/15 text-green-600 dark:text-green-400",
  failure: "bg-red-500/15 text-red-600 dark:text-red-400",
  high: "bg-red-500/15 text-red-600 dark:text-red-400",
  action_required: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  ready: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  in_progress: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  open: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  resolved: "bg-green-500/15 text-green-600 dark:text-green-400",
};

const DEFAULT_TONE_CLASS = "bg-black/10 text-black/50 dark:bg-white/10 dark:text-white/50";

export function StatusBadge({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASS[tone] ?? DEFAULT_TONE_CLASS}`}>
      {label}
    </span>
  );
}

export function statusDotClass(tone: string): string {
  return (TONE_CLASS[tone] ?? DEFAULT_TONE_CLASS).split(" ")[0];
}

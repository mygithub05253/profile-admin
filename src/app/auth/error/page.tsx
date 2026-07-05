// FR-M16: allowlist 밖 접근 — 사유 미노출 403 고정 문구 (관리자 UI 설계서 §2)
export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-black/10 p-8 text-center shadow-sm dark:border-white/15">
        <h1 className="mb-2 text-xl font-semibold">403</h1>
        <p className="text-sm text-black/60 dark:text-white/60">접근 권한이 없습니다</p>
      </div>
    </main>
  );
}

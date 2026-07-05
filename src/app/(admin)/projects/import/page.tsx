"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IMPORT_PREFILL_KEY } from "@/lib/import-prefill-key";

// [GitHub에서 가져오기] 진입점 (FR-M10 §10 Step 3) — owner/repo 직접 입력
export default function ImportProjectPage() {
  const router = useRouter();
  const [repo, setRepo] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/github-import?repo=${encodeURIComponent(repo.trim())}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.message ?? "레포를 찾을 수 없습니다");
        setPending(false);
        return;
      }
      sessionStorage.setItem(IMPORT_PREFILL_KEY, JSON.stringify(json));
      router.push("/projects/new");
    } catch {
      setError("네트워크 오류로 조회하지 못했습니다");
      setPending(false);
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="mb-6 text-lg font-semibold">GitHub에서 가져오기</h1>
      <label className="mb-1 block text-sm font-medium">저장소 (owner/repo)</label>
      <input
        value={repo}
        onChange={(e) => setRepo(e.target.value)}
        placeholder="mygithub05253/content-hub"
        className="mb-3 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
      />
      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
      <button
        type="button"
        onClick={handleImport}
        disabled={!repo.trim() || pending}
        className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "조회 중..." : "가져오기"}
      </button>
      <p className="mt-4 text-xs text-black/40 dark:text-white/40">
        title·slug·github·repoVisibility·period·stack·summary가 자동 채워집니다. category·scope·featured·order는
        직접 선택해주세요.
      </p>
    </div>
  );
}

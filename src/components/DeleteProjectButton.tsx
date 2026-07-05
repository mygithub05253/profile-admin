"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteProjectButtonProps {
  slug: string;
  sha: string;
}

// 삭제 = 확인 모달 + slug 재입력 (파괴 조작 2중 확인, 관리자 기능명세서 §17 Step 7)
export function DeleteProjectButton({ slug, sha }: DeleteProjectButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sha }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message ?? "삭제 중 오류가 발생했습니다");
        setPending(false);
        return;
      }
      window.alert(`삭제 PR이 생성되었습니다: ${json.prUrl}`);
      router.push("/projects");
      router.refresh();
    } catch {
      setError("네트워크 오류로 삭제하지 못했습니다");
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10"
      >
        삭제
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 dark:bg-zinc-900">
        <h2 className="mb-2 text-base font-semibold">프로젝트 삭제</h2>
        <p className="mb-3 text-sm text-black/60 dark:text-white/60">
          되돌릴 수 없습니다. 계속하려면 slug <code className="font-mono">{slug}</code>를 정확히 입력하세요.
        </p>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="mb-3 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
        />
        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
          >
            취소
          </button>
          <button
            type="button"
            disabled={typed !== slug || pending}
            onClick={handleDelete}
            className="rounded-md bg-red-500 px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            {pending ? "삭제 중..." : "삭제 확정"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { compressImageBlob, blobToBase64, sanitizeBaseName, MAX_BYTES } from "@/lib/image-compress";
import type { StagedImage } from "./ImageDropzone";

interface ReadmeCandidate {
  url: string;
  alt: string;
}

interface ReadmeImageGalleryProps {
  github: string;
  slug: string;
  onAdopt: (image: StagedImage) => void;
}

// FR-M24: 연결된 GitHub 레포 README에서 이미지 후보를 찾아 보여주고,
// 채택 시 기존 이미지 업로드 목록(FR-M22)에 합류시킨다.
export function ReadmeImageGallery({ github, slug, onAdopt }: ReadmeImageGalleryProps) {
  const [candidates, setCandidates] = useState<ReadmeCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const [adoptingUrl, setAdoptingUrl] = useState<string | null>(null);
  const [adopted, setAdopted] = useState<Set<string>>(new Set());

  const disabled = !github.trim() || !slug;

  async function loadCandidates() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/github-import/images?repo=${encodeURIComponent(github.trim())}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.message ?? "이미지를 찾지 못했습니다");
        setCandidates([]);
        return;
      }
      setCandidates(json.candidates);
    } catch {
      setError("네트워크 오류로 조회하지 못했습니다");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }

  async function adopt(candidate: ReadmeCandidate) {
    setAdoptingUrl(candidate.url);
    setError(null);
    try {
      const res = await fetch(`/api/admin/github-import/fetch-image?url=${encodeURIComponent(candidate.url)}`);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.message ?? "이미지를 가져오지 못했습니다");
        return;
      }
      const original = await res.blob();
      const compressed = await compressImageBlob(original);
      if (compressed.size > MAX_BYTES) {
        setError("압축 후에도 5MB를 초과해 채택할 수 없습니다");
        return;
      }
      const content = await blobToBase64(compressed);
      const baseName = sanitizeBaseName(candidate.alt || candidate.url.split("/").pop() || "readme-image");
      const filename = `${baseName}-${Math.random().toString(36).slice(2, 8)}.webp`;
      onAdopt({
        filename,
        content,
        previewUrl: URL.createObjectURL(compressed),
        originalName: candidate.alt || filename,
        sizeBytes: compressed.size,
      });
      setAdopted((prev) => new Set(prev).add(candidate.url));
    } catch (err) {
      setError(err instanceof Error ? err.message : "이미지 처리 중 오류가 발생했습니다");
    } finally {
      setAdoptingUrl(null);
    }
  }

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={loadCandidates}
        disabled={disabled || loading}
        className="rounded-md border border-black/15 px-3 py-1.5 text-xs font-medium disabled:opacity-50 dark:border-white/20"
      >
        {loading ? "README 확인 중..." : "README에서 이미지 가져오기"}
      </button>
      {disabled && (
        <p className="mt-1 text-xs text-black/40 dark:text-white/40">
          github·slug를 먼저 입력해야 README 이미지를 가져올 수 있어요
        </p>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {candidates && candidates.length === 0 && !error && (
        <p className="mt-1 text-xs text-black/40 dark:text-white/40">이 저장소 README에서 이미지를 찾지 못했습니다</p>
      )}

      {candidates && candidates.length > 0 && (
        <ul className="mt-2 flex gap-2 overflow-x-auto pb-2">
          {candidates.map((c, i) => (
            <li key={c.url} className="shrink-0">
              <button
                type="button"
                onClick={() => setDetailIndex(i)}
                className="relative block h-16 w-24 overflow-hidden rounded border border-black/10 dark:border-white/15"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- README 원격 미리보기, 저장 안 됨 */}
                <img src={c.url} alt={c.alt} className="h-full w-full object-cover" />
                {adopted.has(c.url) && (
                  <span className="absolute right-0.5 top-0.5 rounded bg-black/70 px-1 text-[10px] text-white">
                    ✓
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {candidates && detailIndex !== null && (
        <ImageDetailModal
          candidates={candidates}
          index={detailIndex}
          adoptedUrls={adopted}
          adoptingUrl={adoptingUrl}
          onIndexChange={setDetailIndex}
          onClose={() => setDetailIndex(null)}
          onAdopt={adopt}
        />
      )}
    </div>
  );
}

function ImageDetailModal({
  candidates,
  index,
  adoptedUrls,
  adoptingUrl,
  onIndexChange,
  onClose,
  onAdopt,
}: {
  candidates: ReadmeCandidate[];
  index: number;
  adoptedUrls: Set<string>;
  adoptingUrl: string | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onAdopt: (candidate: ReadmeCandidate) => void;
}) {
  const candidate = candidates[index];
  const isAdopted = adoptedUrls.has(candidate.url);
  const isAdopting = adoptingUrl === candidate.url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        className="max-h-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- README 원격 미리보기, 저장 안 됨 */}
        <img src={candidate.url} alt={candidate.alt} className="max-h-96 w-full rounded object-contain" />
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">{candidate.alt || "(설명 없음)"}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onIndexChange((index - 1 + candidates.length) % candidates.length)}
              disabled={candidates.length < 2}
              className="rounded border border-black/15 px-2 py-1 text-xs disabled:opacity-30 dark:border-white/20"
            >
              이전
            </button>
            <button
              type="button"
              onClick={() => onIndexChange((index + 1) % candidates.length)}
              disabled={candidates.length < 2}
              className="rounded border border-black/15 px-2 py-1 text-xs disabled:opacity-30 dark:border-white/20"
            >
              다음
            </button>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onAdopt(candidate)}
              disabled={isAdopting}
              className="rounded border border-black/15 px-2 py-1 text-xs font-medium disabled:opacity-50 dark:border-white/20"
            >
              {isAdopting ? "채택 중..." : isAdopted ? "다시 채택" : "채택"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-black/15 px-2 py-1 text-xs dark:border-white/20"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { compressImageBlob, blobToBase64, sanitizeBaseName, MAX_BYTES } from "@/lib/image-compress";

export interface StagedImage {
  filename: string; // content-hub 파일명 (경로 아님, 예: diagram-a1b2c3.webp)
  content: string; // base64 (data: 접두 제거)
  previewUrl: string; // 미리보기용 object URL
  originalName: string;
  sizeBytes: number;
}

interface ImageDropzoneProps {
  slug: string;
  images: StagedImage[];
  onChange: (images: StagedImage[]) => void;
  onInsert: (snippet: string) => void; // 본문 커서 위치에 마크다운 스니펫 삽입
}

// A-03 이미지 업로드 드롭존 (FR-M22) — 리사이즈·WebP 변환·5MB 가드는 여기서 끝내고
// 실제 커밋은 폼 저장 시 본문·frontmatter와 함께 단일 원자 커밋으로 처리한다(§22).
export function ImageDropzone({ slug, images, onChange, onInsert }: ImageDropzoneProps) {
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const disabled = !slug;

  useEffect(() => {
    return () => {
      for (const img of images) URL.revokeObjectURL(img.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 언마운트 시 1회 정리
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError(null);
      setProcessing(true);
      const staged: StagedImage[] = [];
      try {
        for (const file of Array.from(files)) {
          if (!file.type.startsWith("image/")) {
            setError(`${file.name}: 이미지 파일이 아닙니다`);
            continue;
          }
          const blob = await compressImageBlob(file);
          if (blob.size > MAX_BYTES) {
            setError(`${file.name}: 압축 후에도 5MB를 초과합니다 (${(blob.size / 1024 / 1024).toFixed(1)}MB)`);
            continue;
          }
          const content = await blobToBase64(blob);
          const filename = `${sanitizeBaseName(file.name)}-${Math.random().toString(36).slice(2, 8)}.webp`;
          staged.push({
            filename,
            content,
            previewUrl: URL.createObjectURL(blob),
            originalName: file.name,
            sizeBytes: blob.size,
          });
        }
        if (staged.length > 0) onChange([...images, ...staged]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "이미지 처리 중 오류가 발생했습니다");
      } finally {
        setProcessing(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [images, onChange]
  );

  function remove(filename: string) {
    const target = images.find((img) => img.filename === filename);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(images.filter((img) => img.filename !== filename));
  }

  return (
    <div>
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!disabled) void handleFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-1 rounded-md border border-dashed px-4 py-6 text-center text-sm ${
          disabled
            ? "cursor-not-allowed border-black/10 text-black/30 dark:border-white/10 dark:text-white/30"
            : "cursor-pointer border-black/20 text-black/50 hover:border-black/40 dark:border-white/25 dark:text-white/50"
        }`}
      >
        {disabled
          ? "slug를 먼저 입력해야 이미지를 업로드할 수 있어요"
          : processing
            ? "이미지 처리 중..."
            : "이미지를 드래그하거나 클릭해서 올리세요 (자동으로 리사이즈 · WebP 압축)"}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={disabled}
          onChange={(e) => void handleFiles(e.target.files)}
          className="hidden"
        />
      </label>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {images.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => {
            const repoPath = `assets/${slug}/${img.filename}`;
            return (
              <li key={img.filename} className="rounded-md border border-black/10 p-2 text-xs dark:border-white/15">
                {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 압축 미리보기(object URL) */}
                <img src={img.previewUrl} alt="" className="mb-2 aspect-video w-full rounded object-cover" />
                <p className="truncate text-black/50 dark:text-white/50" title={repoPath}>
                  {repoPath}
                </p>
                <p className="text-black/40 dark:text-white/40">{(img.sizeBytes / 1024).toFixed(0)}KB</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onInsert(`![](/${repoPath})`)}
                    className="rounded border border-black/15 px-1.5 py-0.5 dark:border-white/20"
                  >
                    본문에 삽입
                  </button>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(repoPath)}
                    className="rounded border border-black/15 px-1.5 py-0.5 dark:border-white/20"
                    title="thumbnail 필드에 붙여넣을 수 있는 경로(슬래시 없이)"
                  >
                    경로 복사
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(img.filename)}
                    className="ml-auto rounded border border-red-500/30 px-1.5 py-0.5 text-red-500"
                  >
                    삭제
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

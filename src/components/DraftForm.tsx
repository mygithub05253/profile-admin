"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { postFrontmatterSchema, type PostFrontmatter } from "@/lib/schema/post";

interface DraftFormProps {
  slug: string;
  initialFrontmatter: PostFrontmatter;
  initialBody: string;
  initialSha: string;
}

type FormValues = {
  title: string;
  type: "post" | "retrospective";
  date: string;
  tagsText: string;
  source: "obsidian" | "notion" | "velog";
  visibility: "public" | "private";
  thumbnail: string;
};

// A-04 초안 편집 (FR-M19) — A-03 폼 패턴 재사용, posts 스키마
export function DraftForm({ slug, initialFrontmatter, initialBody, initialSha }: DraftFormProps) {
  const router = useRouter();
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState<"idle" | "validating" | "committing" | "done" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ sha: string } | null>(null);
  const [confirmPromote, setConfirmPromote] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: initialFrontmatter.title,
      type: initialFrontmatter.type,
      date: initialFrontmatter.date,
      tagsText: initialFrontmatter.tags.join(", "),
      source: initialFrontmatter.source,
      visibility: initialFrontmatter.visibility,
      thumbnail: initialFrontmatter.thumbnail ?? "",
    },
  });

  function buildFrontmatter(values: FormValues) {
    return {
      title: values.title,
      slug,
      type: values.type,
      date: values.date,
      tags: values.tagsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      source: values.source,
      status: initialFrontmatter.status,
      visibility: values.visibility,
      velog_url: initialFrontmatter.velog_url,
      thumbnail: values.thumbnail || undefined,
    };
  }

  async function submitTo(endpoint: string, values: FormValues) {
    setServerError(null);
    setConflict(null);
    setPrUrl(null);
    setStatus("validating");

    const frontmatter = buildFrontmatter(values);
    const parsed = postFrontmatterSchema.safeParse(frontmatter);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        const field = key === "tags" ? "tagsText" : (key as keyof FormValues);
        setError(field, { message: issue.message });
      }
      setStatus("error");
      return;
    }

    setStatus("committing");
    try {
      const res = await fetch(endpoint, {
        method: endpoint.endsWith("/promote") ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frontmatter: parsed.data, body, sha: initialSha }),
      });
      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409 && json.error === "sha_conflict") {
          setConflict({ sha: json.latest?.sha });
          setStatus("error");
          return;
        }
        setServerError(json.message ?? "저장 중 오류가 발생했습니다");
        setStatus("error");
        return;
      }

      setPrUrl(json.prUrl);
      setStatus("done");
      router.refresh();
    } catch {
      setServerError("네트워크 오류로 저장하지 못했습니다. 다시 시도해주세요.");
      setStatus("error");
    }
  }

  const onSave = handleSubmit((values) => submitTo(`/api/drafts/${slug}`, values));
  const onPromote = handleSubmit((values) => {
    setConfirmPromote(false);
    return submitTo(`/api/drafts/${slug}/promote`, values);
  });

  return (
    <form onSubmit={onSave} className="grid max-w-3xl gap-5">
      {prUrl && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm">
          저장 완료 — PR이 생성되었습니다.{" "}
          <a href={prUrl} target="_blank" rel="noreferrer" className="font-medium underline">
            PR 보기
          </a>
          <span className="text-black/50 dark:text-white/50"> (CI 통과 시 자동 병합)</span>
        </div>
      )}
      {serverError && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">{serverError}</div>
      )}
      {conflict && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          저장 충돌: 다른 곳에서 이 초안이 먼저 수정되었습니다. 페이지를 새로고침해 최신 내용을 확인해주세요.
        </div>
      )}

      <Field label="제목" error={errors.title?.message}>
        <input {...register("title")} className={inputClass} />
      </Field>

      <Field label="slug">
        <input value={slug} disabled className={`${inputClass} disabled:opacity-50`} />
      </Field>

      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">status</span>
        <span className="rounded-full border border-black/15 px-2.5 py-0.5 text-xs dark:border-white/20">
          {initialFrontmatter.status}
        </span>
        <span className="text-xs text-black/40 dark:text-white/40">
          상태 전환은 아래 [발행 준비]로만 가능합니다
        </span>
      </div>

      <Field label="type" error={errors.type?.message}>
        <select {...register("type")} className={inputClass}>
          <option value="post">post</option>
          <option value="retrospective">retrospective</option>
        </select>
      </Field>

      <Field label="date" error={errors.date?.message}>
        <input type="date" {...register("date")} className={inputClass} />
      </Field>

      <Field label="tags (콤마로 구분)" error={errors.tagsText?.message}>
        <input {...register("tagsText")} className={inputClass} placeholder="Python, 회고" />
      </Field>

      <Field label="source" error={errors.source?.message}>
        <select {...register("source")} className={inputClass}>
          <option value="obsidian">obsidian</option>
          <option value="notion">notion</option>
          <option value="velog">velog</option>
        </select>
      </Field>

      <Field label="visibility" error={errors.visibility?.message}>
        <select {...register("visibility")} className={inputClass}>
          <option value="public">public</option>
          <option value="private">private</option>
        </select>
      </Field>

      <Field label="thumbnail 경로" error={errors.thumbnail?.message}>
        <input {...register("thumbnail")} className={inputClass} placeholder="assets/{slug}/thumb.webp" />
      </Field>

      <Field label="본문 (Markdown)">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={14}
          className={`${inputClass} font-mono text-xs`}
        />
      </Field>

      <div className="flex items-center gap-3 border-t border-black/10 pt-4 dark:border-white/15">
        <button
          type="submit"
          disabled={status === "validating" || status === "committing"}
          className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {status === "committing" ? "저장 중..." : "임시 저장"}
        </button>
        <button
          type="button"
          disabled={status === "validating" || status === "committing"}
          onClick={() => setConfirmPromote(true)}
          className="rounded-lg border border-black/20 px-5 py-2 text-sm font-medium disabled:opacity-50 dark:border-white/30"
        >
          발행 준비
        </button>
        <span className="text-xs text-black/40 dark:text-white/40">{status}</span>
      </div>

      {confirmPromote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 dark:bg-zinc-900">
            <h2 className="mb-2 text-base font-semibold">발행 준비</h2>
            <p className="mb-4 text-sm text-black/60 dark:text-white/60">
              이 초안이 posts/로 이동되고 <strong>velog에 자동 발행됩니다</strong>. 계속하시겠습니까?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmPromote(false)}
                className="rounded-md px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
              >
                취소
              </button>
              <button
                type="button"
                onClick={onPromote}
                className="rounded-md bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
              >
                발행 준비 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50";

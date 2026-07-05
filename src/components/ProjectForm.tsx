"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  projectFrontmatterSchema,
  projectCategoryEnum,
  type ProjectFrontmatter,
} from "@/lib/schema/project";
import { DeleteProjectButton } from "./DeleteProjectButton";

interface ProjectFormProps {
  mode: "create" | "edit";
  initialFrontmatter?: Partial<ProjectFrontmatter>;
  initialBody?: string;
  initialSha?: string;
  // FR-M10: collaborators 수 기반 참고 배지 — scope 필드 자동 채움에는 사용하지 않음
  scopeHint?: "personal" | "team";
}

// react-hook-form 값 타입 — stack은 콤마 구분 텍스트로 입력받아 제출 시 배열로 변환
type FormValues = {
  title: string;
  slug: string;
  category: string[];
  scope: "personal" | "team";
  role: string;
  period: string;
  stackText: string;
  summary: string;
  thumbnail: string;
  github: string;
  repoVisibility: "public" | "private";
  demo: string;
  featured: boolean;
  order: number;
  status: "draft" | "published";
};

const CATEGORY_OPTIONS = projectCategoryEnum.options;

// A-03 프로젝트 편집/생성 폼 (FR-M17·M18) — frontmatter + MDX 본문
export function ProjectForm({
  mode,
  initialFrontmatter,
  initialBody = "",
  initialSha,
  scopeHint,
}: ProjectFormProps) {
  const router = useRouter();
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState<"idle" | "validating" | "committing" | "done" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ sha: string } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: initialFrontmatter?.title ?? "",
      slug: initialFrontmatter?.slug ?? "",
      category: initialFrontmatter?.category ?? [],
      scope: initialFrontmatter?.scope ?? "personal",
      role: initialFrontmatter?.role ?? "",
      period: initialFrontmatter?.period ?? "",
      stackText: (initialFrontmatter?.stack ?? []).join(", "),
      summary: initialFrontmatter?.summary ?? "",
      thumbnail: initialFrontmatter?.thumbnail ?? "",
      github: initialFrontmatter?.github ?? "",
      repoVisibility: initialFrontmatter?.repoVisibility ?? "public",
      demo: initialFrontmatter?.demo ?? "",
      featured: initialFrontmatter?.featured ?? false,
      order: initialFrontmatter?.order ?? 0,
      status: initialFrontmatter?.status ?? "draft",
    },
  });

  const scope = watch("scope");

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setConflict(null);
    setPrUrl(null);
    setStatus("validating");

    const frontmatter = {
      title: values.title,
      slug: values.slug,
      type: "project" as const,
      category: values.category as ProjectFrontmatter["category"],
      scope: values.scope,
      role: values.role || undefined,
      period: values.period,
      stack: values.stackText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      summary: values.summary,
      thumbnail: values.thumbnail || undefined,
      github: values.github || undefined,
      repoVisibility: values.repoVisibility,
      demo: values.demo || undefined,
      featured: values.featured,
      order: Number(values.order),
      status: values.status,
    };

    const parsed = projectFrontmatterSchema.safeParse(frontmatter);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        const field = key === "stack" ? "stackText" : (key as keyof FormValues);
        setError(field, { message: issue.message });
      }
      setStatus("error");
      return;
    }

    setStatus("committing");
    try {
      const endpoint = mode === "create" ? "/api/projects" : `/api/projects/${initialFrontmatter?.slug}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "create"
            ? { frontmatter: parsed.data, body }
            : { frontmatter: parsed.data, body, sha: initialSha }
        ),
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
  });

  return (
    <form onSubmit={onSubmit} className="grid max-w-3xl gap-5">
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
          저장 충돌: 다른 곳에서 이 프로젝트가 먼저 수정되었습니다. 페이지를 새로고침해 최신 내용을 확인해주세요.
        </div>
      )}

      <Field label="제목" error={errors.title?.message}>
        <input {...register("title")} className={inputClass} />
      </Field>

      <Field label="slug" error={errors.slug?.message}>
        <input {...register("slug")} disabled={mode === "edit"} className={`${inputClass} disabled:opacity-50`} />
        {mode === "edit" && <p className="mt-1 text-xs text-black/40 dark:text-white/40">slug는 저장 후 수정할 수 없습니다</p>}
      </Field>

      <Field label="category" error={errors.category?.message as string | undefined}>
        <div className="flex flex-wrap gap-3">
          {CATEGORY_OPTIONS.map((option) => (
            <label key={option} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" value={option} {...register("category")} />
              {option}
            </label>
          ))}
        </div>
      </Field>

      <Field label="scope" error={errors.scope?.message}>
        <select {...register("scope")} className={inputClass}>
          <option value="personal">personal</option>
          <option value="team">team</option>
        </select>
        {scopeHint && (
          <p className="mt-1 text-xs text-black/40 dark:text-white/40">
            참고: GitHub 협업자 수 기준 추정값 = {scopeHint} (자동 선택 아님)
          </p>
        )}
      </Field>

      {scope === "team" && (
        <Field label="role" error={errors.role?.message}>
          <input {...register("role")} className={inputClass} placeholder="scope: team 프로젝트는 필수" />
        </Field>
      )}

      <Field label="period" error={errors.period?.message}>
        <input {...register("period")} className={inputClass} placeholder="YYYY.MM ~ YYYY.MM" />
      </Field>

      <Field label="stack (콤마로 구분)" error={errors.stackText?.message}>
        <input {...register("stackText")} className={inputClass} placeholder="Next.js, TypeScript" />
      </Field>

      <Field label="summary" error={errors.summary?.message}>
        <textarea {...register("summary")} rows={3} className={inputClass} />
      </Field>

      <Field label="github" error={errors.github?.message}>
        <input {...register("github")} className={inputClass} placeholder="https://github.com/owner/repo" />
      </Field>

      <Field label="repoVisibility" error={errors.repoVisibility?.message}>
        <select {...register("repoVisibility")} className={inputClass}>
          <option value="public">public</option>
          <option value="private">private</option>
        </select>
      </Field>

      <Field label="demo" error={errors.demo?.message}>
        <input {...register("demo")} className={inputClass} />
      </Field>

      <Field label="thumbnail 경로" error={errors.thumbnail?.message}>
        <input {...register("thumbnail")} className={inputClass} placeholder="assets/{slug}/thumb.webp" />
      </Field>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" {...register("featured")} /> featured
        </label>
        <Field label="order" error={errors.order?.message}>
          <input type="number" {...register("order", { valueAsNumber: true })} className={inputClass} />
        </Field>
      </div>

      <Field label="status" error={errors.status?.message}>
        <select {...register("status")} className={inputClass}>
          <option value="draft">draft</option>
          <option value="published">published</option>
        </select>
      </Field>

      <Field label="MDX 본문">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          className={`${inputClass} font-mono text-xs`}
        />
      </Field>

      <div className="flex items-center gap-3 border-t border-black/10 pt-4 dark:border-white/15">
        <button
          type="submit"
          disabled={status === "validating" || status === "committing"}
          className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {status === "committing" ? "저장 중..." : "저장"}
        </button>
        <span className="text-xs text-black/40 dark:text-white/40">{status}</span>

        {mode === "edit" && initialFrontmatter?.slug && initialSha && (
          <DeleteProjectButton slug={initialFrontmatter.slug} sha={initialSha} />
        )}
      </div>
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

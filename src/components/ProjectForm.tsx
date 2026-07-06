"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  projectFrontmatterSchema,
  projectCategoryEnum,
  type ProjectFrontmatter,
} from "@/lib/schema/project";
import { DeleteProjectButton } from "./DeleteProjectButton";
import { ImageDropzone, type StagedImage } from "./ImageDropzone";
import { ReadmeImageGallery } from "./ReadmeImageGallery";

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
  const [images, setImages] = useState<StagedImage[]>([]);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
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
  const slugValue = watch("slug");
  const githubValue = watch("github");

  // FR-M22: 이미지 드롭존의 "본문에 삽입" — textarea 커서 위치에 마크다운 스니펫 삽입
  function insertAtCursor(snippet: string) {
    const el = bodyRef.current;
    if (!el) {
      setBody((prev) => `${prev}\n${snippet}\n`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setBody((prev) => `${prev.slice(0, start)}${snippet}${prev.slice(end)}`);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function imagesForSave() {
    return images.map(({ filename, content }) => ({ filename, content }));
  }

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
            ? { frontmatter: parsed.data, body, images: imagesForSave() }
            : { frontmatter: parsed.data, body, sha: initialSha, images: imagesForSave() }
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

      <Field label="제목" error={errors.title?.message} hint="포트폴리오 카드에 표시될 프로젝트 이름이에요">
        <input {...register("title")} className={inputClass} placeholder="예: 자동화 생태계 (my-profile-site)" />
      </Field>

      <Field
        label="slug"
        error={errors.slug?.message}
        hint={
          mode === "edit"
            ? "slug는 저장 후 수정할 수 없습니다"
            : "영문 소문자와 하이픈만 사용하세요 — /projects/이 값으로 URL이 만들어지고 저장 후에는 수정할 수 없어요"
        }
      >
        <input
          {...register("slug")}
          disabled={mode === "edit"}
          className={`${inputClass} disabled:opacity-50`}
          placeholder="예: automation-ecosystem"
        />
      </Field>

      <Field
        label="category"
        error={errors.category?.message as string | undefined}
        hint="해당하는 분야를 모두 선택하세요 (복수 선택 가능)"
      >
        <div className="flex flex-wrap gap-3">
          {CATEGORY_OPTIONS.map((option) => (
            <label key={option} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" value={option} {...register("category")} />
              {option}
            </label>
          ))}
        </div>
      </Field>

      <Field
        label="scope"
        error={errors.scope?.message}
        hint={
          scopeHint
            ? `참고: GitHub 협업자 수 기준 추정값 = ${scopeHint} (자동 선택 아님) · 혼자 진행했다면 personal, 함께 했다면 team`
            : "혼자 진행한 프로젝트면 personal, 팀 프로젝트면 team을 선택하세요"
        }
      >
        <select {...register("scope")} className={inputClass}>
          <option value="personal">personal</option>
          <option value="team">team</option>
        </select>
      </Field>

      {scope === "team" && (
        <Field label="role" error={errors.role?.message} hint="team 프로젝트는 필수 입력이에요">
          <input {...register("role")} className={inputClass} placeholder="예: 백엔드 개발 및 배포 자동화 담당" />
        </Field>
      )}

      <Field label="period" error={errors.period?.message}>
        <input {...register("period")} className={inputClass} placeholder="예: 2026.01 ~ 2026.03" />
      </Field>

      <Field label="stack (콤마로 구분)" error={errors.stackText?.message}>
        <input {...register("stackText")} className={inputClass} placeholder="예: Next.js, TypeScript, Tailwind CSS" />
      </Field>

      <Field label="summary" error={errors.summary?.message} hint="프로젝트 카드에 보여줄 1~2문장 요약이에요">
        <textarea
          {...register("summary")}
          rows={3}
          className={inputClass}
          placeholder="예: GitHub 활동을 분석해 velog 초안과 포트폴리오 카드를 자동 생성하는 개인 자동화 파이프라인"
        />
      </Field>

      <Field label="github" error={errors.github?.message}>
        <input {...register("github")} className={inputClass} placeholder="예: https://github.com/mygithub05253/stock-agent" />
      </Field>

      <Field
        label="repoVisibility"
        error={errors.repoVisibility?.message}
        hint="Private으로 설정하면 사이트에 GitHub 버튼이 노출되지 않아요"
      >
        <select {...register("repoVisibility")} className={inputClass}>
          <option value="public">public</option>
          <option value="private">private</option>
        </select>
      </Field>

      <Field label="demo" error={errors.demo?.message}>
        <input {...register("demo")} className={inputClass} placeholder="예: https://my-profile-site-coral.vercel.app (배포 주소가 있을 때만)" />
      </Field>

      <Field
        label="thumbnail 경로"
        error={errors.thumbnail?.message}
        hint="아래 이미지 업로드에서 '경로 복사'로 붙여넣으세요 — 슬래시(/)로 시작하지 않아야 해요 (content-hub 검증 규칙)"
      >
        <input {...register("thumbnail")} className={inputClass} placeholder="예: assets/automation-ecosystem/thumb.webp" />
      </Field>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" {...register("featured")} /> featured
        </label>
        <Field label="order" error={errors.order?.message}>
          <input type="number" {...register("order", { valueAsNumber: true })} className={inputClass} />
        </Field>
      </div>
      <p className="-mt-3 text-xs text-black/40 dark:text-white/40">
        featured를 체크하면 홈 화면 상단에 노출돼요. order는 숫자가 작을수록 먼저 표시돼요 (예: 0, 1, 2 …)
      </p>

      <Field label="status" error={errors.status?.message} hint="draft는 사이트에 보이지 않고, published여야 실제로 노출돼요">
        <select {...register("status")} className={inputClass}>
          <option value="draft">draft</option>
          <option value="published">published</option>
        </select>
      </Field>

      <Field label="MDX 본문">
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          className={`${inputClass} font-mono text-xs`}
        />
      </Field>

      <ReadmeImageGallery
        github={githubValue}
        slug={slugValue}
        onAdopt={(image) => setImages((prev) => [...prev, image])}
      />

      <Field label="이미지 업로드">
        <ImageDropzone slug={slugValue} images={images} onChange={setImages} onInsert={insertAtCursor} />
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

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-black/40 dark:text-white/40">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50";

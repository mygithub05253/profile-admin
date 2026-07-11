"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type FieldPath } from "react-hook-form";
import { recordsDataSchema, recordCategoryEnum, type RecordsData } from "@/lib/schema/static-data";
import { Field, inputClass } from "./Field";
import toast from "react-hot-toast";
import { toastApiError, toastSaved } from "@/lib/toast-errors";

interface RecordsDataFormProps {
  initialData: RecordsData;
  initialSha: string;
}

const CATEGORY_OPTIONS = recordCategoryEnum.options;

// FR-M23 §23 — data/records.yml 편집 (스키마 기반 폼, 테이블 행 추가/삭제)
export function RecordsDataForm({ initialData, initialSha }: RecordsDataFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "validating" | "committing" | "done" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RecordsData>({ defaultValues: initialData });

  const loop = useFieldArray({ control, name: "intro.loop" });
  const items = useFieldArray({ control, name: "items" });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setConflict(false);
    setPrUrl(null);
    setStatus("validating");

    // link는 빈 문자열이면 velite url() 검증에 걸리므로 undefined로 정규화
    const normalized: RecordsData = {
      ...values,
      items: values.items.map((item) => ({ ...item, link: item.link || undefined })),
    };

    const parsed = recordsDataSchema.safeParse(normalized);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError(issue.path.join(".") as FieldPath<RecordsData>, { message: issue.message });
      }
      setStatus("error");
      return;
    }

    setStatus("committing");
    try {
      const res = await fetch("/api/data/records", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: parsed.data, sha: initialSha }),
      });
      const json = await res.json();

      if (!res.ok) {
        toastApiError(json);
        if (res.status === 409 && json.error === "sha_conflict") {
          setConflict(true);
          setStatus("error");
          return;
        }
        setServerError(json.message ?? "저장 중 오류가 발생했습니다");
        setStatus("error");
        return;
      }

      setPrUrl(json.prUrl);
      setStatus("done");
      toastSaved();
      router.refresh();
    } catch {
      const message = "네트워크 오류로 저장하지 못했습니다. 다시 시도해주세요.";
      setServerError(message);
      setStatus("error");
      toast.error(message);
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
          저장 충돌: 다른 곳에서 이 데이터가 먼저 수정되었습니다. 페이지를 새로고침해 최신 내용을 확인해주세요.
        </div>
      )}

      <p className="text-sm font-semibold">intro (Growth Map 소개)</p>
      <Field label="badge" error={errors.intro?.badge?.message}>
        <input {...register("intro.badge")} className={inputClass} />
      </Field>
      <Field label="title" error={errors.intro?.title?.message}>
        <input {...register("intro.title")} className={inputClass} />
      </Field>
      <Field label="description" error={errors.intro?.description?.message}>
        <textarea {...register("intro.description")} rows={3} className={inputClass} />
      </Field>

      <div>
        <p className="mb-2 text-sm font-medium">intro.loop</p>
        <div className="grid gap-3">
          {loop.fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2 rounded-md border border-black/10 p-3 dark:border-white/15">
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <Field label="label" error={errors.intro?.loop?.[index]?.label?.message}>
                  <input {...register(`intro.loop.${index}.label`)} className={inputClass} />
                </Field>
                <Field label="description" error={errors.intro?.loop?.[index]?.description?.message}>
                  <input {...register(`intro.loop.${index}.description`)} className={inputClass} />
                </Field>
              </div>
              <button type="button" onClick={() => loop.remove(index)} className="mt-6 text-xs text-red-500 hover:underline">
                삭제
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => loop.append({ label: "", description: "" })}
          className="mt-2 text-sm text-black/60 hover:underline dark:text-white/60"
        >
          + 행 추가
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">items ({items.fields.length}개, 타임라인)</p>
        <div className="grid gap-3">
          {items.fields.map((field, index) => (
            <div key={field.id} className="rounded-md border border-black/10 p-3 dark:border-white/15">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field label="date" error={errors.items?.[index]?.date?.message} hint="예: 2024.03 ~ 또는 2025">
                  <input {...register(`items.${index}.date`)} className={inputClass} />
                </Field>
                <Field label="category" error={errors.items?.[index]?.category?.message}>
                  <select {...register(`items.${index}.category`)} className={inputClass}>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="title" error={errors.items?.[index]?.title?.message}>
                <input {...register(`items.${index}.title`)} className={inputClass} />
              </Field>
              <Field label="description" error={errors.items?.[index]?.description?.message}>
                <textarea {...register(`items.${index}.description`)} rows={2} className={inputClass} />
              </Field>
              <Field label="link" error={errors.items?.[index]?.link?.message} hint="선택 — 관련 링크가 있을 때만">
                <input {...register(`items.${index}.link`)} className={inputClass} />
              </Field>
              <button
                type="button"
                onClick={() => items.remove(index)}
                className="mt-2 text-xs text-red-500 hover:underline"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => items.append({ date: "", category: "project", title: "", description: "", link: "" })}
          className="mt-2 text-sm text-black/60 hover:underline dark:text-white/60"
        >
          + 행 추가
        </button>
      </div>

      <div className="flex items-center gap-3 border-t border-black/10 pt-4 dark:border-white/15">
        <button
          type="submit"
          disabled={status === "validating" || status === "committing"}
          className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {status === "committing" ? "저장 중..." : "저장"}
        </button>
        <span className="text-xs text-black/40 dark:text-white/40">{status}</span>
      </div>
    </form>
  );
}

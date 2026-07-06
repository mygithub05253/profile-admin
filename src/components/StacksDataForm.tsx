"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type FieldPath } from "react-hook-form";
import { stacksDataSchema, stackCategoryEnum, type StacksData } from "@/lib/schema/static-data";
import { Field, inputClass } from "./Field";

interface StacksDataFormProps {
  initialData: StacksData;
  initialSha: string;
}

const CATEGORY_OPTIONS = stackCategoryEnum.options;

// FR-M23 §23 — data/stacks.yml 편집 (스키마 기반 폼, 테이블 행 추가/삭제)
export function StacksDataForm({ initialData, initialSha }: StacksDataFormProps) {
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
  } = useForm<StacksData>({ defaultValues: initialData });

  const items = useFieldArray({ control, name: "items" });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setConflict(false);
    setPrUrl(null);
    setStatus("validating");

    const parsed = stacksDataSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError(issue.path.join(".") as FieldPath<StacksData>, { message: issue.message });
      }
      setStatus("error");
      return;
    }

    setStatus("committing");
    try {
      const res = await fetch("/api/data/stacks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: parsed.data, sha: initialSha }),
      });
      const json = await res.json();

      if (!res.ok) {
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
          저장 충돌: 다른 곳에서 이 데이터가 먼저 수정되었습니다. 페이지를 새로고침해 최신 내용을 확인해주세요.
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">items ({items.fields.length}개)</p>
        <div className="grid gap-3">
          {items.fields.map((field, index) => (
            <div key={field.id} className="rounded-md border border-black/10 p-3 dark:border-white/15">
              <div className="grid grid-cols-2 gap-2">
                <Field label="name" error={errors.items?.[index]?.name?.message}>
                  <input {...register(`items.${index}.name`)} className={inputClass} />
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
                <Field
                  label="icon"
                  error={errors.items?.[index]?.icon?.message}
                  hint="simple-icons 슬러그 (icon 또는 emoji 중 하나 필수)"
                >
                  <input {...register(`items.${index}.icon`)} className={inputClass} />
                </Field>
                <Field label="emoji" hint="icon이 없을 때 폴백으로 쓸 이모지">
                  <input {...register(`items.${index}.emoji`)} className={inputClass} />
                </Field>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" {...register(`items.${index}.featured`)} /> featured (Hero 칩 노출)
                </label>
                <button
                  type="button"
                  onClick={() => items.remove(index)}
                  className="text-xs text-red-500 hover:underline"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => items.append({ name: "", icon: "", category: "data-ai", featured: false })}
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type FieldPath } from "react-hook-form";
import { profileDataSchema, type ProfileData } from "@/lib/schema/static-data";
import { Field, inputClass } from "./Field";

interface ProfileDataFormProps {
  initialData: ProfileData;
  initialSha: string;
}

const HIGHLIGHT_COLORS = ["gold", "blue", "green", "purple", "pink"] as const;

// FR-M23 §23 — data/profile.yml 편집 (스키마 기반 폼, 테이블 행 추가/삭제)
export function ProfileDataForm({ initialData, initialSha }: ProfileDataFormProps) {
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
  } = useForm<ProfileData>({ defaultValues: initialData });

  const emails = useFieldArray({ control, name: "emails" });
  const highlights = useFieldArray({ control, name: "highlights" });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setConflict(false);
    setPrUrl(null);
    setStatus("validating");

    const parsed = profileDataSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError(issue.path.join(".") as FieldPath<ProfileData>, { message: issue.message });
      }
      setStatus("error");
      return;
    }

    setStatus("committing");
    try {
      const res = await fetch("/api/data/profile", {
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

      <Field label="name" error={errors.name?.message}>
        <input {...register("name")} className={inputClass} />
      </Field>
      <Field label="nameEn" error={errors.nameEn?.message}>
        <input {...register("nameEn")} className={inputClass} />
      </Field>
      <Field label="role" error={errors.role?.message} hint="Hero 섹션에 표시되는 한 줄 소개예요">
        <input {...register("role")} className={inputClass} />
      </Field>
      <Field label="intro" error={errors.intro?.message}>
        <textarea {...register("intro")} rows={4} className={inputClass} />
      </Field>
      <Field label="github" error={errors.github?.message}>
        <input {...register("github")} className={inputClass} />
      </Field>
      <Field label="velog" error={errors.velog?.message}>
        <input {...register("velog")} className={inputClass} />
      </Field>

      <div>
        <p className="mb-2 text-sm font-medium">emails</p>
        <div className="grid gap-3">
          {emails.fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2 rounded-md border border-black/10 p-3 dark:border-white/15">
              <div className="grid flex-1 grid-cols-2 gap-2">
                <Field label="label" error={errors.emails?.[index]?.label?.message}>
                  <input {...register(`emails.${index}.label`)} className={inputClass} />
                </Field>
                <Field label="address" error={errors.emails?.[index]?.address?.message}>
                  <input {...register(`emails.${index}.address`)} className={inputClass} />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => emails.remove(index)}
                className="mt-6 text-xs text-red-500 hover:underline"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => emails.append({ label: "", address: "" })}
          className="mt-2 text-sm text-black/60 hover:underline dark:text-white/60"
        >
          + 행 추가
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">highlights (홈 About 강점 카드)</p>
        <div className="grid gap-3">
          {highlights.fields.map((field, index) => (
            <div key={field.id} className="rounded-md border border-black/10 p-3 dark:border-white/15">
              <div className="grid grid-cols-2 gap-2">
                <Field label="icon" error={errors.highlights?.[index]?.icon?.message} hint="이모지 1개">
                  <input {...register(`highlights.${index}.icon`)} className={inputClass} />
                </Field>
                <Field label="color" error={errors.highlights?.[index]?.color?.message}>
                  <select {...register(`highlights.${index}.color`)} className={inputClass}>
                    {HIGHLIGHT_COLORS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="title" error={errors.highlights?.[index]?.title?.message}>
                  <input {...register(`highlights.${index}.title`)} className={inputClass} />
                </Field>
                <Field label="subtitle" error={errors.highlights?.[index]?.subtitle?.message}>
                  <input {...register(`highlights.${index}.subtitle`)} className={inputClass} />
                </Field>
              </div>
              <Field label="description" error={errors.highlights?.[index]?.description?.message}>
                <textarea {...register(`highlights.${index}.description`)} rows={2} className={inputClass} />
              </Field>
              <button
                type="button"
                onClick={() => highlights.remove(index)}
                className="mt-2 text-xs text-red-500 hover:underline"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            highlights.append({ icon: "", title: "", subtitle: "", description: "", color: "gold" })
          }
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

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { NotFoundError, ShaConflictError, SlugConflictError, SlugImmutableError } from "./errors";

// FR-M17/M18/M21 공통 에러 → HTTP 응답 매핑 (관리자 API 통합명세서 §6.2)
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json({ error: "invalid_schema", issues: err.issues }, { status: 400 });
  }
  if (err instanceof SlugConflictError) {
    return NextResponse.json({ error: "slug_conflict", message: err.message }, { status: 409 });
  }
  if (err instanceof SlugImmutableError) {
    return NextResponse.json({ error: "slug_immutable", message: err.message }, { status: 400 });
  }
  if (err instanceof NotFoundError) {
    return NextResponse.json({ error: "not_found", message: err.message }, { status: 404 });
  }
  if (err instanceof ShaConflictError) {
    return NextResponse.json(
      { error: "sha_conflict", message: err.message, latest: err.latest },
      { status: 409 }
    );
  }
  console.error(err);
  return NextResponse.json({ error: "upstream_error", message: "GitHub 연동 중 오류가 발생했습니다" }, { status: 502 });
}

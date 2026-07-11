import toast from "react-hot-toast";

// profile-admin 자체 에러 코드(src/lib/api-errors.ts의 toErrorResponse) → 한글 메시지
// scripts/verify-toast-errors.mjs와 매핑을 동일하게 유지할 것
const ERROR_MESSAGES: Record<string, string> = {
  invalid_schema: "입력값이 올바르지 않습니다.",
  slug_conflict: "이미 존재하는 슬러그입니다.",
  slug_immutable: "슬러그는 수정할 수 없습니다.",
  not_found: "리소스를 찾을 수 없습니다.",
  sha_conflict: "저장 충돌: 다른 곳에서 먼저 수정되었습니다. 새로고침 후 다시 시도하세요.",
  upstream_error: "GitHub 연동 중 오류가 발생했습니다.",
};

export function errorCodeToMessage(code?: string, fallbackMessage?: string): string {
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  return fallbackMessage ?? "알 수 없는 오류가 발생했습니다.";
}

export function toastApiError(json: { error?: string; message?: string }) {
  toast.error(errorCodeToMessage(json.error, json.message));
}

export function toastSaved() {
  toast.success("저장되었습니다.");
}

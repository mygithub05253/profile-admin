// api-errors.ts의 toErrorResponse()가 내려주는 error 코드 → 한글 메시지 매핑 회귀 테스트
// (src/lib/toast-errors.ts의 errorCodeToMessage와 반드시 동일 매핑 유지)
const ERROR_MESSAGES = {
  invalid_schema: "입력값이 올바르지 않습니다.",
  slug_conflict: "이미 존재하는 슬러그입니다.",
  slug_immutable: "슬러그는 수정할 수 없습니다.",
  not_found: "리소스를 찾을 수 없습니다.",
  sha_conflict: "저장 충돌: 다른 곳에서 먼저 수정되었습니다. 새로고침 후 다시 시도하세요.",
  upstream_error: "GitHub 연동 중 오류가 발생했습니다.",
};

function errorCodeToMessage(code, fallbackMessage) {
  return ERROR_MESSAGES[code] ?? fallbackMessage ?? "알 수 없는 오류가 발생했습니다.";
}

const cases = [
  { code: "sha_conflict", fallback: undefined, expected: "저장 충돌: 다른 곳에서 먼저 수정되었습니다. 새로고침 후 다시 시도하세요." },
  { code: "not_found", fallback: undefined, expected: "리소스를 찾을 수 없습니다." },
  { code: "unknown_code", fallback: "서버 메시지", expected: "서버 메시지" },
  { code: "unknown_code", fallback: undefined, expected: "알 수 없는 오류가 발생했습니다." },
];

let failed = 0;
for (const c of cases) {
  const result = errorCodeToMessage(c.code, c.fallback);
  if (result !== c.expected) {
    failed++;
    console.error(`FAIL: code=${c.code} → "${result}", expected "${c.expected}"`);
  }
}

if (failed > 0) {
  console.error(`${failed}개 케이스 실패`);
  process.exit(1);
}
console.log("모든 에러 메시지 매핑 케이스 통과");

// Pagination의 페이지 번호 윈도우 계산 순수 로직 회귀 테스트
// (src/components/Pagination.tsx의 getPageWindow와 반드시 동일 로직 유지)
function getPageWindow(currentPage, totalPages, maxVisible = 5) {
  let start = Math.max(0, currentPage - Math.floor(maxVisible / 2));
  const end = Math.min(totalPages - 1, start + maxVisible - 1);
  if (end - start < maxVisible - 1) {
    start = Math.max(0, end - maxVisible + 1);
  }
  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
}

const cases = [
  { currentPage: 0, totalPages: 3, expected: [0, 1, 2] },
  { currentPage: 0, totalPages: 10, expected: [0, 1, 2, 3, 4] },
  { currentPage: 9, totalPages: 10, expected: [5, 6, 7, 8, 9] },
  { currentPage: 5, totalPages: 10, expected: [3, 4, 5, 6, 7] },
];

let failed = 0;
for (const c of cases) {
  const result = getPageWindow(c.currentPage, c.totalPages);
  const ok = JSON.stringify(result) === JSON.stringify(c.expected);
  if (!ok) {
    failed++;
    console.error(`FAIL: currentPage=${c.currentPage} totalPages=${c.totalPages} → ${JSON.stringify(result)}, expected ${JSON.stringify(c.expected)}`);
  }
}

if (failed > 0) {
  console.error(`${failed}개 케이스 실패`);
  process.exit(1);
}
console.log("모든 페이지네이션 케이스 통과");

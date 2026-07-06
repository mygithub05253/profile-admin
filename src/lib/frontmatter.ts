import matter from "gray-matter";

// js-yaml은 따옴표 없는 date: 2026-07-06 같은 값을 문자열이 아닌 Date 객체로 자동 변환한다.
// 이 Date가 그대로 JSX 자식으로 렌더링되면 "Objects are not valid as a React child" 런타임 에러가 난다.
function normalizeFrontmatterValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

export function parseFrontmatter(raw: string): { frontmatter: Record<string, unknown>; body: string } {
  const { data, content } = matter(raw);
  const frontmatter = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, normalizeFrontmatterValue(value)])
  );
  return { frontmatter, body: content.trim() };
}

export function stringifyFrontmatter(frontmatter: Record<string, unknown>, body: string): string {
  return matter.stringify(`${body.trim()}\n`, frontmatter);
}

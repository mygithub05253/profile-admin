import matter from "gray-matter";

export function parseFrontmatter(raw: string): { frontmatter: Record<string, unknown>; body: string } {
  const { data, content } = matter(raw);
  return { frontmatter: data, body: content.trim() };
}

export function stringifyFrontmatter(frontmatter: Record<string, unknown>, body: string): string {
  return matter.stringify(`${body.trim()}\n`, frontmatter);
}

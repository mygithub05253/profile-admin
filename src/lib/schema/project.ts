import { z } from "zod";

// content-hub velite.config.ts projects 컬렉션과 정확히 일치하는 스키마 (FR-M18)
// + content-hub scripts/validate_frontmatter.py의 P-1·P-2 규칙 클라이언트 측 반영
export const projectCategoryEnum = z.enum(["ai-data", "finance", "fullstack"]);
export const projectScopeEnum = z.enum(["personal", "team"]);
export const projectVisibilityEnum = z.enum(["public", "private"]);
export const projectStatusEnum = z.enum(["draft", "published"]);

// velog url_slug와 동일 허용 문자셋 (content-hub SLUG_PATTERN과 동일)
const SLUG_PATTERN = /^[A-Za-z0-9가-힣.]+(?:-[A-Za-z0-9가-힣.]+)*$/;

export const projectFrontmatterSchema = z
  .object({
    title: z.string().min(1, "title은 필수입니다"),
    slug: z.string().regex(SLUG_PATTERN, "slug 형식이 올바르지 않습니다 (kebab-case)"),
    type: z.literal("project"),
    category: z.array(projectCategoryEnum).min(1, "category는 1개 이상 선택해야 합니다"),
    scope: projectScopeEnum,
    role: z.string().optional(),
    period: z.string().min(1, "period는 필수입니다"),
    stack: z.array(z.string()).min(1, "stack은 1개 이상 입력해야 합니다"),
    summary: z.string().min(1, "summary는 필수입니다"),
    thumbnail: z.string().optional(),
    github: z.string().optional(),
    repoVisibility: projectVisibilityEnum,
    demo: z.string().optional(),
    featured: z.boolean(),
    order: z.number(),
    status: projectStatusEnum,
  })
  // P-1: scope=team ⇒ role 필수
  .refine((data) => data.scope !== "team" || !!data.role, {
    message: "scope: team 프로젝트는 role이 필수입니다 (P-1)",
    path: ["role"],
  });

export type ProjectFrontmatter = z.infer<typeof projectFrontmatterSchema>;

export const projectSaveSchema = z.object({
  frontmatter: projectFrontmatterSchema,
  body: z.string(),
  sha: z.string().optional(), // 수정 시 낙관적 잠금(FR-M21), 신규 생성 시 없음
});

export type ProjectSaveInput = z.infer<typeof projectSaveSchema>;

export interface ProjectListItem {
  slug: string;
  title: string;
  category: string[];
  scope: string;
  status: string;
  featured: boolean;
  updatedAt: string;
}

import { z } from "zod";
import { MAX_IMAGE_BYTES, MAX_IMAGES_PER_SAVE } from "../github/config";

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

// FR-M22 이미지 업로드 — 클라이언트가 리사이즈·WebP 압축까지 마친 base64를 전달
// (encoding="base64" 그대로 atomic-commit에 넘김, §22 R-3 크기 가드 서버 재검증)
const FILENAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.webp$/;

function base64ByteLength(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export const projectImageUploadSchema = z.object({
  filename: z.string().regex(FILENAME_PATTERN, "파일명은 소문자·숫자·하이픈 조합의 .webp만 허용됩니다"),
  content: z.string().refine((c) => base64ByteLength(c) <= MAX_IMAGE_BYTES, {
    message: `이미지는 장당 ${MAX_IMAGE_BYTES / 1024 / 1024}MB를 초과할 수 없습니다`,
  }),
});
export type ProjectImageUpload = z.infer<typeof projectImageUploadSchema>;

export const projectSaveSchema = z.object({
  frontmatter: projectFrontmatterSchema,
  body: z.string(),
  images: z.array(projectImageUploadSchema).max(MAX_IMAGES_PER_SAVE).optional(),
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

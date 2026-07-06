import { z } from "zod";

// content-hub scripts/validate_frontmatter.py의 posts/drafts 스키마(REQUIRED_FIELDS·ENUM_FIELDS)와
// 정확히 일치 (FR-M19). type: "project"는 P-7 규칙상 projects/ 전용이라 여기서는 제외한다.
export const postTypeEnum = z.enum(["post", "retrospective"]);
export const postSourceEnum = z.enum(["obsidian", "notion", "velog"]);
export const postVisibilityEnum = z.enum(["public", "private"]);
export const postStatusEnum = z.enum(["draft", "ready", "published", "synced"]);

// velog url_slug와 동일 허용 문자셋 (content-hub SLUG_PATTERN과 동일)
const SLUG_PATTERN = /^[A-Za-z0-9가-힣.]+(?:-[A-Za-z0-9가-힣.]+)*$/;

export const postFrontmatterSchema = z.object({
  title: z.string().min(1, "title은 필수입니다"),
  slug: z.string().regex(SLUG_PATTERN, "slug 형식이 올바르지 않습니다 (kebab-case)"),
  type: postTypeEnum,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "date는 YYYY-MM-DD 형식이어야 합니다"),
  tags: z.array(z.string()),
  source: postSourceEnum,
  status: postStatusEnum,
  visibility: postVisibilityEnum,
  velog_url: z.string().optional(),
  thumbnail: z.string().optional(),
});

export type PostFrontmatter = z.infer<typeof postFrontmatterSchema>;

export const draftSaveSchema = z.object({
  frontmatter: postFrontmatterSchema,
  body: z.string(),
  sha: z.string(),
});

export type DraftSaveInput = z.infer<typeof draftSaveSchema>;

export interface DraftListItem {
  slug: string;
  title: string;
  status: string;
  source: string;
  date: string;
  updatedAt: string;
}

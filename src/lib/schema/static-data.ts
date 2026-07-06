import { z } from "zod";

// content-hub velite.config.ts data/*.yml 3종(profileData·stacksData·recordsData)과
// 정확히 일치하는 스키마 (FR-M23 §23)

export const highlightColorEnum = z.enum(["gold", "blue", "green", "purple", "pink"]);

export const profileEmailSchema = z.object({
  label: z.string().min(1, "label은 필수입니다"),
  address: z.string().min(1, "address는 필수입니다"),
});

export const profileHighlightSchema = z.object({
  icon: z.string().min(1, "icon은 필수입니다"),
  title: z.string().min(1, "title은 필수입니다"),
  subtitle: z.string().min(1, "subtitle은 필수입니다"),
  description: z.string().min(1, "description은 필수입니다"),
  color: highlightColorEnum,
});

export const profileDataSchema = z.object({
  name: z.string().min(1, "name은 필수입니다"),
  nameEn: z.string().min(1, "nameEn은 필수입니다"),
  role: z.string().min(1, "role은 필수입니다"),
  intro: z.string().min(1, "intro는 필수입니다"),
  github: z.string().url("올바른 URL이 아닙니다"),
  velog: z.string().url("올바른 URL이 아닙니다"),
  emails: z.array(profileEmailSchema).min(1, "emails는 1개 이상 필요합니다"),
  highlights: z.array(profileHighlightSchema).min(1, "highlights는 1개 이상 필요합니다"),
});

export type ProfileData = z.infer<typeof profileDataSchema>;

export const stackCategoryEnum = z.enum(["data-ai", "backend", "frontend", "infra", "ai-tooling"]);

export const stackItemSchema = z
  .object({
    name: z.string().min(1, "name은 필수입니다"),
    icon: z.string().optional(),
    emoji: z.string().optional(),
    category: stackCategoryEnum,
    featured: z.boolean(),
  })
  .refine((item) => Boolean(item.icon || item.emoji), {
    message: "icon(simple-icons 슬러그) 또는 emoji 중 하나는 필수입니다",
    path: ["icon"],
  });

export const stacksDataSchema = z.object({
  items: z.array(stackItemSchema).min(1, "items는 1개 이상 필요합니다"),
});

export type StacksData = z.infer<typeof stacksDataSchema>;

export const recordCategoryEnum = z.enum([
  "education",
  "certification",
  "activity",
  "bootcamp",
  "competition",
  "project",
]);

export const recordLoopStepSchema = z.object({
  label: z.string().min(1, "label은 필수입니다"),
  description: z.string().min(1, "description은 필수입니다"),
});

export const recordItemSchema = z.object({
  date: z.string().min(1, "date는 필수입니다"),
  category: recordCategoryEnum,
  title: z.string().min(1, "title은 필수입니다"),
  description: z.string().min(1, "description은 필수입니다"),
  link: z.union([z.string().url("올바른 URL이 아닙니다"), z.literal("")]).optional(),
});

export const recordsDataSchema = z.object({
  intro: z.object({
    badge: z.string().min(1, "badge는 필수입니다"),
    title: z.string().min(1, "title은 필수입니다"),
    description: z.string().min(1, "description은 필수입니다"),
    loop: z.array(recordLoopStepSchema).min(1, "loop는 1개 이상 필요합니다"),
  }),
  items: z.array(recordItemSchema).min(1, "items는 1개 이상 필요합니다"),
});

export type RecordsData = z.infer<typeof recordsDataSchema>;

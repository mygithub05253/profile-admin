import { z } from "zod";

// content-hub data/ux-scores.yml과 정확히 일치하는 스키마 (신규, 세션 13 사용자 요청)
export const uxScoreSourceEnum = z.enum(["claude-review", "perplexity-research", "web-benchmark", "manual"]);
export const findingSeverityEnum = z.enum(["low", "medium", "high"]);
export const findingStatusEnum = z.enum(["open", "resolved"]);

export const uxFindingSchema = z.object({
  area: z.string(),
  severity: findingSeverityEnum,
  issue: z.string(),
  suggestion: z.string(),
  status: findingStatusEnum,
});

export const uxScoreEntrySchema = z.object({
  date: z.string(),
  overallScore: z.number().min(0).max(100),
  source: uxScoreSourceEnum,
  summary: z.string(),
  findings: z.array(uxFindingSchema),
});

export const uxScoreHistorySchema = z.array(uxScoreEntrySchema);

export type UxFinding = z.infer<typeof uxFindingSchema>;
export type UxScoreEntry = z.infer<typeof uxScoreEntrySchema>;

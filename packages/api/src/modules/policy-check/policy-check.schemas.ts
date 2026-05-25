import { z } from 'zod';

export const CheckVerdict = z.enum(['ok', 'gap', 'missing', 'review', 'not_applicable']);
export type CheckVerdict = z.infer<typeof CheckVerdict>;

export const CheckSeverity = z.enum(['blocking', 'material', 'minor', 'informational']);
export type CheckSeverity = z.infer<typeof CheckSeverity>;

export const CheckEvidenceSchema = z.object({
  requirement_source: z.string(),
  found_value: z.string().nullable(),
  document_id: z.string(),
  page_numbers: z.array(z.number()),
});
export type CheckEvidence = z.infer<typeof CheckEvidenceSchema>;

export const CheckResultItemSchema = z.object({
  check_id: z.string(),
  check_name: z.string(),
  verdict: CheckVerdict,
  severity: CheckSeverity,
  message: z.string(),
  evidence: CheckEvidenceSchema,
});
export type CheckResultItem = z.infer<typeof CheckResultItemSchema>;

export const SummaryCountsSchema = z.object({
  ok: z.number().int().nonnegative(),
  gap: z.number().int().nonnegative(),
  missing: z.number().int().nonnegative(),
  review: z.number().int().nonnegative(),
  not_applicable: z.number().int().nonnegative(),
});
export type SummaryCounts = z.infer<typeof SummaryCountsSchema>;

export const PolicyCheckResponseSchema = z.object({
  id: z.string(),
  case_id: z.string(),
  requirements_document_id: z.string(),
  target_document_id: z.string(),
  target_document_type: z.string(),
  results: z.array(CheckResultItemSchema),
  summary_counts: SummaryCountsSchema,
  created_at: z.string(),
});
export type PolicyCheckResponse = z.infer<typeof PolicyCheckResponseSchema>;

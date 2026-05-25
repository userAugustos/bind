import { z } from 'zod';

import { SummaryCountsSchema } from '../policy-check/policy-check.schemas';

export const OptionSummarySchema = z.object({
  target_document_id: z.string(),
  option_name: z.string(),
  carrier_name: z.string(),
  premium: z.number().nullable(),
  deductible_summary: z.string(),
  meets_core_requirements: z.boolean(),
  policy_check_summary: SummaryCountsSchema,
  strengths: z.array(z.string()),
  risks: z.array(z.string()),
  missing_requirements: z.array(z.string()),
  review_items: z.array(z.string()),
});

export type OptionSummary = z.infer<typeof OptionSummarySchema>;

export const RecommendationReasonSchema = z.enum([
  'meets_all_requirements_lowest_cost',
  'meets_all_requirements_only_option',
  'fewest_material_gaps',
  'no_clear_recommendation',
]);

export type RecommendationReason = z.infer<typeof RecommendationReasonSchema>;

export const RecommendationSignalSchema = z.object({
  recommended_document_id: z.string().nullable(),
  reason: RecommendationReasonSchema,
  explanation: z.string(),
});

export type RecommendationSignal = z.infer<typeof RecommendationSignalSchema>;

export const ComparisonResultSchema = z.object({
  options: z.array(OptionSummarySchema),
  recommendation: RecommendationSignalSchema,
});

export type ComparisonResult = z.infer<typeof ComparisonResultSchema>;

export const QuoteComparisonResponseSchema = z.object({
  id: z.string(),
  case_id: z.string(),
  requirements_document_id: z.string(),
  target_document_ids: z.array(z.string()),
  result: ComparisonResultSchema,
  created_at: z.string(),
});

export type QuoteComparisonResponse = z.infer<typeof QuoteComparisonResponseSchema>;

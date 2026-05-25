import { Elysia, t } from 'elysia';

import { quoteComparisonService } from './quote-comparison.service';

const SummaryCountsResponseSchema = t.Object({
  ok: t.Number(),
  gap: t.Number(),
  missing: t.Number(),
  review: t.Number(),
  not_applicable: t.Number(),
});

const OptionSummaryResponseSchema = t.Object({
  target_document_id: t.String(),
  option_name: t.String(),
  carrier_name: t.String(),
  premium: t.Nullable(t.Number()),
  deductible_summary: t.String(),
  meets_core_requirements: t.Boolean(),
  policy_check_summary: SummaryCountsResponseSchema,
  strengths: t.Array(t.String()),
  risks: t.Array(t.String()),
  missing_requirements: t.Array(t.String()),
  review_items: t.Array(t.String()),
});

const RecommendationSignalResponseSchema = t.Object({
  recommended_document_id: t.Nullable(t.String()),
  reason: t.String(),
  explanation: t.String(),
});

const ComparisonResultResponseSchema = t.Object({
  options: t.Array(OptionSummaryResponseSchema),
  recommendation: RecommendationSignalResponseSchema,
});

const QuoteComparisonResponseSchema = t.Object({
  id: t.String(),
  case_id: t.String(),
  requirements_document_id: t.String(),
  target_document_ids: t.Array(t.String()),
  result: ComparisonResultResponseSchema,
  created_at: t.String(),
});

export const quoteComparisonRoutes = new Elysia({ prefix: '/cases' })
  .post(
    '/:case_id/quote-comparison',
    async ({ params, body, set }) => {
      set.status = 201;
      return quoteComparisonService.runQuoteComparison(
        params.case_id,
        body.requirements_document_id,
        body.target_document_ids
      );
    },
    {
      params: t.Object({ case_id: t.String() }),
      body: t.Object({
        requirements_document_id: t.String(),
        target_document_ids: t.Array(t.String(), { minItems: 2 }),
      }),
      response: { 201: QuoteComparisonResponseSchema },
      detail: { summary: 'Run quote comparison', tags: ['quote-comparison'] },
    }
  )
  .get(
    '/:case_id/quote-comparison',
    async ({ params }) => quoteComparisonService.getLatestResult(params.case_id),
    {
      params: t.Object({ case_id: t.String() }),
      response: { 200: QuoteComparisonResponseSchema },
      detail: { summary: 'Get latest quote comparison result', tags: ['quote-comparison'] },
    }
  )
  .get(
    '/:case_id/quote-comparison/history',
    async ({ params }) => quoteComparisonService.getHistory(params.case_id),
    {
      params: t.Object({ case_id: t.String() }),
      response: { 200: t.Array(QuoteComparisonResponseSchema) },
      detail: { summary: 'Get quote comparison history', tags: ['quote-comparison'] },
    }
  );

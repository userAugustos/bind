import { Elysia } from 'elysia';
import { z } from 'zod';

import { QuoteComparisonResponseSchema } from './quote-comparison.schemas';
import { quoteComparisonService } from './quote-comparison.service';

const RunQuoteComparisonBody = z.object({
  requirements_document_id: z.string(),
  target_document_ids: z.array(z.string()).min(2),
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
      params: z.object({ case_id: z.string() }),
      body: RunQuoteComparisonBody,
      response: { 201: QuoteComparisonResponseSchema },
      detail: { summary: 'Run quote comparison', tags: ['quote-comparison'] },
    }
  )
  .get(
    '/:case_id/quote-comparison',
    async ({ params }) => quoteComparisonService.getLatestResult(params.case_id),
    {
      params: z.object({ case_id: z.string() }),
      response: { 200: QuoteComparisonResponseSchema },
      detail: { summary: 'Get latest quote comparison result', tags: ['quote-comparison'] },
    }
  )
  .get(
    '/:case_id/quote-comparison/history',
    async ({ params }) => quoteComparisonService.getHistory(params.case_id),
    {
      params: z.object({ case_id: z.string() }),
      response: { 200: z.array(QuoteComparisonResponseSchema) },
      detail: { summary: 'Get quote comparison history', tags: ['quote-comparison'] },
    }
  );

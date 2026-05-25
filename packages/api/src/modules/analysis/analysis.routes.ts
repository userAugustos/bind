import { Elysia } from 'elysia';
import { z } from 'zod';

import { AnalysisResultSchema } from './analysis.schemas';
import { analysisService } from './analysis.service';

const AnalysisResponseSchema = z.object({
  id: z.string(),
  document_id: z.string(),
  document_type: z.string(),
  status: z.string(),
  result: AnalysisResultSchema.nullable(),
  error: z.string().nullable(),
  prompt_name: z.string(),
  prompt_version: z.string(),
  schema_version: z.string(),
  model_provider: z.string(),
  model_name: z.string(),
  created_at: z.string(),
});

export const analysisRoutes = new Elysia({ prefix: '/cases' })
  .post(
    '/:case_id/documents/:document_id/analyze',
    async ({ params, set }) => {
      set.status = 201;
      return analysisService.triggerAnalysis(params.case_id, params.document_id);
    },
    {
      params: z.object({ case_id: z.string(), document_id: z.string() }),
      response: { 201: AnalysisResponseSchema },
      detail: { summary: 'Trigger document analysis', tags: ['analysis'] },
    }
  )
  .get(
    '/:case_id/documents/:document_id/analysis',
    async ({ params }) => analysisService.getAnalysis(params.case_id, params.document_id),
    {
      params: z.object({ case_id: z.string(), document_id: z.string() }),
      response: { 200: AnalysisResponseSchema },
      detail: { summary: 'Get latest analysis for a document', tags: ['analysis'] },
    }
  )
  .get(
    '/:case_id/documents/:document_id/analysis/history',
    async ({ params }) => analysisService.getAnalysisHistory(params.case_id, params.document_id),
    {
      params: z.object({ case_id: z.string(), document_id: z.string() }),
      response: { 200: z.array(AnalysisResponseSchema) },
      detail: { summary: 'Get analysis history for a document', tags: ['analysis'] },
    }
  );

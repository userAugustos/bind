import { Elysia, t } from 'elysia';

import { analysisService } from './analysis.service';

const AnalysisResponseSchema = t.Object({
  id: t.String(),
  document_id: t.String(),
  document_type: t.String(),
  status: t.String(),
  result: t.Unknown(),
  error: t.Nullable(t.String()),
  prompt_name: t.String(),
  prompt_version: t.String(),
  schema_version: t.String(),
  model_provider: t.String(),
  model_name: t.String(),
  created_at: t.String(),
});

export const analysisRoutes = new Elysia({ prefix: '/cases' })
  .post(
    '/:case_id/documents/:document_id/analyze',
    async ({ params, set }) => {
      set.status = 201;
      return analysisService.triggerAnalysis(params.case_id, params.document_id);
    },
    {
      params: t.Object({ case_id: t.String(), document_id: t.String() }),
      response: { 201: AnalysisResponseSchema },
      detail: { summary: 'Trigger document analysis', tags: ['analysis'] },
    }
  )
  .get(
    '/:case_id/documents/:document_id/analysis',
    async ({ params }) => analysisService.getAnalysis(params.case_id, params.document_id),
    {
      params: t.Object({ case_id: t.String(), document_id: t.String() }),
      response: { 200: AnalysisResponseSchema },
      detail: { summary: 'Get latest analysis for a document', tags: ['analysis'] },
    }
  )
  .get(
    '/:case_id/documents/:document_id/analysis/history',
    async ({ params }) => analysisService.getAnalysisHistory(params.case_id, params.document_id),
    {
      params: t.Object({ case_id: t.String(), document_id: t.String() }),
      response: { 200: t.Array(AnalysisResponseSchema) },
      detail: { summary: 'Get analysis history for a document', tags: ['analysis'] },
    }
  );

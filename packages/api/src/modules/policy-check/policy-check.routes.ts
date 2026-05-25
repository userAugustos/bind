import { Elysia, t } from 'elysia';

import { policyCheckService } from './policy-check.service';

const CheckEvidenceResponseSchema = t.Object({
  requirement_source: t.String(),
  found_value: t.Nullable(t.String()),
  document_id: t.String(),
  page_numbers: t.Array(t.Number()),
});

const CheckResultItemResponseSchema = t.Object({
  check_id: t.String(),
  check_name: t.String(),
  verdict: t.String(),
  severity: t.String(),
  message: t.String(),
  evidence: CheckEvidenceResponseSchema,
});

const SummaryCountsResponseSchema = t.Object({
  ok: t.Number(),
  gap: t.Number(),
  missing: t.Number(),
  review: t.Number(),
  not_applicable: t.Number(),
});

const PolicyCheckResponseSchema = t.Object({
  id: t.String(),
  case_id: t.String(),
  requirements_document_id: t.String(),
  target_document_id: t.String(),
  target_document_type: t.String(),
  results: t.Array(CheckResultItemResponseSchema),
  summary_counts: SummaryCountsResponseSchema,
  created_at: t.String(),
});

export const policyCheckRoutes = new Elysia({ prefix: '/cases' })
  .post(
    '/:case_id/policy-check',
    async ({ params, body, set }) => {
      set.status = 201;
      return policyCheckService.runPolicyCheck(
        params.case_id,
        body.requirements_document_id,
        body.target_document_id
      );
    },
    {
      params: t.Object({ case_id: t.String() }),
      body: t.Object({
        requirements_document_id: t.String(),
        target_document_id: t.String(),
      }),
      response: { 201: PolicyCheckResponseSchema },
      detail: { summary: 'Run policy check', tags: ['policy-check'] },
    }
  )
  .get(
    '/:case_id/policy-check',
    async ({ params, query }) =>
      policyCheckService.getLatestResult(params.case_id, query.target_document_id),
    {
      params: t.Object({ case_id: t.String() }),
      query: t.Object({ target_document_id: t.Optional(t.String()) }),
      response: { 200: PolicyCheckResponseSchema },
      detail: { summary: 'Get latest policy check result', tags: ['policy-check'] },
    }
  )
  .get(
    '/:case_id/policy-check/history',
    async ({ params, query }) =>
      policyCheckService.getHistory(params.case_id, query.target_document_id),
    {
      params: t.Object({ case_id: t.String() }),
      query: t.Object({ target_document_id: t.Optional(t.String()) }),
      response: { 200: t.Array(PolicyCheckResponseSchema) },
      detail: { summary: 'Get policy check history', tags: ['policy-check'] },
    }
  );

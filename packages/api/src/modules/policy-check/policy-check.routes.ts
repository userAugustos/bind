import { Elysia } from 'elysia';
import { z } from 'zod';

import { PolicyCheckResponseSchema } from './policy-check.schemas';
import { policyCheckService } from './policy-check.service';

const RunPolicyCheckBody = z.object({
  requirements_document_id: z.string(),
  target_document_id: z.string(),
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
      params: z.object({ case_id: z.string() }),
      body: RunPolicyCheckBody,
      response: { 201: PolicyCheckResponseSchema },
      detail: { summary: 'Run policy check', tags: ['policy-check'] },
    }
  )
  .get(
    '/:case_id/policy-check',
    async ({ params, query }) =>
      policyCheckService.getLatestResult(params.case_id, query.target_document_id),
    {
      params: z.object({ case_id: z.string() }),
      query: z.object({ target_document_id: z.string().optional() }),
      response: { 200: PolicyCheckResponseSchema },
      detail: { summary: 'Get latest policy check result', tags: ['policy-check'] },
    }
  )
  .get(
    '/:case_id/policy-check/history',
    async ({ params, query }) =>
      policyCheckService.getHistory(params.case_id, query.target_document_id),
    {
      params: z.object({ case_id: z.string() }),
      query: z.object({ target_document_id: z.string().optional() }),
      response: { 200: z.array(PolicyCheckResponseSchema) },
      detail: { summary: 'Get policy check history', tags: ['policy-check'] },
    }
  );

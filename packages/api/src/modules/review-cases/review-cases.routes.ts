import { Elysia } from 'elysia';
import { z } from 'zod';

import {
  CaseResponse,
  CreateCaseBody,
  TransitionBody,
  UpdateCaseBody,
} from './review-cases.schemas';
import { reviewCasesService } from './review-cases.service';

export const reviewCasesRoutes = new Elysia({ prefix: '/cases' })
  .post(
    '/',
    async ({ body, set }) => {
      set.status = 201;
      return reviewCasesService.createCase(body);
    },
    {
      body: CreateCaseBody,
      response: { 201: CaseResponse },
      detail: { summary: 'Create a review case', tags: ['review-cases'] },
    }
  )
  .get('/', async () => reviewCasesService.getCases(), {
    response: { 200: z.array(CaseResponse) },
    detail: { summary: 'List review cases', tags: ['review-cases'] },
  })
  .get('/:case_id', async ({ params }) => reviewCasesService.getCase(params.case_id), {
    params: z.object({ case_id: z.string() }),
    response: { 200: CaseResponse },
    detail: { summary: 'Get a review case', tags: ['review-cases'] },
  })
  .patch(
    '/:case_id',
    async ({ params, body }) => reviewCasesService.updateCase(params.case_id, body),
    {
      params: z.object({ case_id: z.string() }),
      body: UpdateCaseBody,
      response: { 200: CaseResponse },
      detail: { summary: 'Update a review case', tags: ['review-cases'] },
    }
  )
  .post(
    '/:case_id/transition',
    async ({ params, body }) => reviewCasesService.transitionCase(params.case_id, body.event),
    {
      params: z.object({ case_id: z.string() }),
      body: TransitionBody,
      response: { 200: CaseResponse },
      detail: { summary: 'Transition case status', tags: ['review-cases'] },
    }
  )
  .delete(
    '/:case_id',
    async ({ params, set }) => {
      await reviewCasesService.deleteCase(params.case_id);
      set.status = 204;
    },
    {
      params: z.object({ case_id: z.string() }),
      detail: { summary: 'Delete a review case', tags: ['review-cases'] },
    }
  );

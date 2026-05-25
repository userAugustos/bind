import { Elysia } from 'elysia';
import { z } from 'zod';

import { MEMO_SECTIONS, MemoResponseSchema } from './memo.schemas';
import { memoService } from './memo.service';
import type { MemoContent, MemoSection } from './memo.schemas';

const SECTION_DELAY_MS = 3000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sectionValue(content: MemoContent, section: MemoSection): string | string[] {
  return content[section];
}

export const memoRoutes = new Elysia({ prefix: '/cases' })
  .post(
    '/:case_id/memo',
    async ({ params, set }) => {
      set.status = 201;
      return memoService.generateMemo(params.case_id);
    },
    {
      params: z.object({ case_id: z.string() }),
      response: { 201: MemoResponseSchema },
      detail: { summary: 'Generate proposal memo', tags: ['memo'] },
    }
  )
  .get('/:case_id/memo', async ({ params }) => memoService.getLatestMemo(params.case_id), {
    params: z.object({ case_id: z.string() }),
    response: { 200: MemoResponseSchema },
    detail: { summary: 'Get latest proposal memo', tags: ['memo'] },
  })
  .get(
    '/:case_id/memo/stream',
    async function* ({ params }) {
      const content = await memoService.getLatestMemoContent(params.case_id);

      for (const section of MEMO_SECTIONS) {
        const value = sectionValue(content, section);
        yield { event: section, data: JSON.stringify({ section, value }) };
        await sleep(SECTION_DELAY_MS);
      }

      yield { event: 'done', data: JSON.stringify({ section: 'done' }) };
    },
    {
      params: z.object({ case_id: z.string() }),
      detail: { summary: 'Stream proposal memo sections via SSE', tags: ['memo'] },
    }
  );

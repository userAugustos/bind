import { Elysia, t } from 'elysia';

import { MEMO_SECTIONS } from './memo.schemas';
import { memoService } from './memo.service';
import type { MemoContent, MemoSection } from './memo.schemas';

const MemoContentResponseSchema = t.Object({
  executive_summary: t.String(),
  coverage_gaps: t.String(),
  quote_comparison: t.String(),
  recommendation: t.String(),
  next_steps: t.Array(t.String()),
});

const MemoResponseSchema = t.Object({
  id: t.String(),
  case_id: t.String(),
  status: t.String(),
  content: t.Nullable(MemoContentResponseSchema),
  error: t.Nullable(t.String()),
  model_provider: t.String(),
  model_name: t.String(),
  created_at: t.String(),
});

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
      params: t.Object({ case_id: t.String() }),
      response: { 201: MemoResponseSchema },
      detail: { summary: 'Generate proposal memo', tags: ['memo'] },
    }
  )
  .get('/:case_id/memo', async ({ params }) => memoService.getLatestMemo(params.case_id), {
    params: t.Object({ case_id: t.String() }),
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
      params: t.Object({ case_id: t.String() }),
      detail: { summary: 'Stream proposal memo sections via SSE', tags: ['memo'] },
    }
  );

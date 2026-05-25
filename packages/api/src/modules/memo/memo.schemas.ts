import { z } from 'zod';

export const MemoContentSchema = z.object({
  executive_summary: z.string().min(1),
  coverage_gaps: z.string().min(1),
  quote_comparison: z.string().min(1),
  recommendation: z.string().min(1),
  next_steps: z.array(z.string().min(1)).min(1),
});

export type MemoContent = z.infer<typeof MemoContentSchema>;

export const MEMO_SECTIONS = [
  'executive_summary',
  'coverage_gaps',
  'quote_comparison',
  'recommendation',
  'next_steps',
] as const;

export type MemoSection = (typeof MEMO_SECTIONS)[number];

export const MemoResponseSchema = z.object({
  id: z.string(),
  case_id: z.string(),
  status: z.enum(['completed', 'failed']),
  content: MemoContentSchema.nullable(),
  error: z.string().nullable(),
  model_provider: z.string(),
  model_name: z.string(),
  created_at: z.string(),
});

export type MemoResponse = z.infer<typeof MemoResponseSchema>;

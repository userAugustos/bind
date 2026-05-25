import { z } from 'zod';

export const CaseStatusValues = ['draft', 'in_review', 'completed', 'cancelled'] as const;
export type CaseStatus = (typeof CaseStatusValues)[number];

export const CaseEventValues = ['submit', 'complete', 'cancel'] as const;
export type CaseEvent = (typeof CaseEventValues)[number];

export const CreateCaseBody = z.object({
  case_name: z.string().min(1),
  client_name: z.string().min(1),
});

export const UpdateCaseBody = z
  .object({
    case_name: z.string().min(1).optional(),
    client_name: z.string().min(1).optional(),
  })
  .refine((data) => data.case_name !== undefined || data.client_name !== undefined, {
    message: 'At least one field must be provided',
  });

export const TransitionBody = z.object({
  event: z.enum(['submit', 'complete', 'cancel']),
});

export const CaseResponse = z.object({
  id: z.string(),
  case_name: z.string(),
  client_name: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CaseResponseType = z.infer<typeof CaseResponse>;

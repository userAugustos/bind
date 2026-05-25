import { z } from 'zod';

export const CaseStatusValues = ['draft', 'in_review', 'completed', 'cancelled'] as const;
export type CaseStatus = (typeof CaseStatusValues)[number];

export const CaseEventValues = ['submit', 'complete', 'cancel'] as const;
export type CaseEvent = (typeof CaseEventValues)[number];

export type CaseResponseType = {
  id: string;
  case_name: string;
  client_name: string;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
};

export const CreateCaseBody = z.object({
  case_name: z.string().min(1),
  client_name: z.string().min(1),
});

export const UpdateCaseBody = z
  .object({
    case_name: z.string().min(1).optional(),
    client_name: z.string().min(1).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, 'Expected object to have at least 1 properties');

export const TransitionBody = z.object({
  event: z.enum(CaseEventValues),
});

export const CaseResponse = z.object({
  id: z.string(),
  case_name: z.string(),
  client_name: z.string(),
  status: z.enum(CaseStatusValues),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CaseParams = z.object({ case_id: z.string() });

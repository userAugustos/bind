import { t } from 'elysia';

export const CaseStatusValues = ['draft', 'in_review', 'completed', 'cancelled'] as const;
export type CaseStatus = (typeof CaseStatusValues)[number];

export const CaseEventValues = ['submit', 'complete', 'cancel'] as const;
export type CaseEvent = (typeof CaseEventValues)[number];

export const CreateCaseBody = t.Object({
  case_name: t.String({ minLength: 1 }),
  client_name: t.String({ minLength: 1 }),
});

export const UpdateCaseBody = t.Object(
  {
    case_name: t.Optional(t.String({ minLength: 1 })),
    client_name: t.Optional(t.String({ minLength: 1 })),
  },
  {
    additionalProperties: false,
    minProperties: 1,
  }
);

export const TransitionBody = t.Object({
  event: t.Union([t.Literal('submit'), t.Literal('complete'), t.Literal('cancel')]),
});

export const CaseResponse = t.Object({
  id: t.String(),
  case_name: t.String(),
  client_name: t.String(),
  status: t.String(),
  created_at: t.String(),
  updated_at: t.String(),
});

export interface CaseResponseType {
  id: string;
  case_name: string;
  client_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

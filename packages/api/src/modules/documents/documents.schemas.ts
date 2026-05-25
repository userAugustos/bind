import { t } from 'elysia';

export const DocumentTypeValues = [
  'contract_requirements',
  'current_policy',
  'carrier_quote',
  'loss_history',
  'other',
] as const;
export type DocumentType = (typeof DocumentTypeValues)[number];

export const AnalysisStatusValues = ['pending', 'processing', 'completed', 'failed'] as const;
export type AnalysisStatus = (typeof AnalysisStatusValues)[number];

export const CreateDocumentBody = t.Object({
  file_name: t.String({ minLength: 1 }),
  mime_type: t.String({ minLength: 1 }),
  document_type: t.Union([
    t.Literal('contract_requirements'),
    t.Literal('current_policy'),
    t.Literal('carrier_quote'),
    t.Literal('loss_history'),
    t.Literal('other'),
  ]),
});

export const DocumentResponse = t.Object({
  id: t.String(),
  case_id: t.String(),
  file_name: t.String(),
  mime_type: t.String(),
  document_type: t.String(),
  analysis_status: t.String(),
  created_at: t.String(),
});

export interface DocumentResponseType {
  id: string;
  case_id: string;
  file_name: string;
  mime_type: string;
  document_type: string;
  analysis_status: string;
  created_at: string;
}

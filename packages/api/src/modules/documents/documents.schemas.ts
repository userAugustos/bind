import { z } from 'zod';

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

export const CreateDocumentBody = z.object({
  file_name: z.string().min(1),
  mime_type: z.string().min(1),
  document_type: z.enum(DocumentTypeValues),
});

export const DocumentResponse = z.object({
  id: z.string(),
  case_id: z.string(),
  file_name: z.string(),
  mime_type: z.string(),
  document_type: z.string(),
  analysis_status: z.string(),
  created_at: z.string(),
});

export type DocumentResponseType = z.infer<typeof DocumentResponse>;

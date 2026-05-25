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

export type DocumentResponseType = {
  id: string;
  case_id: string;
  file_name: string;
  mime_type: string;
  document_type: DocumentType;
  analysis_status: AnalysisStatus;
  created_at: string;
};

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
  document_type: z.enum(DocumentTypeValues),
  analysis_status: z.enum(AnalysisStatusValues),
  created_at: z.string(),
});

export const DocumentCaseParams = z.object({ case_id: z.string() });
export const DocumentParams = z.object({ case_id: z.string(), document_id: z.string() });

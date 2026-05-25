import { notFound } from '@core/errors';

import { reviewCasesRepository } from '../review-cases/review-cases.repository';
import { documentsRepository } from './documents.repository';
import type { DocumentResponseType, DocumentType } from './documents.schemas';

export const documentsService = {
  async createDocument(
    caseId: string,
    data: { file_name: string; mime_type: string; document_type: DocumentType }
  ): Promise<DocumentResponseType> {
    const existing = await reviewCasesRepository.findById(caseId);
    if (!existing) throw notFound('case_not_found', `Case '${caseId}' not found`);
    return documentsRepository.create({ case_id: caseId, ...data });
  },

  async getDocuments(caseId: string): Promise<DocumentResponseType[]> {
    const existing = await reviewCasesRepository.findById(caseId);
    if (!existing) throw notFound('case_not_found', `Case '${caseId}' not found`);
    return documentsRepository.findByCaseId(caseId);
  },

  async getDocument(caseId: string, id: string): Promise<DocumentResponseType> {
    const found = await documentsRepository.findById(id);
    if (!found || found.case_id !== caseId)
      throw notFound('document_not_found', `Document '${id}' not found`);
    return found;
  },

  async deleteDocument(caseId: string, id: string): Promise<void> {
    const found = await documentsRepository.findById(id);
    if (!found || found.case_id !== caseId)
      throw notFound('document_not_found', `Document '${id}' not found`);
    await documentsRepository.deleteById(id);
  },
};

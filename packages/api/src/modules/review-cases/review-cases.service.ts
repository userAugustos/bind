import { badRequest, conflict, internalError, notFound } from '@core/errors';

import { documentsRepository } from '../documents/documents.repository';
import { reviewCasesRepository } from './review-cases.repository';
import { CaseStatusValues } from './review-cases.schemas';
import type { CaseEvent, CaseResponseType, CaseStatus } from './review-cases.schemas';

const transitions: Record<CaseStatus, Partial<Record<CaseEvent, CaseStatus>>> = {
  draft: { submit: 'in_review', cancel: 'cancelled' },
  in_review: { complete: 'completed', cancel: 'cancelled' },
  completed: {},
  cancelled: {},
};

const applyTransition = (currentStatus: CaseStatus, event: CaseEvent): CaseStatus => {
  const next = transitions[currentStatus]?.[event];
  if (!next) {
    throw badRequest(
      'invalid_transition',
      `Cannot apply event '${event}' to case in status '${currentStatus}'`
    );
  }
  return next;
};

export const reviewCasesService = {
  async createCase(data: { case_name: string; client_name: string }): Promise<CaseResponseType> {
    return reviewCasesRepository.create(data);
  },

  async getCases(): Promise<CaseResponseType[]> {
    return reviewCasesRepository.findAll();
  },

  async getCase(id: string): Promise<CaseResponseType> {
    const found = await reviewCasesRepository.findById(id);
    if (!found) throw notFound('case_not_found', `Case '${id}' not found`);
    return found;
  },

  async updateCase(
    id: string,
    data: { case_name?: string; client_name?: string }
  ): Promise<CaseResponseType> {
    const existing = await reviewCasesRepository.findById(id);
    if (!existing) throw notFound('case_not_found', `Case '${id}' not found`);
    const updated = await reviewCasesRepository.update(id, {
      ...data,
      updated_at: new Date().toISOString(),
    });
    return updated!;
  },

  async transitionCase(id: string, event: CaseEvent): Promise<CaseResponseType> {
    const existing = await reviewCasesRepository.findById(id);
    if (!existing) throw notFound('case_not_found', `Case '${id}' not found`);
    if (!CaseStatusValues.includes(existing.status as CaseStatus)) {
      throw internalError(
        'invalid_status',
        `Case '${id}' has unexpected status '${existing.status}'`
      );
    }
    const nextStatus = applyTransition(existing.status as CaseStatus, event);
    const updated = await reviewCasesRepository.update(id, {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    });
    return updated!;
  },

  async deleteCase(id: string): Promise<void> {
    const existing = await reviewCasesRepository.findById(id);
    if (!existing) throw notFound('case_not_found', `Case '${id}' not found`);
    const docCount = await documentsRepository.countByCaseId(id);
    if (docCount > 0) {
      throw conflict('case_has_documents', 'Cannot delete a case that has documents');
    }
    await reviewCasesRepository.deleteById(id);
  },
};

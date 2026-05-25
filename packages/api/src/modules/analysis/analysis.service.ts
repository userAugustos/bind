import { config } from '@core/env';
import { AppError, internalError, notFound } from '@core/errors';
import { logger } from '@core/logger';

import { documentsRepository } from '../documents/documents.repository';
import { MockAnalysisProvider } from './analysis.provider.mock';
import { ModalAnalysisProvider } from './analysis.provider.modal';
import { analysisRepository } from './analysis.repository';
import { AnalysisResultSchema, SCHEMA_VERSION } from './analysis.schemas';
import { transitionAnalysisStatus } from './analysis.state-machine';
import type { AnalysisProvider } from './analysis.provider';
import type { AnalysisRow } from './analysis.repository';
import type { AnalysisResult } from './analysis.schemas';
import type { AnalysisState } from './analysis.state-machine';

export interface AnalysisResponse {
  id: string;
  document_id: string;
  document_type: string;
  status: string;
  result: AnalysisResult | null;
  error: string | null;
  prompt_name: string;
  prompt_version: string;
  schema_version: string;
  model_provider: string;
  model_name: string;
  created_at: string;
}

function parseResult(raw: string): AnalysisResult | null {
  try {
    const parsed = JSON.parse(raw);
    const validation = AnalysisResultSchema.safeParse(parsed);
    return validation.success ? validation.data : null;
  } catch {
    return null;
  }
}

function toResponse(row: AnalysisRow): AnalysisResponse {
  return {
    id: row.id,
    document_id: row.document_id,
    document_type: row.document_type,
    status: row.status,
    result: parseResult(row.result),
    error: row.error,
    prompt_name: row.prompt_name,
    prompt_version: row.prompt_version,
    schema_version: row.schema_version,
    model_provider: row.model_provider,
    model_name: row.model_name,
    created_at: row.created_at,
  };
}

function resolveProvider(): AnalysisProvider {
  if (config.isTest || !config.modal.endpoint) {
    return new MockAnalysisProvider();
  }
  return new ModalAnalysisProvider();
}

export const analysisService = {
  async triggerAnalysis(caseId: string, documentId: string): Promise<AnalysisResponse> {
    const document = await documentsRepository.findById(documentId);
    if (!document || document.case_id !== caseId) {
      throw notFound('document_not_found', `Document '${documentId}' not found`);
    }

    const currentStatus = document.analysis_status as AnalysisState;
    const event = currentStatus === 'failed' || currentStatus === 'processing' ? 'retry' : 'start';
    const processingStatus = transitionAnalysisStatus(currentStatus, event);
    await documentsRepository.updateAnalysisStatus(documentId, processingStatus);

    const provider = resolveProvider();
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await provider.analyze({
          document_id: documentId,
          document_type: document.document_type,
          file_name: document.file_name,
        });

        const parsed = JSON.parse(response.raw_json);
        const validation = AnalysisResultSchema.safeParse(parsed);

        if (!validation.success) {
          if (attempts < maxAttempts) {
            logger.warn('Analysis validation failed, retrying', {
              document_id: documentId,
              attempt: attempts,
              errors: validation.error.issues,
            });
            continue;
          }
          const failedStatus = transitionAnalysisStatus(processingStatus, 'fail');
          await documentsRepository.updateAnalysisStatus(documentId, failedStatus);

          const errorMessage = `Validation failed: ${validation.error.issues.map((i) => i.message).join(', ')}`;
          const row = await analysisRepository.create({
            document_id: documentId,
            document_type: document.document_type,
            status: 'failed',
            result: response.raw_json,
            error: errorMessage,
            prompt_name: 'document_analysis',
            prompt_version: '1.0.0',
            schema_version: SCHEMA_VERSION,
            model_provider: provider.name,
            model_name: response.model_name,
          });
          return toResponse(row);
        }

        const completedStatus = transitionAnalysisStatus(processingStatus, 'complete');
        await documentsRepository.updateAnalysisStatus(documentId, completedStatus);

        const row = await analysisRepository.create({
          document_id: documentId,
          document_type: document.document_type,
          status: 'completed',
          result: response.raw_json,
          prompt_name: 'document_analysis',
          prompt_version: '1.0.0',
          schema_version: SCHEMA_VERSION,
          model_provider: provider.name,
          model_name: response.model_name,
        });
        return toResponse(row);
      } catch (error) {
        if (error instanceof AppError) throw error;
        if (attempts >= maxAttempts) {
          const failedStatus = transitionAnalysisStatus(processingStatus, 'fail');
          await documentsRepository.updateAnalysisStatus(documentId, failedStatus);

          const errorMessage = error instanceof Error ? error.message : 'Unknown provider error';
          const row = await analysisRepository.create({
            document_id: documentId,
            document_type: document.document_type,
            status: 'failed',
            result: '{}',
            error: errorMessage,
            prompt_name: 'document_analysis',
            prompt_version: '1.0.0',
            schema_version: SCHEMA_VERSION,
            model_provider: provider.name,
            model_name: 'unknown',
          });

          throw internalError('analysis_failed', errorMessage, { meta: { analysis_id: row.id } });
        }
        logger.warn('Analysis provider error, retrying', {
          document_id: documentId,
          attempt: attempts,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    throw internalError('analysis_exhausted', 'Analysis failed after all retry attempts');
  },

  async getAnalysis(caseId: string, documentId: string): Promise<AnalysisResponse> {
    const document = await documentsRepository.findById(documentId);
    if (!document || document.case_id !== caseId) {
      throw notFound('document_not_found', `Document '${documentId}' not found`);
    }

    const row = await analysisRepository.findLatestByDocumentId(documentId);
    if (!row) {
      throw notFound('analysis_not_found', `No analysis found for document '${documentId}'`);
    }
    return toResponse(row);
  },

  async getAnalysisHistory(caseId: string, documentId: string): Promise<AnalysisResponse[]> {
    const document = await documentsRepository.findById(documentId);
    if (!document || document.case_id !== caseId) {
      throw notFound('document_not_found', `Document '${documentId}' not found`);
    }

    const rows = await analysisRepository.findByDocumentId(documentId);
    return rows.map(toResponse);
  },
};

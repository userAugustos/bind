import { config } from '@core/env';
import { AppError, badRequest, internalError, notFound } from '@core/errors';
import { logger } from '@core/logger';

import { analysisRepository } from '../analysis/analysis.repository';
import { policyCheckRepository } from '../policy-check/policy-check.repository';
import { quoteComparisonRepository } from '../quote-comparison/quote-comparison.repository';
import { reviewCasesRepository } from '../review-cases/review-cases.repository';
import { MockMemoProvider } from './memo.provider.mock';
import { ModalMemoProvider } from './memo.provider.modal';
import { memoRepository } from './memo.repository';
import { MemoContentSchema } from './memo.schemas';
import type { CheckResultItem, SummaryCounts } from '../policy-check/policy-check.schemas';
import type { ComparisonResult } from '../quote-comparison/quote-comparison.schemas';
import type { MemoProvider, PolicyCheckSummaryInput } from './memo.provider';
import type { MemoRow } from './memo.repository';
import type { MemoContent, MemoResponse } from './memo.schemas';

function parseContent(raw: string): MemoContent | null {
  try {
    const parsed = JSON.parse(raw);
    const result = MemoContentSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function toResponse(row: MemoRow): MemoResponse {
  return {
    id: row.id,
    case_id: row.case_id,
    status: row.status as 'completed' | 'failed',
    content: parseContent(row.content),
    error: row.error,
    model_provider: row.model_provider,
    model_name: row.model_name,
    created_at: row.created_at,
  };
}

function resolveProvider(): MemoProvider {
  if (config.isTest || !config.modal.endpoint) {
    return new MockMemoProvider();
  }
  return new ModalMemoProvider();
}

function extractCarrierName(rawResult: string): string {
  try {
    const parsed = JSON.parse(rawResult);
    if (typeof parsed.carrier_name === 'string') return parsed.carrier_name;
    return 'Unknown Carrier';
  } catch {
    return 'Unknown Carrier';
  }
}

export const memoService = {
  async generateMemo(caseId: string): Promise<MemoResponse> {
    const reviewCase = await reviewCasesRepository.findById(caseId);
    if (!reviewCase) {
      throw notFound('case_not_found', `Case '${caseId}' not found`);
    }

    const comparisonRow = await quoteComparisonRepository.findLatestByCaseId(caseId);
    if (!comparisonRow) {
      throw badRequest(
        'comparison_not_found',
        'No quote comparison results found. Run quote comparison first.'
      );
    }

    const comparisonResult = JSON.parse(comparisonRow.result) as ComparisonResult;
    const targetDocumentIds = JSON.parse(comparisonRow.target_document_ids) as string[];

    const policyCheckSummaries: PolicyCheckSummaryInput[] = [];

    for (const targetId of targetDocumentIds) {
      const policyCheckRow = await policyCheckRepository.findLatestByCaseId(caseId, targetId);
      if (!policyCheckRow) {
        throw badRequest(
          'policy_check_not_found',
          `No policy check results found for document '${targetId}'.`
        );
      }

      const analysisRow = await analysisRepository.findLatestByDocumentId(targetId);
      const carrierName = analysisRow ? extractCarrierName(analysisRow.result) : 'Unknown Carrier';

      policyCheckSummaries.push({
        target_document_id: targetId,
        carrier_name: carrierName,
        document_type: policyCheckRow.target_document_type,
        results: JSON.parse(policyCheckRow.results) as CheckResultItem[],
        summary_counts: JSON.parse(policyCheckRow.summary_counts) as SummaryCounts,
      });
    }

    const provider = resolveProvider();
    const providerRequest = {
      case_name: reviewCase.case_name,
      client_name: reviewCase.client_name,
      comparison_result: comparisonResult,
      policy_check_summaries: policyCheckSummaries,
    };

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await provider.generate(providerRequest);
        const parsed = JSON.parse(response.raw_json);
        const validation = MemoContentSchema.safeParse(parsed);

        if (!validation.success) {
          if (attempts < maxAttempts) {
            logger.warn('Memo validation failed, retrying', {
              case_id: caseId,
              attempt: attempts,
              errors: validation.error.issues,
            });
            continue;
          }
          const errorMessage = `Validation failed: ${validation.error.issues.map((i) => i.message).join(', ')}`;
          const row = await memoRepository.create({
            case_id: caseId,
            status: 'failed',
            content: response.raw_json,
            error: errorMessage,
            model_provider: provider.name,
            model_name: response.model_name,
          });
          return toResponse(row);
        }

        const row = await memoRepository.create({
          case_id: caseId,
          status: 'completed',
          content: response.raw_json,
          model_provider: provider.name,
          model_name: response.model_name,
        });
        return toResponse(row);
      } catch (error) {
        if (error instanceof AppError) throw error;
        if (attempts >= maxAttempts) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown provider error';
          const row = await memoRepository.create({
            case_id: caseId,
            status: 'failed',
            content: '{}',
            error: errorMessage,
            model_provider: provider.name,
            model_name: 'unknown',
          });
          throw internalError('memo_generation_failed', errorMessage, {
            meta: { memo_id: row.id },
          });
        }
        logger.warn('Memo provider error, retrying', {
          case_id: caseId,
          attempt: attempts,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    throw internalError('memo_exhausted', 'Memo generation failed after all retry attempts');
  },

  async getLatestMemo(caseId: string): Promise<MemoResponse> {
    const reviewCase = await reviewCasesRepository.findById(caseId);
    if (!reviewCase) {
      throw notFound('case_not_found', `Case '${caseId}' not found`);
    }

    const row = await memoRepository.findLatestByCaseId(caseId);
    if (!row) {
      throw notFound('memo_not_found', 'No proposal memo found for this case');
    }
    return toResponse(row);
  },

  async getLatestMemoContent(caseId: string): Promise<MemoContent> {
    const reviewCase = await reviewCasesRepository.findById(caseId);
    if (!reviewCase) {
      throw notFound('case_not_found', `Case '${caseId}' not found`);
    }

    const row = await memoRepository.findLatestByCaseId(caseId);
    if (!row) {
      throw notFound('memo_not_found', 'No proposal memo found for this case');
    }

    if (row.status !== 'completed') {
      throw badRequest('memo_not_completed', 'Latest memo generation failed');
    }

    const content = parseContent(row.content);
    if (!content) {
      throw internalError('memo_parse_error', 'Failed to parse stored memo content');
    }
    return content;
  },
};

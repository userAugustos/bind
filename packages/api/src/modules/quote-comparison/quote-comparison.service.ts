import { badRequest, notFound } from '@core/errors';

import { analysisRepository } from '../analysis/analysis.repository';
import { CarrierQuoteResultSchema, CurrentPolicyResultSchema } from '../analysis/analysis.schemas';
import { documentsRepository } from '../documents/documents.repository';
import { policyCheckRepository } from '../policy-check/policy-check.repository';
import { reviewCasesRepository } from '../review-cases/review-cases.repository';
import { runComparison } from './quote-comparison.engine';
import { quoteComparisonRepository } from './quote-comparison.repository';
import type { CheckResultItem, SummaryCounts } from '../policy-check/policy-check.schemas';
import type { OptionInput } from './quote-comparison.engine';
import type { QuoteComparisonRow } from './quote-comparison.repository';
import type { QuoteComparisonResponse } from './quote-comparison.schemas';

const TARGET_DOCUMENT_TYPES = ['current_policy', 'carrier_quote'];

function rowToResponse(row: QuoteComparisonRow): QuoteComparisonResponse {
  return {
    id: row.id,
    case_id: row.case_id,
    requirements_document_id: row.requirements_document_id,
    target_document_ids: JSON.parse(row.target_document_ids) as string[],
    result: JSON.parse(row.result),
    created_at: row.created_at,
  };
}

export const quoteComparisonService = {
  async runQuoteComparison(
    caseId: string,
    requirementsDocumentId: string,
    targetDocumentIds: string[]
  ): Promise<QuoteComparisonResponse> {
    const reviewCase = await reviewCasesRepository.findById(caseId);
    if (!reviewCase) {
      throw notFound('case_not_found', `Case '${caseId}' not found`);
    }

    if (targetDocumentIds.length < 2) {
      throw badRequest(
        'insufficient_targets',
        'At least two target documents are required for comparison'
      );
    }

    const requirementsDoc = await documentsRepository.findById(requirementsDocumentId);
    if (!requirementsDoc || requirementsDoc.case_id !== caseId) {
      throw notFound(
        'document_not_found',
        `Requirements document '${requirementsDocumentId}' not found in case`
      );
    }
    if (requirementsDoc.document_type !== 'contract_requirements') {
      throw badRequest(
        'invalid_document_type',
        `Document '${requirementsDocumentId}' is not a contract_requirements document`
      );
    }

    const optionInputs: OptionInput[] = [];

    for (const targetId of targetDocumentIds) {
      const targetDoc = await documentsRepository.findById(targetId);
      if (!targetDoc || targetDoc.case_id !== caseId) {
        throw notFound('document_not_found', `Target document '${targetId}' not found in case`);
      }
      if (!TARGET_DOCUMENT_TYPES.includes(targetDoc.document_type)) {
        throw badRequest(
          'invalid_document_type',
          `Document '${targetId}' must be current_policy or carrier_quote`
        );
      }

      const targetAnalysis = await analysisRepository.findLatestByDocumentId(targetId);
      if (!targetAnalysis || targetAnalysis.status !== 'completed') {
        throw badRequest(
          'analysis_not_completed',
          `Analysis for document '${targetId}' is not completed`
        );
      }

      const targetSchema =
        targetDoc.document_type === 'current_policy'
          ? CurrentPolicyResultSchema
          : CarrierQuoteResultSchema;
      const analysis = targetSchema.parse(JSON.parse(targetAnalysis.result));

      const policyCheckRow = await policyCheckRepository.findLatestByCaseId(caseId, targetId);
      if (!policyCheckRow) {
        throw badRequest(
          'policy_check_not_found',
          `No policy check results found for document '${targetId}'. Run policy check first.`
        );
      }

      const policyCheckResults = JSON.parse(policyCheckRow.results) as CheckResultItem[];
      const policyCheckSummary = JSON.parse(policyCheckRow.summary_counts) as SummaryCounts;

      optionInputs.push({
        target_document_id: targetId,
        target_document_type: targetDoc.document_type as 'current_policy' | 'carrier_quote',
        analysis,
        policy_check_results: policyCheckResults,
        policy_check_summary: policyCheckSummary,
      });
    }

    const result = runComparison(optionInputs);

    const row = await quoteComparisonRepository.create({
      case_id: caseId,
      requirements_document_id: requirementsDocumentId,
      target_document_ids: JSON.stringify(targetDocumentIds),
      result: JSON.stringify(result),
    });

    return rowToResponse(row);
  },

  async getLatestResult(caseId: string): Promise<QuoteComparisonResponse> {
    const reviewCase = await reviewCasesRepository.findById(caseId);
    if (!reviewCase) {
      throw notFound('case_not_found', `Case '${caseId}' not found`);
    }

    const row = await quoteComparisonRepository.findLatestByCaseId(caseId);
    if (!row) {
      throw notFound('quote_comparison_not_found', 'No quote comparison results found');
    }

    return rowToResponse(row);
  },

  async getHistory(caseId: string): Promise<QuoteComparisonResponse[]> {
    const reviewCase = await reviewCasesRepository.findById(caseId);
    if (!reviewCase) {
      throw notFound('case_not_found', `Case '${caseId}' not found`);
    }

    const rows = await quoteComparisonRepository.findAllByCaseId(caseId);
    return rows.map(rowToResponse);
  },
};

import { badRequest, notFound } from '@core/errors';

import { analysisRepository } from '../analysis/analysis.repository';
import {
  CarrierQuoteResultSchema,
  ContractRequirementsResultSchema,
  CurrentPolicyResultSchema,
} from '../analysis/analysis.schemas';
import { documentsRepository } from '../documents/documents.repository';
import { reviewCasesRepository } from '../review-cases/review-cases.repository';
import { REQUIREMENT_CHECKS } from './checks';
import { policyCheckRepository } from './policy-check.repository';
import type { PolicyCheckRow } from './policy-check.repository';
import type { CheckResultItem, PolicyCheckResponse, SummaryCounts } from './policy-check.schemas';

const TARGET_DOCUMENT_TYPES = ['current_policy', 'carrier_quote'];

function computeSummaryCounts(results: CheckResultItem[]): SummaryCounts {
  const counts: SummaryCounts = { ok: 0, gap: 0, missing: 0, review: 0, not_applicable: 0 };
  for (const item of results) {
    counts[item.verdict]++;
  }
  return counts;
}

function rowToResponse(row: PolicyCheckRow): PolicyCheckResponse {
  return {
    id: row.id,
    case_id: row.case_id,
    requirements_document_id: row.requirements_document_id,
    target_document_id: row.target_document_id,
    target_document_type: row.target_document_type,
    results: JSON.parse(row.results) as CheckResultItem[],
    summary_counts: JSON.parse(row.summary_counts) as SummaryCounts,
    created_at: row.created_at,
  };
}

export const policyCheckService = {
  async runPolicyCheck(
    caseId: string,
    requirementsDocumentId: string,
    targetDocumentId: string
  ): Promise<PolicyCheckResponse> {
    const reviewCase = await reviewCasesRepository.findById(caseId);
    if (!reviewCase) {
      throw notFound('case_not_found', `Case '${caseId}' not found`);
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

    const targetDoc = await documentsRepository.findById(targetDocumentId);
    if (!targetDoc || targetDoc.case_id !== caseId) {
      throw notFound(
        'document_not_found',
        `Target document '${targetDocumentId}' not found in case`
      );
    }
    if (!TARGET_DOCUMENT_TYPES.includes(targetDoc.document_type)) {
      throw badRequest(
        'invalid_document_type',
        `Document '${targetDocumentId}' must be current_policy or carrier_quote`
      );
    }

    const requirementsAnalysis =
      await analysisRepository.findLatestByDocumentId(requirementsDocumentId);
    if (!requirementsAnalysis || requirementsAnalysis.status !== 'completed') {
      throw badRequest(
        'analysis_not_completed',
        `Analysis for requirements document '${requirementsDocumentId}' is not completed`
      );
    }

    const targetAnalysis = await analysisRepository.findLatestByDocumentId(targetDocumentId);
    if (!targetAnalysis || targetAnalysis.status !== 'completed') {
      throw badRequest(
        'analysis_not_completed',
        `Analysis for target document '${targetDocumentId}' is not completed`
      );
    }

    const requirementsParsed = ContractRequirementsResultSchema.parse(
      JSON.parse(requirementsAnalysis.result)
    );

    const targetSchema =
      targetDoc.document_type === 'current_policy'
        ? CurrentPolicyResultSchema
        : CarrierQuoteResultSchema;
    const targetParsed = targetSchema.parse(JSON.parse(targetAnalysis.result));

    const checkInput = {
      requirements: requirementsParsed,
      target: targetParsed,
      requirements_document_id: requirementsDocumentId,
      target_document_id: targetDocumentId,
    };

    const results = REQUIREMENT_CHECKS.map((check) => check(checkInput));
    const summaryCounts = computeSummaryCounts(results);

    const row = await policyCheckRepository.create({
      case_id: caseId,
      requirements_document_id: requirementsDocumentId,
      target_document_id: targetDocumentId,
      target_document_type: targetDoc.document_type,
      results: JSON.stringify(results),
      summary_counts: JSON.stringify(summaryCounts),
    });

    return rowToResponse(row);
  },

  async getLatestResult(caseId: string, targetDocumentId?: string): Promise<PolicyCheckResponse> {
    const reviewCase = await reviewCasesRepository.findById(caseId);
    if (!reviewCase) {
      throw notFound('case_not_found', `Case '${caseId}' not found`);
    }

    const row = await policyCheckRepository.findLatestByCaseId(caseId, targetDocumentId);
    if (!row) {
      throw notFound('policy_check_not_found', 'No policy check results found');
    }

    return rowToResponse(row);
  },

  async getHistory(caseId: string, targetDocumentId?: string): Promise<PolicyCheckResponse[]> {
    const reviewCase = await reviewCasesRepository.findById(caseId);
    if (!reviewCase) {
      throw notFound('case_not_found', `Case '${caseId}' not found`);
    }

    const rows = await policyCheckRepository.findAllByCaseId(caseId, targetDocumentId);
    return rows.map(rowToResponse);
  },
};

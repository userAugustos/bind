import type { CheckResultItem, SummaryCounts } from '../policy-check/policy-check.schemas';
import type { ComparisonResult } from '../quote-comparison/quote-comparison.schemas';

export interface PolicyCheckSummaryInput {
  target_document_id: string;
  carrier_name: string;
  document_type: string;
  results: CheckResultItem[];
  summary_counts: SummaryCounts;
}

export interface MemoProviderRequest {
  case_name: string;
  client_name: string;
  comparison_result: ComparisonResult;
  policy_check_summaries: PolicyCheckSummaryInput[];
}

export interface MemoProviderResponse {
  raw_json: string;
  model_name: string;
}

export interface MemoProvider {
  readonly name: string;
  generate(request: MemoProviderRequest): Promise<MemoProviderResponse>;
}

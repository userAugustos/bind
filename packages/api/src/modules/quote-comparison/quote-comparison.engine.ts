import type {
  CarrierQuoteResult,
  CoverageItem,
  CurrentPolicyResult,
} from '../analysis/analysis.schemas';
import type { CheckResultItem, SummaryCounts } from '../policy-check/policy-check.schemas';
import type {
  ComparisonResult,
  OptionSummary,
  RecommendationSignal,
} from './quote-comparison.schemas';

type TargetAnalysis = CurrentPolicyResult | CarrierQuoteResult;

export interface OptionInput {
  target_document_id: string;
  target_document_type: 'current_policy' | 'carrier_quote';
  analysis: TargetAnalysis;
  policy_check_results: CheckResultItem[];
  policy_check_summary: SummaryCounts;
}

function formatDeductibleSummary(coverages: CoverageItem[]): string {
  const parts: string[] = [];
  for (const c of coverages) {
    if (c.included && c.deductible !== null) {
      const shortName = c.coverage_type
        .replace('Commercial General Liability', 'CGL')
        .replace('Commercial Auto', 'Auto')
        .replace('Cyber Liability', 'Cyber');
      parts.push(`${shortName}: $${c.deductible.toLocaleString('en-US')}`);
    }
  }
  return parts.length > 0 ? parts.join(', ') : 'None specified';
}

function buildOptionName(analysis: TargetAnalysis): string {
  if (analysis.document_type === 'current_policy') {
    return `Current Policy (${analysis.carrier_name})`;
  }
  return `${analysis.carrier_name} Quote`;
}

function deriveStrengths(results: CheckResultItem[]): string[] {
  return results.filter((r) => r.verdict === 'ok').map((r) => r.check_name);
}

function deriveRisks(results: CheckResultItem[]): string[] {
  return results.filter((r) => r.verdict === 'gap').map((r) => r.message);
}

function deriveMissingRequirements(results: CheckResultItem[]): string[] {
  return results.filter((r) => r.verdict === 'missing').map((r) => r.message);
}

function deriveReviewItems(results: CheckResultItem[]): string[] {
  return results.filter((r) => r.verdict === 'review').map((r) => r.message);
}

export function buildOptionSummary(input: OptionInput): OptionSummary {
  const { analysis, policy_check_results, policy_check_summary } = input;

  const premium = analysis.document_type === 'carrier_quote' ? analysis.premium : null;
  const meetsCore = policy_check_summary.gap === 0 && policy_check_summary.missing === 0;

  return {
    target_document_id: input.target_document_id,
    option_name: buildOptionName(analysis),
    carrier_name: analysis.carrier_name,
    premium,
    deductible_summary: formatDeductibleSummary(analysis.coverages),
    meets_core_requirements: meetsCore,
    policy_check_summary,
    strengths: deriveStrengths(policy_check_results),
    risks: deriveRisks(policy_check_results),
    missing_requirements: deriveMissingRequirements(policy_check_results),
    review_items: deriveReviewItems(policy_check_results),
  };
}

export function computeRecommendation(options: OptionSummary[]): RecommendationSignal {
  if (options.length === 0) {
    return {
      recommended_document_id: null,
      reason: 'no_clear_recommendation',
      explanation: 'No options provided for comparison.',
    };
  }

  const qualifying = options.filter((o) => o.meets_core_requirements);

  if (qualifying.length === 1) {
    return {
      recommended_document_id: qualifying[0]!.target_document_id,
      reason: 'meets_all_requirements_only_option',
      explanation: `${qualifying[0]!.option_name} is the only option that meets all core requirements.`,
    };
  }

  if (qualifying.length > 1) {
    const withPremium = qualifying.filter((o) => o.premium !== null);
    if (withPremium.length > 0) {
      const sorted = [...withPremium].sort((a, b) => a.premium! - b.premium!);
      const best = sorted[0]!;
      return {
        recommended_document_id: best.target_document_id,
        reason: 'meets_all_requirements_lowest_cost',
        explanation: `${best.option_name} meets all core requirements at the lowest premium ($${best.premium!.toLocaleString('en-US')}).`,
      };
    }
    const best = qualifying[0]!;
    return {
      recommended_document_id: best.target_document_id,
      reason: 'meets_all_requirements_lowest_cost',
      explanation: `${best.option_name} meets all core requirements. No premium data available for cost comparison.`,
    };
  }

  const scored = options
    .map((o) => ({
      option: o,
      gaps: o.policy_check_summary.gap + o.policy_check_summary.missing,
      reviews: o.policy_check_summary.review,
    }))
    .sort((a, b) => a.gaps - b.gaps || a.reviews - b.reviews);

  const best = scored[0]!.option;
  return {
    recommended_document_id: best.target_document_id,
    reason: 'fewest_material_gaps',
    explanation: `${best.option_name} has the fewest coverage gaps among available options.`,
  };
}

export function runComparison(inputs: OptionInput[]): ComparisonResult {
  const options = inputs.map(buildOptionSummary);
  const recommendation = computeRecommendation(options);
  return { options, recommendation };
}

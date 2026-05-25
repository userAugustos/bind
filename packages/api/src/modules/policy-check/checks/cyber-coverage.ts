import type { CheckResultItem } from '../policy-check.schemas';
import type { CheckInput } from './index';

export function checkCyberCoverage(input: CheckInput): CheckResultItem {
  const { requirements, target, requirements_document_id, target_document_id } = input;

  const required = requirements.required_coverages.find((c) =>
    c.coverage_type.toLowerCase().includes('cyber')
  );

  if (!required) {
    return {
      check_id: 'cyber_coverage',
      check_name: 'Cyber Liability Coverage',
      verdict: 'not_applicable',
      severity: 'informational',
      message: 'No cyber liability requirement found in contract',
      evidence: {
        requirement_source: 'No cyber liability requirement specified',
        found_value: null,
        document_id: requirements_document_id,
        page_numbers: [],
      },
    };
  }

  const found = target.coverages.find((c) => c.coverage_type.toLowerCase().includes('cyber'));

  if (!found || !found.included) {
    return {
      check_id: 'cyber_coverage',
      check_name: 'Cyber Liability Coverage',
      verdict: 'missing',
      severity: 'blocking',
      message: 'Cyber liability coverage not found in target document',
      evidence: {
        requirement_source: `Cyber required: $${required.limit_amount ?? 0}`,
        found_value: null,
        document_id: target_document_id,
        page_numbers: [],
      },
    };
  }

  const requiredAmount = required.limit_amount ?? 0;
  const foundAmount = found.limit_amount ?? 0;

  if (foundAmount < requiredAmount) {
    return {
      check_id: 'cyber_coverage',
      check_name: 'Cyber Liability Coverage',
      verdict: 'gap',
      severity: 'material',
      message: `Cyber limit $${foundAmount} is below required $${requiredAmount}`,
      evidence: {
        requirement_source: `Cyber required: $${requiredAmount}`,
        found_value: `Cyber provided: $${foundAmount}`,
        document_id: target_document_id,
        page_numbers: [],
      },
    };
  }

  return {
    check_id: 'cyber_coverage',
    check_name: 'Cyber Liability Coverage',
    verdict: 'ok',
    severity: 'informational',
    message: `Cyber limit $${foundAmount} meets or exceeds required $${requiredAmount}`,
    evidence: {
      requirement_source: `Cyber required: $${requiredAmount}`,
      found_value: `Cyber provided: $${foundAmount}`,
      document_id: target_document_id,
      page_numbers: [],
    },
  };
}

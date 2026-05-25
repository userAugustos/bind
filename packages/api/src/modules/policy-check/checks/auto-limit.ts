import type { CheckResultItem } from '../policy-check.schemas';
import type { CheckInput } from './index';

export function checkAutoLimit(input: CheckInput): CheckResultItem {
  const { requirements, target, requirements_document_id, target_document_id } = input;

  const required = requirements.required_coverages.find((c) =>
    c.coverage_type.toLowerCase().includes('auto')
  );

  if (!required) {
    return {
      check_id: 'auto_limit',
      check_name: 'Commercial Auto Liability Limit',
      verdict: 'not_applicable',
      severity: 'informational',
      message: 'No auto liability requirement found in contract',
      evidence: {
        requirement_source: 'No auto liability requirement specified',
        found_value: null,
        document_id: requirements_document_id,
        page_numbers: [],
      },
    };
  }

  const found = target.coverages.find((c) => c.coverage_type.toLowerCase().includes('auto'));

  if (!found || !found.included) {
    return {
      check_id: 'auto_limit',
      check_name: 'Commercial Auto Liability Limit',
      verdict: 'missing',
      severity: 'blocking',
      message: 'Auto liability coverage not found in target document',
      evidence: {
        requirement_source: `Auto required: $${required.limit_amount ?? 0}`,
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
      check_id: 'auto_limit',
      check_name: 'Commercial Auto Liability Limit',
      verdict: 'gap',
      severity: 'blocking',
      message: `Auto limit $${foundAmount} is below required $${requiredAmount}`,
      evidence: {
        requirement_source: `Auto required: $${requiredAmount}`,
        found_value: `Auto provided: $${foundAmount}`,
        document_id: target_document_id,
        page_numbers: [],
      },
    };
  }

  return {
    check_id: 'auto_limit',
    check_name: 'Commercial Auto Liability Limit',
    verdict: 'ok',
    severity: 'informational',
    message: `Auto limit $${foundAmount} meets or exceeds required $${requiredAmount}`,
    evidence: {
      requirement_source: `Auto required: $${requiredAmount}`,
      found_value: `Auto provided: $${foundAmount}`,
      document_id: target_document_id,
      page_numbers: [],
    },
  };
}

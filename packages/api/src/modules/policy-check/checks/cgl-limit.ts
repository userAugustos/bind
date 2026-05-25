import type { CheckResultItem } from '../policy-check.schemas';
import type { CheckInput } from './index';

export function checkCglLimit(input: CheckInput): CheckResultItem {
  const { requirements, target, requirements_document_id, target_document_id } = input;

  const required = requirements.required_coverages.find((c) =>
    c.coverage_type.toLowerCase().includes('general liability')
  );

  if (!required) {
    return {
      check_id: 'cgl_limit',
      check_name: 'Commercial General Liability Limit',
      verdict: 'not_applicable',
      severity: 'informational',
      message: 'No CGL requirement found in contract',
      evidence: {
        requirement_source: 'No CGL requirement specified',
        found_value: null,
        document_id: requirements_document_id,
        page_numbers: [],
      },
    };
  }

  const found = target.coverages.find((c) =>
    c.coverage_type.toLowerCase().includes('general liability')
  );

  if (!found || !found.included) {
    return {
      check_id: 'cgl_limit',
      check_name: 'Commercial General Liability Limit',
      verdict: 'missing',
      severity: 'blocking',
      message: 'CGL coverage not found in target document',
      evidence: {
        requirement_source: `CGL required: $${required.limit_amount ?? 0}`,
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
      check_id: 'cgl_limit',
      check_name: 'Commercial General Liability Limit',
      verdict: 'gap',
      severity: 'blocking',
      message: `CGL limit $${foundAmount} is below required $${requiredAmount}`,
      evidence: {
        requirement_source: `CGL required: $${requiredAmount}`,
        found_value: `CGL provided: $${foundAmount}`,
        document_id: target_document_id,
        page_numbers: [],
      },
    };
  }

  return {
    check_id: 'cgl_limit',
    check_name: 'Commercial General Liability Limit',
    verdict: 'ok',
    severity: 'informational',
    message: `CGL limit $${foundAmount} meets or exceeds required $${requiredAmount}`,
    evidence: {
      requirement_source: `CGL required: $${requiredAmount}`,
      found_value: `CGL provided: $${foundAmount}`,
      document_id: target_document_id,
      page_numbers: [],
    },
  };
}

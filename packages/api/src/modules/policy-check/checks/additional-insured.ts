import type { CheckResultItem } from '../policy-check.schemas';
import type { CheckInput } from './index';

export function checkAdditionalInsured(input: CheckInput): CheckResultItem {
  const { requirements, target, requirements_document_id, target_document_id } = input;

  const required = requirements.required_endorsements.find((e) =>
    e.endorsement_type.toLowerCase().includes('additional insured')
  );

  if (!required) {
    return {
      check_id: 'additional_insured',
      check_name: 'Additional Insured Endorsement',
      verdict: 'not_applicable',
      severity: 'informational',
      message: 'No additional insured requirement found in contract',
      evidence: {
        requirement_source: 'No additional insured requirement specified',
        found_value: null,
        document_id: requirements_document_id,
        page_numbers: [],
      },
    };
  }

  const found = target.endorsements.find((e) =>
    e.endorsement_type.toLowerCase().includes('additional insured')
  );

  if (!found || !found.included) {
    return {
      check_id: 'additional_insured',
      check_name: 'Additional Insured Endorsement',
      verdict: 'missing',
      severity: 'blocking',
      message: 'Additional insured endorsement not found in target document',
      evidence: {
        requirement_source: `Required: ${required.endorsement_type}`,
        found_value: null,
        document_id: target_document_id,
        page_numbers: [],
      },
    };
  }

  return {
    check_id: 'additional_insured',
    check_name: 'Additional Insured Endorsement',
    verdict: 'ok',
    severity: 'informational',
    message: 'Additional insured endorsement is present',
    evidence: {
      requirement_source: `Required: ${required.endorsement_type}`,
      found_value: `Found: ${found.endorsement_type}`,
      document_id: target_document_id,
      page_numbers: [],
    },
  };
}

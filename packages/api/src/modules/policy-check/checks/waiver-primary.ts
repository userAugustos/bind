import type { CheckResultItem } from '../policy-check.schemas';
import type { CheckInput } from './index';

const WAIVER_PRIMARY_KEYWORDS = ['waiver', 'primary', 'non-contributory'];

export function checkWaiverPrimary(input: CheckInput): CheckResultItem {
  const { requirements, target, requirements_document_id, target_document_id } = input;

  const requiredEndorsements = requirements.required_endorsements.filter((e) => {
    const lower = e.endorsement_type.toLowerCase();
    return WAIVER_PRIMARY_KEYWORDS.some((kw) => lower.includes(kw));
  });

  if (requiredEndorsements.length === 0) {
    return {
      check_id: 'waiver_primary',
      check_name: 'Waiver of Subrogation / Primary & Non-Contributory',
      verdict: 'not_applicable',
      severity: 'informational',
      message: 'No waiver/primary/non-contributory requirement found in contract',
      evidence: {
        requirement_source: 'No waiver/primary requirement specified',
        found_value: null,
        document_id: requirements_document_id,
        page_numbers: [],
      },
    };
  }

  const matched: string[] = [];
  const unmatched: string[] = [];

  for (const req of requiredEndorsements) {
    const reqLower = req.endorsement_type.toLowerCase();
    const found = target.endorsements.find((e) => {
      const targetLower = e.endorsement_type.toLowerCase();
      return (
        e.included &&
        WAIVER_PRIMARY_KEYWORDS.some((kw) => reqLower.includes(kw) && targetLower.includes(kw))
      );
    });
    if (found) {
      matched.push(req.endorsement_type);
    } else {
      unmatched.push(req.endorsement_type);
    }
  }

  if (unmatched.length === 0) {
    return {
      check_id: 'waiver_primary',
      check_name: 'Waiver of Subrogation / Primary & Non-Contributory',
      verdict: 'ok',
      severity: 'informational',
      message: 'All waiver/primary/non-contributory endorsements are present',
      evidence: {
        requirement_source: `Required: ${requiredEndorsements.map((e) => e.endorsement_type).join(', ')}`,
        found_value: `Found: ${matched.join(', ')}`,
        document_id: target_document_id,
        page_numbers: [],
      },
    };
  }

  if (matched.length === 0) {
    return {
      check_id: 'waiver_primary',
      check_name: 'Waiver of Subrogation / Primary & Non-Contributory',
      verdict: 'missing',
      severity: 'blocking',
      message: `None of the required waiver/primary endorsements found: ${unmatched.join(', ')}`,
      evidence: {
        requirement_source: `Required: ${requiredEndorsements.map((e) => e.endorsement_type).join(', ')}`,
        found_value: null,
        document_id: target_document_id,
        page_numbers: [],
      },
    };
  }

  return {
    check_id: 'waiver_primary',
    check_name: 'Waiver of Subrogation / Primary & Non-Contributory',
    verdict: 'gap',
    severity: 'material',
    message: `Some waiver/primary endorsements missing: ${unmatched.join(', ')}`,
    evidence: {
      requirement_source: `Required: ${requiredEndorsements.map((e) => e.endorsement_type).join(', ')}`,
      found_value: `Found: ${matched.join(', ')}; Missing: ${unmatched.join(', ')}`,
      document_id: target_document_id,
      page_numbers: [],
    },
  };
}

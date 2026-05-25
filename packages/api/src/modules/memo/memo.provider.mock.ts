import type { MemoProvider, MemoProviderRequest, MemoProviderResponse } from './memo.provider';
import type { MemoContent } from './memo.schemas';

const MOCK_MEMO: MemoContent = {
  executive_summary:
    'This memo presents a comprehensive review of insurance coverage options for the Northstar Logistics contract. Our analysis evaluated the current policy (Carrier A) against a new quote from Carrier B, assessing each against the contractual requirements specified by Northstar Logistics. Carrier B emerges as the clear recommendation, providing full compliance with all contract requirements at a competitive premium of $45,800.',
  coverage_gaps:
    'The current policy with Carrier A presents several critical gaps relative to Northstar Logistics requirements. Commercial General Liability is capped at $1,000,000 per occurrence against a required $2,000,000 limit — a blocking shortfall. Commercial Auto is similarly deficient at $500,000 combined single limit versus the required $1,000,000. Most critically, no Cyber Liability coverage exists, despite a $5,000,000 aggregate requirement. Additionally, Carrier A lacks a Waiver of Subrogation endorsement required by the contract. Carrier B fully addresses all of these gaps with limits meeting or exceeding every requirement.',
  quote_comparison:
    'Carrier B provides a comprehensive package at $45,800 annual premium. All five policy checks pass: CGL at $2,000,000 per occurrence, Commercial Auto at $1,000,000 CSL, and Cyber Liability at $5,000,000 aggregate. All required endorsements — Additional Insured, Waiver of Subrogation, and Primary/Non-Contributory — are included. The current Carrier A policy, while presumably lower in premium, fails on CGL limits, Auto limits, Cyber coverage entirely, and Waiver of Subrogation — four of five checks.',
  recommendation:
    'We recommend binding coverage with Carrier B. It is the only option that meets all contractual requirements imposed by Northstar Logistics. The $45,800 premium reflects the broader scope of coverage, including Cyber Liability at $5,000,000 which is entirely absent from the current policy. Continuing with Carrier A would leave the client non-compliant with the Northstar contract and exposed to uninsured cyber risk.',
  next_steps: [
    'Bind Carrier B policy at the quoted $45,800 annual premium',
    'Request certificates of insurance listing Northstar Logistics as certificate holder and additional insured',
    'Obtain copies of Waiver of Subrogation and Primary/Non-Contributory endorsements for Northstar',
    'Negotiate the $10,000 Cyber Liability deductible down if possible — consider requesting a $5,000 option',
    'Set a 60-day calendar reminder to review coverage adequacy before the next Northstar contract renewal',
  ],
};

export class MockMemoProvider implements MemoProvider {
  readonly name = 'mock';

  async generate(_request: MemoProviderRequest): Promise<MemoProviderResponse> {
    return {
      raw_json: JSON.stringify(MOCK_MEMO),
      model_name: 'mock-v1',
    };
  }
}

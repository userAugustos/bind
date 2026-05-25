import type {
  AnalysisProvider,
  AnalysisProviderRequest,
  AnalysisProviderResponse,
} from './analysis.provider';
import type {
  CarrierQuoteResult,
  ContractRequirementsResult,
  CurrentPolicyResult,
  LossHistoryResult,
  OtherDocumentResult,
} from './analysis.schemas';

const MOCK_CONTRACT_REQUIREMENTS: ContractRequirementsResult = {
  document_type: 'contract_requirements',
  summary:
    'Northstar Logistics requires comprehensive coverage including CGL, Auto, and Cyber liability with specific endorsements.',
  required_coverages: [
    {
      coverage_type: 'Commercial General Liability',
      limit_amount: 2_000_000,
      limit_basis: 'per occurrence',
      deductible: null,
      included: true,
    },
    {
      coverage_type: 'Commercial Auto',
      limit_amount: 1_000_000,
      limit_basis: 'combined single limit',
      deductible: null,
      included: true,
    },
    {
      coverage_type: 'Cyber Liability',
      limit_amount: 5_000_000,
      limit_basis: 'aggregate',
      deductible: null,
      included: true,
    },
  ],
  required_endorsements: [
    {
      endorsement_type: 'Additional Insured',
      description: 'Northstar Logistics named as additional insured on CGL and Auto policies',
      included: true,
    },
    {
      endorsement_type: 'Waiver of Subrogation',
      description: 'Waiver of subrogation in favor of Northstar Logistics',
      included: true,
    },
    {
      endorsement_type: 'Primary/Non-Contributory',
      description:
        'Coverage is primary and non-contributory to any insurance maintained by Northstar',
      included: true,
    },
  ],
  required_certificates: [
    'Certificate of Insurance listing Northstar Logistics as certificate holder',
    'Additional Insured endorsement copy',
    'Waiver of Subrogation endorsement copy',
  ],
  evidence: [
    { page_number: 1, evidence_summary: 'Coverage requirements table on page 1', confidence: 0.95 },
    {
      page_number: 3,
      evidence_summary: 'Endorsement requirements in Section 4.2',
      confidence: 0.92,
    },
    {
      page_number: 5,
      evidence_summary: 'Certificate requirements in Appendix A',
      confidence: 0.88,
    },
  ],
};

const MOCK_CURRENT_POLICY: CurrentPolicyResult = {
  document_type: 'current_policy',
  summary:
    'Current policy provides CGL at $1M and Auto at $500K. No Cyber coverage. Missing AI-related endorsements.',
  carrier_name: 'Carrier A',
  coverages: [
    {
      coverage_type: 'Commercial General Liability',
      limit_amount: 1_000_000,
      limit_basis: 'per occurrence',
      deductible: 5000,
      included: true,
    },
    {
      coverage_type: 'Commercial Auto',
      limit_amount: 500_000,
      limit_basis: 'combined single limit',
      deductible: 2500,
      included: true,
    },
    {
      coverage_type: 'Cyber Liability',
      limit_amount: null,
      limit_basis: null,
      deductible: null,
      included: false,
    },
  ],
  endorsements: [
    {
      endorsement_type: 'Additional Insured',
      description: 'Blanket additional insured endorsement',
      included: true,
    },
    {
      endorsement_type: 'AI Technology Endorsement',
      description: 'Coverage for AI-related professional services',
      included: false,
    },
  ],
  exclusions: [
    'Cyber and technology errors and omissions',
    'Autonomous vehicle operations',
    'AI-generated content liability',
  ],
  evidence: [
    {
      page_number: 1,
      evidence_summary: 'Declarations page with coverage limits',
      confidence: 0.97,
    },
    { page_number: 4, evidence_summary: 'Endorsement schedule', confidence: 0.93 },
    { page_number: 8, evidence_summary: 'Exclusions section', confidence: 0.91 },
  ],
};

const MOCK_CARRIER_QUOTE: CarrierQuoteResult = {
  document_type: 'carrier_quote',
  summary:
    'Carrier B quote at $45,800 premium meets all contract requirements including Cyber at $5M.',
  carrier_name: 'Carrier B',
  premium: 45_800,
  coverages: [
    {
      coverage_type: 'Commercial General Liability',
      limit_amount: 2_000_000,
      limit_basis: 'per occurrence',
      deductible: 5000,
      included: true,
    },
    {
      coverage_type: 'Commercial Auto',
      limit_amount: 1_000_000,
      limit_basis: 'combined single limit',
      deductible: 2500,
      included: true,
    },
    {
      coverage_type: 'Cyber Liability',
      limit_amount: 5_000_000,
      limit_basis: 'aggregate',
      deductible: 10_000,
      included: true,
    },
  ],
  endorsements: [
    {
      endorsement_type: 'Additional Insured',
      description: 'Northstar Logistics named as additional insured',
      included: true,
    },
    {
      endorsement_type: 'Waiver of Subrogation',
      description: 'Waiver of subrogation in favor of Northstar Logistics',
      included: true,
    },
    {
      endorsement_type: 'Primary/Non-Contributory',
      description: 'Primary and non-contributory coverage',
      included: true,
    },
  ],
  exclusions: ['War and terrorism', 'Nuclear hazard'],
  conditions: [
    'Premium subject to audit adjustment',
    'Minimum earned premium of 25%',
    'Quote valid for 30 days',
  ],
  evidence: [
    { page_number: 1, evidence_summary: 'Quote summary with premium', confidence: 0.96 },
    { page_number: 2, evidence_summary: 'Coverage details and limits', confidence: 0.94 },
    { page_number: 5, evidence_summary: 'Endorsement inclusions', confidence: 0.9 },
  ],
};

const MOCK_LOSS_HISTORY: LossHistoryResult = {
  document_type: 'loss_history',
  summary: '3 claims totaling $87,500 over the past 5 years with no concerning patterns.',
  claim_count: 3,
  total_claim_amount: 87_500,
  notable_patterns: [
    'All claims are below $50K individual',
    'No recurring claim types',
    'Most recent claim was 18 months ago',
  ],
  evidence: [
    { page_number: 1, evidence_summary: 'Loss run summary table', confidence: 0.98 },
    { page_number: 2, evidence_summary: 'Individual claim details', confidence: 0.94 },
  ],
};

const MOCK_OTHER: OtherDocumentResult = {
  document_type: 'other',
  inferred_type: 'supplemental_documentation',
  summary: 'Supplemental documentation providing additional context for the insurance review.',
  key_findings: [
    'Document contains operational context relevant to risk assessment',
    'No specific coverage requirements identified',
    'May inform underwriting considerations',
  ],
  evidence: [
    { page_number: 1, evidence_summary: 'Document overview and purpose', confidence: 0.85 },
  ],
};

const MOCK_RESULTS: Record<string, unknown> = {
  contract_requirements: MOCK_CONTRACT_REQUIREMENTS,
  current_policy: MOCK_CURRENT_POLICY,
  carrier_quote: MOCK_CARRIER_QUOTE,
  loss_history: MOCK_LOSS_HISTORY,
  other: MOCK_OTHER,
};

export class MockAnalysisProvider implements AnalysisProvider {
  readonly name = 'mock';

  async analyze(request: AnalysisProviderRequest): Promise<AnalysisProviderResponse> {
    const result = MOCK_RESULTS[request.document_type] ?? MOCK_OTHER;
    return {
      raw_json: JSON.stringify(result),
      model_name: 'mock-v1',
    };
  }
}

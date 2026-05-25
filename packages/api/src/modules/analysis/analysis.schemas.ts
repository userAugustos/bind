import { z } from 'zod';

export const SCHEMA_VERSION = '1.0.0';

export const EvidenceItemSchema = z.object({
  page_number: z.number().int().positive(),
  evidence_summary: z.string(),
  confidence: z.number().min(0).max(1),
});

export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const CoverageItemSchema = z.object({
  coverage_type: z.string(),
  limit_amount: z.number().nullable(),
  limit_basis: z.string().nullable(),
  deductible: z.number().nullable(),
  included: z.boolean(),
});

export type CoverageItem = z.infer<typeof CoverageItemSchema>;

export const EndorsementItemSchema = z.object({
  endorsement_type: z.string(),
  description: z.string(),
  included: z.boolean(),
});

export type EndorsementItem = z.infer<typeof EndorsementItemSchema>;

export const ContractRequirementsResultSchema = z.object({
  document_type: z.literal('contract_requirements'),
  summary: z.string(),
  required_coverages: z.array(CoverageItemSchema),
  required_endorsements: z.array(EndorsementItemSchema),
  required_certificates: z.array(z.string()),
  evidence: z.array(EvidenceItemSchema),
});

export type ContractRequirementsResult = z.infer<typeof ContractRequirementsResultSchema>;

export const CurrentPolicyResultSchema = z.object({
  document_type: z.literal('current_policy'),
  summary: z.string(),
  carrier_name: z.string(),
  coverages: z.array(CoverageItemSchema),
  endorsements: z.array(EndorsementItemSchema),
  exclusions: z.array(z.string()),
  evidence: z.array(EvidenceItemSchema),
});

export type CurrentPolicyResult = z.infer<typeof CurrentPolicyResultSchema>;

export const CarrierQuoteResultSchema = z.object({
  document_type: z.literal('carrier_quote'),
  summary: z.string(),
  carrier_name: z.string(),
  premium: z.number().nullable(),
  coverages: z.array(CoverageItemSchema),
  endorsements: z.array(EndorsementItemSchema),
  exclusions: z.array(z.string()),
  conditions: z.array(z.string()),
  evidence: z.array(EvidenceItemSchema),
});

export type CarrierQuoteResult = z.infer<typeof CarrierQuoteResultSchema>;

export const LossHistoryResultSchema = z.object({
  document_type: z.literal('loss_history'),
  summary: z.string(),
  claim_count: z.number().int().nonnegative(),
  total_claim_amount: z.number().nonnegative().nullable(),
  notable_patterns: z.array(z.string()),
  evidence: z.array(EvidenceItemSchema),
});

export type LossHistoryResult = z.infer<typeof LossHistoryResultSchema>;

export const OtherDocumentResultSchema = z.object({
  document_type: z.literal('other'),
  inferred_type: z.string(),
  summary: z.string(),
  key_findings: z.array(z.string()),
  evidence: z.array(EvidenceItemSchema),
});

export type OtherDocumentResult = z.infer<typeof OtherDocumentResultSchema>;

export const AnalysisResultSchema = z.discriminatedUnion('document_type', [
  ContractRequirementsResultSchema,
  CurrentPolicyResultSchema,
  CarrierQuoteResultSchema,
  LossHistoryResultSchema,
  OtherDocumentResultSchema,
]);

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

export const SCHEMA_BY_DOCUMENT_TYPE: Record<string, z.ZodType> = {
  contract_requirements: ContractRequirementsResultSchema,
  current_policy: CurrentPolicyResultSchema,
  carrier_quote: CarrierQuoteResultSchema,
  loss_history: LossHistoryResultSchema,
  other: OtherDocumentResultSchema,
};

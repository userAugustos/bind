import { checkAdditionalInsured } from './additional-insured';
import { checkAutoLimit } from './auto-limit';
import { checkCglLimit } from './cgl-limit';
import { checkCyberCoverage } from './cyber-coverage';
import { checkWaiverPrimary } from './waiver-primary';
import type {
  CarrierQuoteResult,
  ContractRequirementsResult,
  CurrentPolicyResult,
} from '../../analysis/analysis.schemas';
import type { CheckResultItem } from '../policy-check.schemas';

export type TargetAnalysis = CurrentPolicyResult | CarrierQuoteResult;

export interface CheckInput {
  requirements: ContractRequirementsResult;
  target: TargetAnalysis;
  requirements_document_id: string;
  target_document_id: string;
}

export type RequirementCheck = (input: CheckInput) => CheckResultItem;

export const REQUIREMENT_CHECKS: RequirementCheck[] = [
  checkCglLimit,
  checkAutoLimit,
  checkCyberCoverage,
  checkAdditionalInsured,
  checkWaiverPrimary,
];

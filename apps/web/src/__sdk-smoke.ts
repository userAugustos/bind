import { edenTreaty } from '@elysiajs/eden';

import type { AnalysisResponse, AnalysisResult, EvidenceItem } from '@bind/api/analysis';
import type { BindApi } from '@bind/api/client';
import type { AnalysisStatus, DocumentResponseType, DocumentType } from '@bind/api/documents';
import type { CheckResultItem, PolicyCheckResponse, SummaryCounts } from '@bind/api/policy-check';
import type { CaseEvent, CaseResponseType, CaseStatus } from '@bind/api/review-cases';

const _client = edenTreaty<BindApi>('http://localhost:3000');

export type _HealthzReturn = Awaited<ReturnType<typeof _client.healthz.get>>;
export type { CaseResponseType, CaseStatus, CaseEvent };
export type { DocumentResponseType, DocumentType, AnalysisStatus };
export type { AnalysisResponse, AnalysisResult, EvidenceItem };
export type { PolicyCheckResponse, CheckResultItem, SummaryCounts };

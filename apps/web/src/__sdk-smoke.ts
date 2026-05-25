import { edenTreaty } from '@elysiajs/eden';

import type { BindApi } from '@bind/api/client';
import type { AnalysisStatus, DocumentResponseType, DocumentType } from '@bind/api/documents';
import type { CaseEvent, CaseResponseType, CaseStatus } from '@bind/api/review-cases';

const _client = edenTreaty<BindApi>('http://localhost:3000');

export type _HealthzReturn = Awaited<ReturnType<typeof _client.healthz.get>>;
export type { CaseResponseType, CaseStatus, CaseEvent };
export type { DocumentResponseType, DocumentType, AnalysisStatus };

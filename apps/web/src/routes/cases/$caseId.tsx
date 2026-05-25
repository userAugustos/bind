import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';

import type { AnalysisResponse } from '@bind/api/analysis';
import type { DocumentResponseType, DocumentType } from '@bind/api/documents';
import type { MemoResponse } from '@bind/api/memo';
import type { CheckResultItem, CheckVerdict, PolicyCheckResponse } from '@bind/api/policy-check';
import type { OptionSummary, QuoteComparisonResponse } from '@bind/api/quote-comparison';
import type { CaseEvent, CaseResponseType } from '@bind/api/review-cases';

import { Badge } from '@repo/ui/shadcn/badge';
import { Button } from '@repo/ui/shadcn/button';
import { apiCall, bindApi } from '@/api';

export const Route = createFileRoute('/cases/$caseId')({ component: CaseDetail });

const DOCUMENT_TYPES: DocumentType[] = [
  'contract_requirements',
  'current_policy',
  'carrier_quote',
  'loss_history',
  'other',
];

function CaseDetail() {
  const { caseId } = Route.useParams();
  const queryClient = useQueryClient();

  const [showDocForm, setShowDocForm] = useState(false);
  const [fileName, setFileName] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('other');
  const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null);

  const [policyCheckReqDocId, setPolicyCheckReqDocId] = useState('');
  const [policyCheckTargetDocId, setPolicyCheckTargetDocId] = useState('');

  const caseQuery = useQuery({
    queryKey: ['cases', caseId],
    queryFn: () => apiCall<CaseResponseType>(() => bindApi.cases({ case_id: caseId }).get()),
  });

  const documentsQuery = useQuery({
    queryKey: ['cases', caseId, 'documents'],
    queryFn: () =>
      apiCall<DocumentResponseType[]>(() => bindApi.cases({ case_id: caseId }).documents.get()),
  });

  const analysisQuery = useQuery({
    queryKey: ['cases', caseId, 'documents', expandedAnalysisId, 'analysis'],
    queryFn: () =>
      apiCall<AnalysisResponse>(() =>
        bindApi
          .cases({ case_id: caseId })
          .documents({ document_id: expandedAnalysisId! })
          .analysis.get()
      ),
    enabled: !!expandedAnalysisId,
  });

  const policyCheckQuery = useQuery({
    queryKey: ['cases', caseId, 'policy-check'],
    queryFn: () =>
      apiCall<PolicyCheckResponse>(() => bindApi.cases({ case_id: caseId })['policy-check'].get()),
    enabled: false,
  });

  const memoQuery = useQuery({
    queryKey: ['cases', caseId, 'memo'],
    queryFn: () => apiCall<MemoResponse>(() => bindApi.cases({ case_id: caseId }).memo.get()),
    enabled: false,
  });

  const transitionMutation = useMutation({
    mutationFn: (event: CaseEvent) =>
      apiCall<CaseResponseType>(() =>
        bindApi.cases({ case_id: caseId }).transition.post({ event })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cases', caseId] });
    },
  });

  const addDocumentMutation = useMutation({
    mutationFn: (data: { file_name: string; mime_type: string; document_type: DocumentType }) =>
      apiCall<DocumentResponseType>(() => bindApi.cases({ case_id: caseId }).documents.post(data)),
    onSuccess: async () => {
      setFileName('');
      setDocumentType('other');
      setShowDocForm(false);
      await queryClient.invalidateQueries({ queryKey: ['cases', caseId, 'documents'] });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (documentId: string) =>
      apiCall<void>(() =>
        bindApi.cases({ case_id: caseId }).documents({ document_id: documentId }).delete()
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cases', caseId, 'documents'] });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: (documentId: string) =>
      apiCall<AnalysisResponse>(() =>
        bindApi.cases({ case_id: caseId }).documents({ document_id: documentId }).analyze.post({})
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cases', caseId, 'documents'] });
    },
  });

  const policyCheckMutation = useMutation({
    mutationFn: (data: { requirements_document_id: string; target_document_id: string }) =>
      apiCall<PolicyCheckResponse>(() =>
        bindApi.cases({ case_id: caseId })['policy-check'].post(data)
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cases', caseId, 'policy-check'] });
    },
  });

  const quoteComparisonMutation = useMutation({
    mutationFn: (data: { requirements_document_id: string; target_document_ids: string[] }) =>
      apiCall<QuoteComparisonResponse>(() =>
        bindApi.cases({ case_id: caseId })['quote-comparison'].post(data)
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cases', caseId, 'quote-comparison'] });
    },
  });

  const memoMutation = useMutation({
    mutationFn: () => apiCall<MemoResponse>(() => bindApi.cases({ case_id: caseId }).memo.post({})),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cases', caseId, 'memo'] });
    },
  });

  function handleAddDocument(e: React.FormEvent) {
    e.preventDefault();
    addDocumentMutation.mutate({
      file_name: fileName,
      mime_type: 'application/pdf',
      document_type: documentType,
    });
  }

  function handleRunPolicyCheck() {
    if (!policyCheckReqDocId || !policyCheckTargetDocId) return;
    policyCheckMutation.mutate({
      requirements_document_id: policyCheckReqDocId,
      target_document_id: policyCheckTargetDocId,
    });
  }

  const actionError =
    transitionMutation.error ??
    addDocumentMutation.error ??
    deleteDocumentMutation.error ??
    analyzeMutation.error ??
    policyCheckMutation.error ??
    quoteComparisonMutation.error ??
    memoMutation.error;

  if (caseQuery.isLoading) return <main className="p-4">Loading...</main>;
  if (caseQuery.error)
    return <main className="text-destructive p-4">{caseQuery.error.message}</main>;
  if (!caseQuery.data) return null;

  const caseData = caseQuery.data;
  const documents = documentsQuery.data ?? [];
  const status = caseData.status as 'draft' | 'in_review' | 'completed' | 'cancelled';

  const requirementsDocs = documents.filter(
    (d) => d.document_type === 'contract_requirements' && d.analysis_status === 'completed'
  );
  const targetDocs = documents.filter(
    (d) =>
      (d.document_type === 'current_policy' || d.document_type === 'carrier_quote') &&
      d.analysis_status === 'completed'
  );

  const policyCheckResult = policyCheckMutation.data ?? policyCheckQuery.data;
  const quoteComparisonResult = quoteComparisonMutation.data;
  const canRunComparison = requirementsDocs.length > 0 && targetDocs.length >= 2;
  const memoResult = memoMutation.data ?? memoQuery.data;

  function handleRunQuoteComparison() {
    const reqDoc = requirementsDocs[0];
    if (!reqDoc || targetDocs.length < 2) return;
    quoteComparisonMutation.mutate({
      requirements_document_id: reqDoc.id,
      target_document_ids: targetDocs.map((d) => d.id),
    });
  }

  return (
    <main data-testid="case-detail" className="mx-auto max-w-3xl p-4">
      <Link to="/cases/" className="text-primary text-sm hover:underline">
        &larr; Back to cases
      </Link>

      <h1 className="mt-3 text-2xl font-bold">{caseData.case_name}</h1>
      <p className="text-muted-foreground">Client: {caseData.client_name}</p>
      <p>
        Status: <strong data-testid="case-status">{caseData.status}</strong>
      </p>

      <div className="my-4 flex gap-2">
        {status === 'draft' && (
          <>
            <Button
              data-testid="submit-button"
              disabled={transitionMutation.isPending}
              onClick={() => transitionMutation.mutate('submit')}
            >
              {transitionMutation.isPending ? 'Submitting...' : 'Submit for Review'}
            </Button>
            <Button
              data-testid="cancel-button"
              variant="destructive"
              disabled={transitionMutation.isPending}
              onClick={() => transitionMutation.mutate('cancel')}
            >
              Cancel
            </Button>
          </>
        )}
        {status === 'in_review' && (
          <>
            <Button
              data-testid="complete-button"
              disabled={transitionMutation.isPending}
              onClick={() => transitionMutation.mutate('complete')}
            >
              Complete
            </Button>
            <Button
              data-testid="cancel-button"
              variant="destructive"
              disabled={transitionMutation.isPending}
              onClick={() => transitionMutation.mutate('cancel')}
            >
              Cancel
            </Button>
          </>
        )}
      </div>

      {actionError && <p className="text-destructive text-sm">{actionError.message}</p>}

      <hr className="border-border my-6" />

      <div className="mb-3 flex items-center gap-4">
        <h2 className="text-xl font-semibold">Documents</h2>
        <Button
          data-testid="add-document-button"
          variant="outline"
          onClick={() => setShowDocForm((v) => !v)}
        >
          {showDocForm ? 'Cancel' : 'Add Document'}
        </Button>
      </div>

      {showDocForm && (
        <form onSubmit={handleAddDocument} className="mb-4 flex flex-wrap gap-2">
          <input
            data-testid="file-name-input"
            placeholder="File name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            required
            className="border-input rounded-md border px-3 py-1.5 text-sm"
          />
          <select
            data-testid="document-type-select"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className="border-input rounded-md border px-3 py-1.5 text-sm"
          >
            {DOCUMENT_TYPES.map((dt) => (
              <option key={dt} value={dt}>
                {dt}
              </option>
            ))}
          </select>
          <Button
            type="submit"
            data-testid="create-document-button"
            disabled={addDocumentMutation.isPending}
          >
            {addDocumentMutation.isPending ? 'Adding...' : 'Add'}
          </Button>
        </form>
      )}

      <ul data-testid="documents-list" className="space-y-0">
        {documents.map((doc) => (
          <li key={doc.id} data-testid={`document-row-${doc.id}`}>
            <div className="border-border flex items-center gap-4 border-b py-2">
              <span className="flex-1 text-sm">{doc.file_name}</span>
              <span className="text-muted-foreground text-sm">{doc.document_type}</span>
              <AnalysisStatusBadge status={doc.analysis_status} />
              {doc.analysis_status === 'completed' && (
                <Button
                  data-testid={`view-analysis-${doc.id}`}
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedAnalysisId((prev) => (prev === doc.id ? null : doc.id))}
                >
                  {expandedAnalysisId === doc.id ? 'Hide Analysis' : 'View Analysis'}
                </Button>
              )}
              <Button
                data-testid={`analyze-document-${doc.id}`}
                variant="secondary"
                size="sm"
                disabled={analyzeMutation.isPending && analyzeMutation.variables === doc.id}
                onClick={() => analyzeMutation.mutate(doc.id)}
              >
                {analyzeMutation.isPending && analyzeMutation.variables === doc.id
                  ? 'Analyzing...'
                  : 'Analyze'}
              </Button>
              <Button
                data-testid={`delete-document-${doc.id}`}
                variant="destructive"
                size="sm"
                disabled={
                  deleteDocumentMutation.isPending && deleteDocumentMutation.variables === doc.id
                }
                onClick={() => deleteDocumentMutation.mutate(doc.id)}
              >
                Delete
              </Button>
            </div>
            {expandedAnalysisId === doc.id && analysisQuery.data && (
              <pre
                data-testid={`analysis-result-${doc.id}`}
                className="bg-muted border-border mb-2 max-h-96 overflow-auto rounded-md border p-3 text-xs"
              >
                {JSON.stringify(analysisQuery.data, null, 2)}
              </pre>
            )}
          </li>
        ))}
        {documents.length === 0 && (
          <li className="text-muted-foreground py-2 text-sm">No documents yet.</li>
        )}
      </ul>

      <hr className="border-border my-6" />

      <div data-testid="policy-check-section">
        <div className="mb-3 flex items-center gap-4">
          <h2 className="text-xl font-semibold">Policy Check</h2>
          <Button
            data-testid="fetch-latest-policy-check"
            variant="outline"
            size="sm"
            disabled={policyCheckQuery.isFetching}
            onClick={() => policyCheckQuery.refetch()}
          >
            Load Latest
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs">Requirements Document</label>
            <select
              data-testid="policy-check-req-select"
              value={policyCheckReqDocId}
              onChange={(e) => setPolicyCheckReqDocId(e.target.value)}
              className="border-input rounded-md border px-3 py-1.5 text-sm"
            >
              <option value="">-- select --</option>
              {requirementsDocs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.file_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs">Target Document</label>
            <select
              data-testid="policy-check-target-select"
              value={policyCheckTargetDocId}
              onChange={(e) => setPolicyCheckTargetDocId(e.target.value)}
              className="border-input rounded-md border px-3 py-1.5 text-sm"
            >
              <option value="">-- select --</option>
              {targetDocs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.file_name} ({d.document_type})
                </option>
              ))}
            </select>
          </div>
          <Button
            data-testid="run-policy-check"
            disabled={
              !policyCheckReqDocId || !policyCheckTargetDocId || policyCheckMutation.isPending
            }
            onClick={handleRunPolicyCheck}
          >
            {policyCheckMutation.isPending ? 'Running...' : 'Run Check'}
          </Button>
        </div>

        {policyCheckResult && (
          <div data-testid="policy-check-results">
            <div
              data-testid="policy-check-summary"
              className="bg-muted mb-3 flex gap-3 rounded-md px-3 py-2 text-sm"
            >
              <span className="text-green-800">{policyCheckResult.summary_counts.ok} OK</span>
              <span className="text-orange-800">{policyCheckResult.summary_counts.gap} Gap</span>
              <span className="text-red-800">
                {policyCheckResult.summary_counts.missing} Missing
              </span>
              <span className="text-yellow-800">
                {policyCheckResult.summary_counts.review} Review
              </span>
              <span className="text-muted-foreground">
                {policyCheckResult.summary_counts.not_applicable} N/A
              </span>
            </div>

            <ul className="space-y-0">
              {policyCheckResult.results.map((r: CheckResultItem) => (
                <li
                  key={r.check_id}
                  data-testid={`policy-check-item-${r.check_id}`}
                  className="border-border border-b py-2"
                >
                  <div className="flex items-center gap-2">
                    <VerdictBadge verdict={r.verdict} />
                    <span className="font-medium">{r.check_name}</span>
                    <span className="text-muted-foreground ml-auto text-xs">{r.severity}</span>
                  </div>
                  <p className="text-foreground/70 mt-1 text-sm">{r.message}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <hr className="border-border my-6" />

      <div data-testid="quote-comparison-section">
        <div className="mb-3 flex items-center gap-4">
          <h2 className="text-xl font-semibold">Quote Comparison</h2>
          <Button
            data-testid="run-quote-comparison"
            disabled={!canRunComparison || quoteComparisonMutation.isPending}
            onClick={handleRunQuoteComparison}
          >
            {quoteComparisonMutation.isPending ? 'Running...' : 'Run Comparison'}
          </Button>
        </div>

        {!canRunComparison && (
          <p className="text-muted-foreground text-sm">
            {requirementsDocs.length === 0
              ? 'Needs a completed contract_requirements analysis.'
              : `Needs at least 2 completed target docs (current_policy / carrier_quote). Found ${targetDocs.length}.`}
          </p>
        )}

        {quoteComparisonResult && (
          <div data-testid="quote-comparison-results">
            {quoteComparisonResult.result.recommendation.recommended_document_id && (
              <div
                data-testid="quote-comparison-recommendation"
                className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-4"
              >
                <strong>
                  Recommended:{' '}
                  {quoteComparisonResult.result.options.find(
                    (o) =>
                      o.target_document_id ===
                      quoteComparisonResult.result.recommendation.recommended_document_id
                  )?.option_name ?? 'Unknown'}
                </strong>
                <p className="mt-1 text-sm text-blue-800">
                  {quoteComparisonResult.result.recommendation.reason}
                </p>
                <p className="text-foreground/70 mt-1 text-sm">
                  {quoteComparisonResult.result.recommendation.explanation}
                </p>
              </div>
            )}

            <div data-testid="quote-comparison-options" className="flex gap-4 overflow-x-auto">
              {quoteComparisonResult.result.options.map((option) => (
                <QuoteOptionCard
                  key={option.target_document_id}
                  option={option}
                  isRecommended={
                    option.target_document_id ===
                    quoteComparisonResult.result.recommendation.recommended_document_id
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <hr className="border-border my-6" />

      <div data-testid="memo-section">
        <div className="mb-3 flex items-center gap-4">
          <h2 className="text-xl font-semibold">Proposal Memo</h2>
          <Button
            data-testid="generate-memo"
            disabled={memoMutation.isPending}
            onClick={() => memoMutation.mutate()}
          >
            {memoMutation.isPending ? 'Generating...' : 'Generate Memo'}
          </Button>
          <Button
            data-testid="load-latest-memo"
            variant="outline"
            size="sm"
            disabled={memoQuery.isFetching}
            onClick={() => memoQuery.refetch()}
          >
            Load Latest
          </Button>
        </div>

        {memoResult?.status === 'completed' && memoResult.content && (
          <div data-testid="memo-content" className="space-y-4">
            <MemoSectionBlock
              title="Executive Summary"
              content={memoResult.content.executive_summary}
            />
            <MemoSectionBlock title="Coverage Gaps" content={memoResult.content.coverage_gaps} />
            <MemoSectionBlock
              title="Quote Comparison"
              content={memoResult.content.quote_comparison}
            />
            <MemoSectionBlock title="Recommendation" content={memoResult.content.recommendation} />
            <div>
              <h3 className="mb-1 text-sm font-semibold">Next Steps</h3>
              <ul className="text-foreground/80 ml-5 list-disc text-sm">
                {memoResult.content.next_steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {memoResult?.status === 'failed' && (
          <p className="text-destructive text-sm">Memo generation failed: {memoResult.error}</p>
        )}
      </div>
    </main>
  );
}

function MemoSectionBlock({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      <p className="text-foreground/80 text-sm">{content}</p>
    </div>
  );
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';
const FALLBACK_STATUS = { variant: 'outline' as BadgeVariant, label: 'Pending' };

const STATUS_VARIANTS: Record<string, { variant: BadgeVariant; label: string }> = {
  pending: FALLBACK_STATUS,
  processing: { variant: 'secondary', label: 'Processing' },
  completed: { variant: 'default', label: 'Completed' },
  failed: { variant: 'destructive', label: 'Failed' },
};

function AnalysisStatusBadge({ status }: { status: string }) {
  const { variant, label } = STATUS_VARIANTS[status] ?? FALLBACK_STATUS;
  return <Badge variant={variant}>{label}</Badge>;
}

const VERDICT_VARIANT: Record<CheckVerdict, BadgeVariant> = {
  ok: 'default',
  gap: 'secondary',
  missing: 'destructive',
  review: 'outline',
  not_applicable: 'outline',
};

function VerdictBadge({ verdict }: { verdict: CheckVerdict }) {
  return (
    <Badge data-testid={`verdict-badge-${verdict}`} variant={VERDICT_VARIANT[verdict]}>
      {verdict.replace('_', ' ')}
    </Badge>
  );
}

function QuoteOptionCard({
  option,
  isRecommended,
}: {
  option: OptionSummary;
  isRecommended: boolean;
}) {
  return (
    <div
      data-testid={`quote-option-${option.target_document_id}`}
      className={`min-w-[300px] flex-1 rounded-lg border p-4 ${
        isRecommended ? 'border-2 border-blue-500 bg-blue-50/50' : 'border-border bg-background'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{option.option_name}</h3>
        <span data-testid={`meets-requirements-${option.target_document_id}`} className="text-lg">
          {option.meets_core_requirements ? '✅' : '❌'}
        </span>
      </div>
      <p className="text-muted-foreground mt-1 text-sm">{option.carrier_name}</p>
      <p className="mt-1 text-sm font-semibold">
        Premium: {option.premium != null ? `$${option.premium.toLocaleString()}` : 'N/A'}
      </p>
      <p className="text-foreground/70 mt-1 text-sm">{option.deductible_summary}</p>

      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="text-green-800">{option.policy_check_summary.ok} OK</span>
        <span className="text-orange-800">{option.policy_check_summary.gap} Gap</span>
        <span className="text-red-800">{option.policy_check_summary.missing} Missing</span>
        <span className="text-yellow-800">{option.policy_check_summary.review} Review</span>
        <span className="text-muted-foreground">
          {option.policy_check_summary.not_applicable} N/A
        </span>
      </div>

      {option.strengths.length > 0 && (
        <div className="mt-2">
          <strong className="text-xs">Strengths</strong>
          <ul className="mt-1 ml-5 list-disc text-xs">
            {option.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {option.risks.length > 0 && (
        <div className="mt-2">
          <strong className="text-xs text-amber-600">Risks</strong>
          <ul className="mt-1 ml-5 list-disc text-xs">
            {option.risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {option.missing_requirements.length > 0 && (
        <div className="mt-2">
          <strong className="text-destructive text-xs">Missing Requirements</strong>
          <ul className="mt-1 ml-5 list-disc text-xs">
            {option.missing_requirements.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';

import type { AnalysisResponse } from '@bind/api/analysis';
import type { DocumentResponseType, DocumentType } from '@bind/api/documents';
import type { CheckResultItem, CheckVerdict, PolicyCheckResponse } from '@bind/api/policy-check';
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

interface PolicyCheckResult {
  check_id: string;
  check_name: string;
  verdict: 'ok' | 'gap' | 'missing' | 'review' | 'not_applicable';
  severity: 'blocking' | 'material' | 'minor' | 'informational';
  message: string;
  evidence: {
    requirement_source: string;
    found_value: string | null;
    document_id: string;
    page_numbers: number[];
  };
}

interface PolicyCheckResponse {
  id: string;
  case_id: string;
  requirements_document_id: string;
  target_document_id: string;
  target_document_type: string;
  results: PolicyCheckResult[];
  summary_counts: {
    ok: number;
    gap: number;
    missing: number;
    review: number;
    not_applicable: number;
  };
  created_at: string;
}

interface QuoteComparisonOption {
  target_document_id: string;
  option_name: string;
  carrier_name: string;
  premium: number | null;
  deductible_summary: string;
  meets_core_requirements: boolean;
  policy_check_summary: {
    ok: number;
    gap: number;
    missing: number;
    review: number;
    not_applicable: number;
  };
  strengths: string[];
  risks: string[];
  missing_requirements: string[];
  review_items: string[];
}

interface QuoteComparisonResponse {
  id: string;
  case_id: string;
  requirements_document_id: string;
  target_document_ids: string[];
  result: {
    options: QuoteComparisonOption[];
    recommendation: {
      recommended_document_id: string | null;
      reason: string;
      explanation: string;
    };
  };
  created_at: string;
}

function CaseDetail() {
  const { caseId } = Route.useParams();
  const queryClient = useQueryClient();

  const [showDocForm, setShowDocForm] = useState(false);
  const [fileName, setFileName] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('other');
  const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null);

  const [policyCheckReqDocId, setPolicyCheckReqDocId] = useState('');
  const [policyCheckTargetDocId, setPolicyCheckTargetDocId] = useState('');
  const [policyCheckRunning, setPolicyCheckRunning] = useState(false);
  const [policyCheckResult, setPolicyCheckResult] = useState<PolicyCheckResponse | null>(null);

  const [quoteComparisonRunning, setQuoteComparisonRunning] = useState(false);
  const [quoteComparisonResult, setQuoteComparisonResult] =
    useState<QuoteComparisonResponse | null>(null);

  async function fetchCase() {
    try {
      const data = await apiCall<CaseResponseType>(() => bindApi.cases({ case_id: caseId }).get());
      setCaseData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load case');
    }
  }

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
    policyCheckMutation.error;

  async function handleRunPolicyCheck() {
    if (!policyCheckReqDocId || !policyCheckTargetDocId) return;
    setPolicyCheckRunning(true);
    setActionError(null);
    try {
      const result = await apiCall<PolicyCheckResponse>(() =>
        bindApi.cases({ case_id: caseId })['policy-check'].post({
          requirements_document_id: policyCheckReqDocId,
          target_document_id: policyCheckTargetDocId,
        })
      );
      setPolicyCheckResult(result);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Policy check failed');
    } finally {
      setPolicyCheckRunning(false);
    }
  }

  async function handleFetchLatestPolicyCheck() {
    setActionError(null);
    try {
      const result = await apiCall<PolicyCheckResponse>(() =>
        bindApi.cases({ case_id: caseId })['policy-check'].get()
      );
      setPolicyCheckResult(result);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to fetch policy check');
    }
  }

  const requirementsDocs = documents.filter(
    (d) => d.document_type === 'contract_requirements' && d.analysis_status === 'completed'
  );
  const targetDocs = documents.filter(
    (d) =>
      (d.document_type === 'current_policy' || d.document_type === 'carrier_quote') &&
      d.analysis_status === 'completed'
  );

  const canRunComparison = requirementsDocs.length > 0 && targetDocs.length >= 2;

  async function handleRunQuoteComparison() {
    const reqDoc = requirementsDocs[0];
    if (!reqDoc || targetDocs.length < 2) return;
    setQuoteComparisonRunning(true);
    setActionError(null);
    try {
      const result = await apiCall<QuoteComparisonResponse>(() =>
        bindApi.cases({ case_id: caseId })['quote-comparison'].post({
          requirements_document_id: reqDoc.id,
          target_document_ids: targetDocs.map((d) => d.id),
        })
      );
      setQuoteComparisonResult(result);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Quote comparison failed');
    } finally {
      setQuoteComparisonRunning(false);
    }
  }

  if (loading) return <main style={{ padding: '1rem' }}>Loading...</main>;
  if (error) return <main style={{ padding: '1rem', color: 'red' }}>{error}</main>;
  if (!caseData) return null;

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

      <hr style={{ margin: '1.5rem 0' }} />

      <div data-testid="policy-check-section">
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}
        >
          <h2 style={{ margin: 0 }}>Policy Check</h2>
          <Button
            data-testid="fetch-latest-policy-check"
            variant="outline"
            size="sm"
            onClick={handleFetchLatestPolicyCheck}
          >
            Load Latest
          </Button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            marginBottom: '1rem',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
              Requirements Document
            </label>
            <select
              data-testid="policy-check-req-select"
              value={policyCheckReqDocId}
              onChange={(e) => setPolicyCheckReqDocId(e.target.value)}
              style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }}
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
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
              Target Document
            </label>
            <select
              data-testid="policy-check-target-select"
              value={policyCheckTargetDocId}
              onChange={(e) => setPolicyCheckTargetDocId(e.target.value)}
              style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }}
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
            disabled={!policyCheckReqDocId || !policyCheckTargetDocId || policyCheckRunning}
            onClick={handleRunPolicyCheck}
          >
            {policyCheckRunning ? 'Running...' : 'Run Check'}
          </Button>
        </div>

        {policyCheckResult && (
          <div data-testid="policy-check-results">
            <div
              data-testid="policy-check-summary"
              style={{
                display: 'flex',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                background: '#f5f5f5',
                borderRadius: '4px',
                fontSize: '0.85rem',
                marginBottom: '0.75rem',
              }}
            >
              <span style={{ color: '#065f46' }}>{policyCheckResult.summary_counts.ok} OK</span>
              <span style={{ color: '#9a3412' }}>{policyCheckResult.summary_counts.gap} Gap</span>
              <span style={{ color: '#991b1b' }}>
                {policyCheckResult.summary_counts.missing} Missing
              </span>
              <span style={{ color: '#854d0e' }}>
                {policyCheckResult.summary_counts.review} Review
              </span>
              <span style={{ color: '#6b7280' }}>
                {policyCheckResult.summary_counts.not_applicable} N/A
              </span>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {policyCheckResult.results.map((r) => (
                <li
                  key={r.check_id}
                  data-testid={`policy-check-item-${r.check_id}`}
                  style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <VerdictBadge verdict={r.verdict} />
                    <span style={{ fontWeight: 500 }}>{r.check_name}</span>
                    <span style={{ fontSize: '0.75rem', color: '#666', marginLeft: 'auto' }}>
                      {r.severity}
                    </span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#444' }}>
                    {r.message}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <hr style={{ margin: '1.5rem 0' }} />

      <div data-testid="quote-comparison-section">
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}
        >
          <h2 style={{ margin: 0 }}>Quote Comparison</h2>
          <Button
            data-testid="run-quote-comparison"
            disabled={!canRunComparison || quoteComparisonRunning}
            onClick={handleRunQuoteComparison}
          >
            {quoteComparisonRunning ? 'Running...' : 'Run Comparison'}
          </Button>
        </div>

        {!canRunComparison && (
          <p style={{ fontSize: '0.85rem', color: '#666' }}>
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
                style={{
                  padding: '0.75rem 1rem',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                }}
              >
                <strong>
                  Recommended:{' '}
                  {quoteComparisonResult.result.options.find(
                    (o) =>
                      o.target_document_id ===
                      quoteComparisonResult.result.recommendation.recommended_document_id
                  )?.option_name ?? 'Unknown'}
                </strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#1e40af' }}>
                  {quoteComparisonResult.result.recommendation.reason}
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#444' }}>
                  {quoteComparisonResult.result.recommendation.explanation}
                </p>
              </div>
            )}

            <div
              data-testid="quote-comparison-options"
              style={{ display: 'flex', gap: '1rem', overflowX: 'auto' }}
            >
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
    </main>
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

const VERDICT_COLORS: Record<PolicyCheckResult['verdict'], { background: string; color: string }> =
  {
    ok: { background: '#d1fae5', color: '#065f46' },
    gap: { background: '#ffedd5', color: '#9a3412' },
    missing: { background: '#fee2e2', color: '#991b1b' },
    review: { background: '#fef3c7', color: '#854d0e' },
    not_applicable: { background: '#e5e7eb', color: '#6b7280' },
  };

function VerdictBadge({ verdict }: { verdict: PolicyCheckResult['verdict'] }) {
  const colors = VERDICT_COLORS[verdict];
  return (
    <span
      data-testid={`verdict-badge-${verdict}`}
      style={{
        fontSize: '0.7rem',
        padding: '0.15rem 0.5rem',
        borderRadius: '9999px',
        fontWeight: 600,
        textTransform: 'uppercase',
        ...colors,
      }}
    >
      {verdict.replace('_', ' ')}
    </span>
  );
}

function QuoteOptionCard({
  option,
  isRecommended,
}: {
  option: QuoteComparisonOption;
  isRecommended: boolean;
}) {
  return (
    <div
      data-testid={`quote-option-${option.target_document_id}`}
      style={{
        minWidth: '300px',
        flex: '1 1 0',
        border: isRecommended ? '2px solid #3b82f6' : '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1rem',
        background: isRecommended ? '#f8faff' : '#fff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>{option.option_name}</h3>
        <span
          data-testid={`meets-requirements-${option.target_document_id}`}
          style={{ fontSize: '1.1rem' }}
        >
          {option.meets_core_requirements ? '✅' : '❌'}
        </span>
      </div>
      <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#666' }}>
        {option.carrier_name}
      </p>
      <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', fontWeight: 600 }}>
        Premium: {option.premium != null ? `$${option.premium.toLocaleString()}` : 'N/A'}
      </p>
      <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#444' }}>
        {option.deductible_summary}
      </p>

      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          fontSize: '0.75rem',
          margin: '0.5rem 0',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ color: '#065f46' }}>{option.policy_check_summary.ok} OK</span>
        <span style={{ color: '#9a3412' }}>{option.policy_check_summary.gap} Gap</span>
        <span style={{ color: '#991b1b' }}>{option.policy_check_summary.missing} Missing</span>
        <span style={{ color: '#854d0e' }}>{option.policy_check_summary.review} Review</span>
        <span style={{ color: '#6b7280' }}>{option.policy_check_summary.not_applicable} N/A</span>
      </div>

      {option.strengths.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <strong style={{ fontSize: '0.8rem' }}>Strengths</strong>
          <ul style={{ margin: '0.25rem 0', paddingLeft: '1.2rem', fontSize: '0.8rem' }}>
            {option.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {option.risks.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <strong style={{ fontSize: '0.8rem', color: '#b45309' }}>Risks</strong>
          <ul style={{ margin: '0.25rem 0', paddingLeft: '1.2rem', fontSize: '0.8rem' }}>
            {option.risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {option.missing_requirements.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <strong style={{ fontSize: '0.8rem', color: '#dc2626' }}>Missing Requirements</strong>
          <ul style={{ margin: '0.25rem 0', paddingLeft: '1.2rem', fontSize: '0.8rem' }}>
            {option.missing_requirements.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import type { AnalysisStatus, DocumentResponseType, DocumentType } from '@bind/api/documents';
import type { CaseEvent, CaseResponseType } from '@bind/api/review-cases';

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

  const [caseData, setCaseData] = useState<CaseResponseType | null>(null);
  const [documents, setDocuments] = useState<DocumentResponseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [showDocForm, setShowDocForm] = useState(false);
  const [fileName, setFileName] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('other');
  const [submittingDoc, setSubmittingDoc] = useState(false);

  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);
  const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<Record<string, unknown>>({});

  async function fetchCase() {
    try {
      const data = await apiCall<CaseResponseType>(() => bindApi.cases({ case_id: caseId }).get());
      setCaseData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load case');
    }
  }

  async function fetchDocuments() {
    try {
      const data = await apiCall<DocumentResponseType[]>(() =>
        bindApi.cases({ case_id: caseId }).documents.get()
      );
      setDocuments(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load documents');
    }
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    await Promise.all([fetchCase(), fetchDocuments()]);
    setLoading(false);
  }

  useEffect(() => {
    void loadAll();
  }, [caseId]);

  async function handleTransition(event: CaseEvent) {
    setActionError(null);
    try {
      await apiCall<CaseResponseType>(() =>
        bindApi.cases({ case_id: caseId }).transition.post({ event } as { event: never })
      );
      await fetchCase();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Transition failed');
    }
  }

  async function handleAddDocument(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingDoc(true);
    setActionError(null);
    try {
      await apiCall<DocumentResponseType>(() =>
        bindApi.cases({ case_id: caseId }).documents.post({
          file_name: fileName,
          mime_type: 'application/pdf',
          document_type: documentType as never,
        })
      );
      setFileName('');
      setDocumentType('other');
      setShowDocForm(false);
      await fetchDocuments();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to add document');
    } finally {
      setSubmittingDoc(false);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    setActionError(null);
    try {
      await apiCall<void>(() =>
        bindApi.cases({ case_id: caseId }).documents({ document_id: documentId }).delete()
      );
      await fetchDocuments();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to delete document');
    }
  }

  async function handleAnalyze(documentId: string) {
    setAnalyzingDocId(documentId);
    setActionError(null);
    try {
      await apiCall<unknown>(() =>
        bindApi
          .cases({ case_id: caseId })
          .documents({ document_id: documentId })
          .analyze.post({} as never)
      );
      await fetchDocuments();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalyzingDocId(null);
    }
  }

  async function handleViewAnalysis(documentId: string) {
    if (expandedAnalysisId === documentId) {
      setExpandedAnalysisId(null);
      return;
    }
    setActionError(null);
    try {
      const result = await apiCall<{ result: unknown }>(() =>
        bindApi.cases({ case_id: caseId }).documents({ document_id: documentId }).analysis.get()
      );
      setAnalysisResults((prev) => ({ ...prev, [documentId]: result }));
      setExpandedAnalysisId(documentId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to load analysis');
    }
  }

  if (loading) return <main style={{ padding: '1rem' }}>Loading...</main>;
  if (error) return <main style={{ padding: '1rem', color: 'red' }}>{error}</main>;
  if (!caseData) return null;

  const status = caseData.status as 'draft' | 'in_review' | 'completed' | 'cancelled';

  return (
    <main data-testid="case-detail" style={{ padding: '1rem', maxWidth: '800px' }}>
      <Link to="/cases/" style={{ color: '#0070f3', fontSize: '0.9rem' }}>
        &larr; Back to cases
      </Link>

      <h1 style={{ marginTop: '0.75rem' }}>{caseData.case_name}</h1>
      <p>Client: {caseData.client_name}</p>
      <p>
        Status: <strong data-testid="case-status">{caseData.status}</strong>
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
        {status === 'draft' && (
          <>
            <Button data-testid="submit-button" onClick={() => handleTransition('submit')}>
              Submit for Review
            </Button>
            <Button
              data-testid="cancel-button"
              variant="destructive"
              onClick={() => handleTransition('cancel')}
            >
              Cancel
            </Button>
          </>
        )}
        {status === 'in_review' && (
          <>
            <Button data-testid="complete-button" onClick={() => handleTransition('complete')}>
              Complete
            </Button>
            <Button
              data-testid="cancel-button"
              variant="destructive"
              onClick={() => handleTransition('cancel')}
            >
              Cancel
            </Button>
          </>
        )}
      </div>

      {actionError && <p style={{ color: 'red' }}>{actionError}</p>}

      <hr style={{ margin: '1.5rem 0' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0 }}>Documents</h2>
        <Button
          data-testid="add-document-button"
          variant="outline"
          onClick={() => setShowDocForm((v) => !v)}
        >
          {showDocForm ? 'Cancel' : 'Add Document'}
        </Button>
      </div>

      {showDocForm && (
        <form
          onSubmit={handleAddDocument}
          style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
        >
          <input
            data-testid="file-name-input"
            placeholder="File name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            required
            style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <select
            data-testid="document-type-select"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Button type="submit" data-testid="create-document-button" disabled={submittingDoc}>
            {submittingDoc ? 'Adding...' : 'Add'}
          </Button>
        </form>
      )}

      <ul data-testid="documents-list" style={{ listStyle: 'none', padding: 0 }}>
        {documents.map((doc) => (
          <li key={doc.id} data-testid={`document-row-${doc.id}`}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.4rem 0',
                borderBottom: expandedAnalysisId === doc.id ? 'none' : '1px solid #eee',
              }}
            >
              <span style={{ flex: 1 }}>{doc.file_name}</span>
              <span style={{ color: '#666' }}>{doc.document_type}</span>
              <AnalysisStatusBadge status={doc.analysis_status as AnalysisStatus} />
              {doc.analysis_status === 'completed' && (
                <Button
                  data-testid={`view-analysis-${doc.id}`}
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewAnalysis(doc.id)}
                >
                  {expandedAnalysisId === doc.id ? 'Hide Analysis' : 'View Analysis'}
                </Button>
              )}
              <Button
                data-testid={`analyze-document-${doc.id}`}
                variant="secondary"
                size="sm"
                disabled={analyzingDocId === doc.id}
                onClick={() => handleAnalyze(doc.id)}
              >
                {analyzingDocId === doc.id ? 'Analyzing...' : 'Analyze'}
              </Button>
              <Button
                data-testid={`delete-document-${doc.id}`}
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteDocument(doc.id)}
              >
                Delete
              </Button>
            </div>
            {expandedAnalysisId === doc.id && doc.id in analysisResults && (
              <pre
                data-testid={`analysis-result-${doc.id}`}
                style={{
                  background: '#f5f5f5',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  overflow: 'auto',
                  maxHeight: '400px',
                  marginBottom: '0.5rem',
                  borderBottom: '1px solid #eee',
                }}
              >
                {JSON.stringify(analysisResults[doc.id], null, 2)}
              </pre>
            )}
          </li>
        ))}
        {documents.length === 0 && (
          <li style={{ color: '#999', padding: '0.4rem 0' }}>No documents yet.</li>
        )}
      </ul>
    </main>
  );
}

const BADGE_COLORS: Record<AnalysisStatus, { background: string; color: string }> = {
  pending: { background: '#e5e7eb', color: '#374151' },
  processing: { background: '#fef3c7', color: '#92400e' },
  completed: { background: '#d1fae5', color: '#065f46' },
  failed: { background: '#fee2e2', color: '#991b1b' },
};

function AnalysisStatusBadge({ status }: { status: AnalysisStatus }) {
  const colors = BADGE_COLORS[status] ?? BADGE_COLORS.pending;
  return (
    <span
      style={{
        fontSize: '0.75rem',
        padding: '0.15rem 0.5rem',
        borderRadius: '9999px',
        fontWeight: 500,
        ...colors,
      }}
    >
      {status}
    </span>
  );
}

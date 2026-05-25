import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import type { DocumentResponseType, DocumentType } from '@bind/api/documents';
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
          <li
            key={doc.id}
            data-testid={`document-row-${doc.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.4rem 0',
              borderBottom: '1px solid #eee',
            }}
          >
            <span style={{ flex: 1 }}>{doc.file_name}</span>
            <span style={{ color: '#666' }}>{doc.document_type}</span>
            <span style={{ color: '#999', fontSize: '0.85rem' }}>{doc.analysis_status}</span>
            <Button
              data-testid={`delete-document-${doc.id}`}
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteDocument(doc.id)}
            >
              Delete
            </Button>
          </li>
        ))}
        {documents.length === 0 && (
          <li style={{ color: '#999', padding: '0.4rem 0' }}>No documents yet.</li>
        )}
      </ul>
    </main>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';

import type { AnalysisResponse } from '@bind/api/analysis';
import type { DocumentResponseType, DocumentType } from '@bind/api/documents';
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

  function handleAddDocument(e: React.FormEvent) {
    e.preventDefault();
    addDocumentMutation.mutate({
      file_name: fileName,
      mime_type: 'application/pdf',
      document_type: documentType,
    });
  }

  const actionError =
    transitionMutation.error ??
    addDocumentMutation.error ??
    deleteDocumentMutation.error ??
    analyzeMutation.error;

  if (caseQuery.isLoading) return <main className="p-4">Loading...</main>;
  if (caseQuery.error)
    return <main className="text-destructive p-4">{caseQuery.error.message}</main>;
  if (!caseQuery.data) return null;

  const caseData = caseQuery.data;
  const documents = documentsQuery.data ?? [];
  const status = caseData.status as 'draft' | 'in_review' | 'completed' | 'cancelled';

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
                className="border-border bg-muted mb-2 max-h-96 overflow-auto rounded-md border p-3 text-xs"
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

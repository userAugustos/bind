import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useReducer } from 'react';
import type { FormEvent } from 'react';

import type { DocumentResponseType, DocumentType } from '@bind/api/documents';
import type { CaseEvent, CaseResponseType } from '@bind/api/review-cases';

import { Button } from '@repo/ui/shadcn/button';
import { Input } from '@repo/ui/shadcn/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/shadcn/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/shadcn/table';
import { apiCall, bindApi } from '@/api';
import { getErrorMessage } from '@/modules/core/lib/errors';
import { isOneOfValue } from '@/modules/core/lib/guards';

export const Route = createFileRoute('/cases/$caseId')({ component: CaseDetail });

const DOCUMENT_TYPES: DocumentType[] = [
  'contract_requirements',
  'current_policy',
  'carrier_quote',
  'loss_history',
  'other',
];

const caseQueryKey = (caseId: string) => ['cases', caseId] as const;
const documentsQueryKey = (caseId: string) => ['cases', caseId, 'documents'] as const;

type DocumentFormState = {
  visible: boolean;
  fileName: string;
  documentType: DocumentType;
};

type DocumentFormEvent =
  | { type: 'toggle' }
  | { type: 'fileName.changed'; value: string }
  | { type: 'documentType.changed'; value: DocumentType }
  | { type: 'reset' };

const initialDocumentForm: DocumentFormState = {
  visible: false,
  fileName: '',
  documentType: 'other',
};

function documentFormReducer(
  state: DocumentFormState,
  event: DocumentFormEvent
): DocumentFormState {
  switch (event.type) {
    case 'toggle':
      return { ...state, visible: !state.visible };
    case 'fileName.changed':
      return { ...state, fileName: event.value };
    case 'documentType.changed':
      return { ...state, documentType: event.value };
    case 'reset':
      return initialDocumentForm;
  }
}

function CaseDetail() {
  const { caseId } = Route.useParams();
  const queryClient = useQueryClient();
  const [documentForm, dispatchDocumentForm] = useReducer(documentFormReducer, initialDocumentForm);

  const caseQuery = useQuery({
    queryKey: caseQueryKey(caseId),
    queryFn: () => apiCall<CaseResponseType>(() => bindApi.cases({ case_id: caseId }).get()),
  });

  const documentsQuery = useQuery({
    queryKey: documentsQueryKey(caseId),
    queryFn: () =>
      apiCall<DocumentResponseType[]>(() => bindApi.cases({ case_id: caseId }).documents.get()),
  });

  const transitionMutation = useMutation({
    mutationFn: (event: CaseEvent) =>
      apiCall<CaseResponseType>(() =>
        bindApi.cases({ case_id: caseId }).transition.post({ event })
      ),
    onSuccess: (updatedCase) => {
      queryClient.setQueryData(caseQueryKey(caseId), updatedCase);
    },
  });

  const addDocumentMutation = useMutation({
    mutationFn: () =>
      apiCall<DocumentResponseType>(() =>
        bindApi.cases({ case_id: caseId }).documents.post({
          file_name: documentForm.fileName,
          mime_type: 'application/pdf',
          document_type: documentForm.documentType,
        })
      ),
    onSuccess: async () => {
      dispatchDocumentForm({ type: 'reset' });
      await queryClient.invalidateQueries({ queryKey: documentsQueryKey(caseId) });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (documentId: string) =>
      apiCall<void>(() =>
        bindApi.cases({ case_id: caseId }).documents({ document_id: documentId }).delete()
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: documentsQueryKey(caseId) });
    },
  });

  function handleAddDocument(event: FormEvent) {
    event.preventDefault();
    addDocumentMutation.mutate();
  }

  const loadError = caseQuery.error ?? documentsQuery.error;
  const loading = caseQuery.isLoading || documentsQuery.isLoading;
  const caseData = caseQuery.data;
  const documents = documentsQuery.data ?? [];

  if (loading) return <main className="p-4">Loading...</main>;
  if (loadError) {
    return (
      <main className="text-destructive p-4">
        {getErrorMessage(loadError, 'Failed to load case')}
      </main>
    );
  }
  if (!caseData) return null;

  return (
    <main data-testid="case-detail" className="max-w-4xl p-4">
      <Button variant="link" asChild className="h-auto p-0 text-sm">
        <Link to="/cases">&larr; Back to cases</Link>
      </Button>

      <h1 className="mt-3 text-2xl font-semibold">{caseData.case_name}</h1>
      <p className="mt-2">Client: {caseData.client_name}</p>
      <p>
        Status: <strong data-testid="case-status">{caseData.status}</strong>
      </p>

      <div className="my-4 flex gap-2">
        {caseData.status === 'draft' && (
          <>
            <Button
              data-testid="submit-button"
              disabled={transitionMutation.isPending}
              onClick={() => transitionMutation.mutate('submit')}
            >
              Submit for Review
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
        {caseData.status === 'in_review' && (
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

      {transitionMutation.error && (
        <p className="text-destructive mb-4">
          {getErrorMessage(transitionMutation.error, 'Transition failed')}
        </p>
      )}

      <div className="border-border my-6 border-t" />

      <div className="mb-3 flex items-center gap-4">
        <h2 className="text-xl font-semibold">Documents</h2>
        <Button
          data-testid="add-document-button"
          variant="outline"
          onClick={() => dispatchDocumentForm({ type: 'toggle' })}
        >
          {documentForm.visible ? 'Cancel' : 'Add Document'}
        </Button>
      </div>

      {documentForm.visible && (
        <form onSubmit={handleAddDocument} className="mb-4 flex flex-wrap gap-2">
          <Input
            data-testid="file-name-input"
            placeholder="File name"
            value={documentForm.fileName}
            onChange={(event) =>
              dispatchDocumentForm({ type: 'fileName.changed', value: event.target.value })
            }
            required
          />
          <Select
            value={documentForm.documentType}
            onValueChange={(value) => {
              if (isOneOfValue(DOCUMENT_TYPES, value)) {
                dispatchDocumentForm({ type: 'documentType.changed', value });
              }
            }}
          >
            <SelectTrigger data-testid="document-type-select" className="w-56">
              <SelectValue placeholder="Document type" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((documentType) => (
                <SelectItem key={documentType} value={documentType}>
                  {documentType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="submit"
            data-testid="create-document-button"
            disabled={addDocumentMutation.isPending}
          >
            {addDocumentMutation.isPending ? 'Adding...' : 'Add'}
          </Button>
        </form>
      )}

      {addDocumentMutation.error && (
        <p className="text-destructive mb-4">
          {getErrorMessage(addDocumentMutation.error, 'Failed to add document')}
        </p>
      )}

      <Table data-testid="documents-list">
        <TableHeader>
          <TableRow>
            <TableHead>File Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Analysis</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => (
            <TableRow key={document.id} data-testid={`document-row-${document.id}`}>
              <TableCell>{document.file_name}</TableCell>
              <TableCell>{document.document_type}</TableCell>
              <TableCell>{document.analysis_status}</TableCell>
              <TableCell className="text-right">
                <Button
                  data-testid={`delete-document-${document.id}`}
                  variant="destructive"
                  size="sm"
                  disabled={deleteDocumentMutation.isPending}
                  onClick={() => deleteDocumentMutation.mutate(document.id)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {documents.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                No documents yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {deleteDocumentMutation.error && (
        <p className="text-destructive mt-4">
          {getErrorMessage(deleteDocumentMutation.error, 'Failed to delete document')}
        </p>
      )}
    </main>
  );
}

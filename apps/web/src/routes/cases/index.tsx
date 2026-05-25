import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useReducer } from 'react';
import type { FormEvent } from 'react';

import type { CaseResponseType } from '@bind/api/review-cases';

import { Button } from '@repo/ui/shadcn/button';
import { Input } from '@repo/ui/shadcn/input';
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

export const Route = createFileRoute('/cases/')({ component: CasesList });

const casesQueryKey = ['cases'] as const;

type CaseFormState = {
  visible: boolean;
  caseName: string;
  clientName: string;
};

type CaseFormEvent =
  | { type: 'toggle' }
  | { type: 'caseName.changed'; value: string }
  | { type: 'clientName.changed'; value: string }
  | { type: 'reset' };

const initialCaseForm: CaseFormState = { visible: false, caseName: '', clientName: '' };

function caseFormReducer(state: CaseFormState, event: CaseFormEvent): CaseFormState {
  switch (event.type) {
    case 'toggle':
      return { ...state, visible: !state.visible };
    case 'caseName.changed':
      return { ...state, caseName: event.value };
    case 'clientName.changed':
      return { ...state, clientName: event.value };
    case 'reset':
      return initialCaseForm;
  }
}

function CasesList() {
  const queryClient = useQueryClient();
  const [form, dispatchForm] = useReducer(caseFormReducer, initialCaseForm);

  const casesQuery = useQuery({
    queryKey: casesQueryKey,
    queryFn: () => apiCall<CaseResponseType[]>(() => bindApi.cases.get()),
  });

  const createCaseMutation = useMutation({
    mutationFn: () =>
      apiCall<CaseResponseType>(() =>
        bindApi.cases.post({ case_name: form.caseName, client_name: form.clientName })
      ),
    onSuccess: async () => {
      dispatchForm({ type: 'reset' });
      await queryClient.invalidateQueries({ queryKey: casesQueryKey });
    },
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    createCaseMutation.mutate();
  }

  const cases = casesQuery.data ?? [];
  const error = casesQuery.error ?? createCaseMutation.error;

  return (
    <main className="p-4">
      <div className="mb-4 flex items-center gap-4">
        <h1 className="text-2xl font-semibold">Review Cases</h1>
        <Button data-testid="new-case-button" onClick={() => dispatchForm({ type: 'toggle' })}>
          {form.visible ? 'Cancel' : 'New Case'}
        </Button>
      </div>

      {form.visible && (
        <form onSubmit={handleCreate} className="mb-4 flex flex-wrap gap-2">
          <Input
            data-testid="case-name-input"
            placeholder="Case name"
            value={form.caseName}
            onChange={(event) =>
              dispatchForm({ type: 'caseName.changed', value: event.target.value })
            }
            required
          />
          <Input
            data-testid="client-name-input"
            placeholder="Client name"
            value={form.clientName}
            onChange={(event) =>
              dispatchForm({ type: 'clientName.changed', value: event.target.value })
            }
            required
          />
          <Button
            type="submit"
            data-testid="create-case-button"
            disabled={createCaseMutation.isPending}
          >
            {createCaseMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </form>
      )}

      {error && (
        <p className="text-destructive mb-4">{getErrorMessage(error, 'Failed to load cases')}</p>
      )}
      {casesQuery.isLoading && <p>Loading...</p>}

      {!casesQuery.isLoading && (
        <Table data-testid="cases-list">
          <TableHeader>
            <TableRow>
              <TableHead>Case Name</TableHead>
              <TableHead>Client Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.map((reviewCase) => (
              <TableRow key={reviewCase.id} data-testid={`case-row-${reviewCase.id}`}>
                <TableCell>
                  <Link
                    to="/cases/$caseId"
                    params={{ caseId: reviewCase.id }}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {reviewCase.case_name}
                  </Link>
                </TableCell>
                <TableCell>{reviewCase.client_name}</TableCell>
                <TableCell>{reviewCase.status}</TableCell>
                <TableCell>{new Date(reviewCase.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {cases.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No cases yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </main>
  );
}

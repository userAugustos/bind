import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';

import type { CaseResponseType } from '@bind/api/review-cases';

import { Button } from '@repo/ui/shadcn/button';
import { apiCall, bindApi } from '@/api';

export const Route = createFileRoute('/cases/')({ component: CasesList });

function CasesList() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [caseName, setCaseName] = useState('');
  const [clientName, setClientName] = useState('');

  const casesQuery = useQuery({
    queryKey: ['cases'],
    queryFn: () => apiCall<CaseResponseType[]>(() => bindApi.cases.get()),
  });

  const createMutation = useMutation({
    mutationFn: (data: { case_name: string; client_name: string }) =>
      apiCall<CaseResponseType>(() => bindApi.cases.post(data)),
    onSuccess: async () => {
      setCaseName('');
      setClientName('');
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({ case_name: caseName, client_name: clientName });
  }

  const error = casesQuery.error ?? createMutation.error;

  return (
    <main className="p-4">
      <div className="mb-4 flex items-center gap-4">
        <h1 className="text-2xl font-bold">Review Cases</h1>
        <Button data-testid="new-case-button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'New Case'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 flex flex-wrap gap-2">
          <input
            data-testid="case-name-input"
            placeholder="Case name"
            value={caseName}
            onChange={(e) => setCaseName(e.target.value)}
            required
            className="border-input rounded-md border px-3 py-1.5 text-sm"
          />
          <input
            data-testid="client-name-input"
            placeholder="Client name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
            className="border-input rounded-md border px-3 py-1.5 text-sm"
          />
          <Button
            type="submit"
            data-testid="create-case-button"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </form>
      )}

      {error && <p className="text-destructive text-sm">{error.message}</p>}
      {casesQuery.isLoading && <p className="text-muted-foreground">Loading...</p>}

      {!casesQuery.isLoading && (
        <table data-testid="cases-list" className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-border border-b-2 px-3 py-1.5 text-left font-semibold">
                Case Name
              </th>
              <th className="border-border border-b-2 px-3 py-1.5 text-left font-semibold">
                Client Name
              </th>
              <th className="border-border border-b-2 px-3 py-1.5 text-left font-semibold">
                Status
              </th>
              <th className="border-border border-b-2 px-3 py-1.5 text-left font-semibold">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {(casesQuery.data ?? []).map((c) => (
              <tr
                key={c.id}
                data-testid={`case-row-${c.id}`}
                className="border-border cursor-pointer border-b"
              >
                <td className="px-3 py-1.5">
                  <Link
                    to="/cases/$caseId"
                    params={{ caseId: c.id }}
                    className="text-primary hover:underline"
                  >
                    {c.case_name}
                  </Link>
                </td>
                <td className="px-3 py-1.5">{c.client_name}</td>
                <td className="px-3 py-1.5">{c.status}</td>
                <td className="px-3 py-1.5">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {(casesQuery.data ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted-foreground px-3 py-1.5">
                  No cases yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </main>
  );
}

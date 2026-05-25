import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import type { CaseResponseType } from '@bind/api/review-cases';

import { Button } from '@repo/ui/shadcn/button';
import { apiCall, bindApi } from '@/api';

export const Route = createFileRoute('/cases/')({ component: CasesList });

function CasesList() {
  const [cases, setCases] = useState<CaseResponseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [caseName, setCaseName] = useState('');
  const [clientName, setClientName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function fetchCases() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall<CaseResponseType[]>(() => bindApi.cases.get());
      setCases(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchCases();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiCall<CaseResponseType>(() =>
        bindApi.cases.post({ case_name: caseName, client_name: clientName })
      );
      setCaseName('');
      setClientName('');
      setShowForm(false);
      await fetchCases();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create case');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <h1>Review Cases</h1>
        <Button data-testid="new-case-button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'New Case'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
        >
          <input
            data-testid="case-name-input"
            placeholder="Case name"
            value={caseName}
            onChange={(e) => setCaseName(e.target.value)}
            required
            style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <input
            data-testid="client-name-input"
            placeholder="Client name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
            style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <Button type="submit" data-testid="create-case-button" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create'}
          </Button>
        </form>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Loading...</p>}

      {!loading && (
        <table
          data-testid="cases-list"
          style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.9rem' }}
        >
          <thead>
            <tr>
              <th style={thStyle}>Case Name</th>
              <th style={thStyle}>Client Name</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Created</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr
                key={c.id}
                data-testid={`case-row-${c.id}`}
                style={{ cursor: 'pointer', borderBottom: '1px solid #eee' }}
              >
                <td style={tdStyle}>
                  <Link to="/cases/$caseId" params={{ caseId: c.id }} style={{ color: '#0070f3' }}>
                    {c.case_name}
                  </Link>
                </td>
                <td style={tdStyle}>{c.client_name}</td>
                <td style={tdStyle}>{c.status}</td>
                <td style={tdStyle}>{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr>
                <td colSpan={4} style={{ ...tdStyle, color: '#999' }}>
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

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.4rem 0.8rem',
  borderBottom: '2px solid #ccc',
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: '0.4rem 0.8rem',
};

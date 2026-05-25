import { beforeEach, describe, expect, test } from 'bun:test';

import { createApi } from './test.utils';

describe('documents', () => {
  const api = createApi();

  let caseId: string;

  beforeEach(async () => {
    const { data } = await api.cases.post({
      case_name: 'Doc Vault Test Case',
      client_name: 'Test Insured',
    });
    if (!data) throw new Error('setup: failed to create case');
    caseId = data.id;
  });

  test('POST /cases/:id/documents creates document, returns 201', async () => {
    const { data, error, status } = await api.cases({ case_id: caseId }).documents.post({
      file_name: 'policy.pdf',
      mime_type: 'application/pdf',
      document_type: 'current_policy',
    });
    expect(error).toBeNull();
    expect(status).toBe(201);
    expect(data?.id).toBeTruthy();
    expect(data?.case_id).toBe(caseId);
    expect(data?.file_name).toBe('policy.pdf');
    expect(data?.mime_type).toBe('application/pdf');
    expect(data?.document_type).toBe('current_policy');
    expect(data?.analysis_status).toBe('pending');
    expect(data?.created_at).toBeTruthy();
  });

  test('POST /cases/:id/documents rejects invalid document_type', async () => {
    const { status } = await api.cases({ case_id: caseId }).documents.post({
      file_name: 'file.pdf',
      mime_type: 'application/pdf',
      // @ts-expect-error intentionally invalid type
      document_type: 'invalid_type',
    });
    expect(status).toBe(422);
  });

  test('POST /cases/:id/documents returns 404 for non-existent case', async () => {
    const { status } = await api.cases({ case_id: 'no-such-case' }).documents.post({
      file_name: 'file.pdf',
      mime_type: 'application/pdf',
      document_type: 'other',
    });
    expect(status).toBe(404);
  });

  test('GET /cases/:id/documents returns 404 for non-existent case', async () => {
    const { status } = await api.cases({ case_id: 'non-existent-case' }).documents.get();
    expect(status).toBe(404);
  });

  test('GET /cases/:id/documents returns array for case', async () => {
    await api.cases({ case_id: caseId }).documents.post({
      file_name: 'loss_run.pdf',
      mime_type: 'application/pdf',
      document_type: 'loss_history',
    });
    const { data, error } = await api.cases({ case_id: caseId }).documents.get();
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data?.length).toBe(1);
    expect(data?.[0]?.file_name).toBe('loss_run.pdf');
  });

  test('GET /cases/:id/documents/:document_id returns specific document', async () => {
    const { data: created } = await api.cases({ case_id: caseId }).documents.post({
      file_name: 'contract.pdf',
      mime_type: 'application/pdf',
      document_type: 'contract_requirements',
    });
    if (!created) throw new Error('setup: failed to create document');

    const { data, error } = await api
      .cases({ case_id: caseId })
      .documents({ document_id: created.id })
      .get();
    expect(error).toBeNull();
    expect(data?.id).toBe(created.id);
    expect(data?.file_name).toBe('contract.pdf');
  });

  test('GET /cases/:id/documents/:document_id returns 404 for non-existent', async () => {
    const { status } = await api
      .cases({ case_id: caseId })
      .documents({ document_id: 'no-such-doc' })
      .get();
    expect(status).toBe(404);
  });

  test('GET /cases/wrong-case/documents/:document_id returns 404 for wrong case', async () => {
    const { data: created } = await api.cases({ case_id: caseId }).documents.post({
      file_name: 'contract.pdf',
      mime_type: 'application/pdf',
      document_type: 'contract_requirements',
    });
    if (!created) throw new Error('setup: failed to create document');

    const { status } = await api
      .cases({ case_id: 'wrong-case' })
      .documents({ document_id: created.id })
      .get();
    expect(status).toBe(404);
  });

  test('DELETE /cases/wrong-case/documents/:document_id returns 404 for wrong case', async () => {
    const { data: created } = await api.cases({ case_id: caseId }).documents.post({
      file_name: 'quote.pdf',
      mime_type: 'application/pdf',
      document_type: 'carrier_quote',
    });
    if (!created) throw new Error('setup: failed to create document');

    const { status } = await api
      .cases({ case_id: 'wrong-case' })
      .documents({ document_id: created.id })
      .delete();
    expect(status).toBe(404);
  });

  test('DELETE /cases/:id/documents/:document_id deletes, subsequent GET returns 404', async () => {
    const { data: created } = await api.cases({ case_id: caseId }).documents.post({
      file_name: 'quote.pdf',
      mime_type: 'application/pdf',
      document_type: 'carrier_quote',
    });
    if (!created) throw new Error('setup: failed to create document');

    const { status } = await api
      .cases({ case_id: caseId })
      .documents({ document_id: created.id })
      .delete();
    expect(status).toBe(204);

    const { status: getStatus } = await api
      .cases({ case_id: caseId })
      .documents({ document_id: created.id })
      .get();
    expect(getStatus).toBe(404);
  });
});

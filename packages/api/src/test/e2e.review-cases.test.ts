import { beforeEach, describe, expect, test } from 'bun:test';

import { createApi } from './test.utils';

describe('review cases', () => {
  const api = createApi();

  let createdCaseId: string;

  beforeEach(async () => {
    const { data } = await api.cases.post({
      case_name: 'Acme Corp GL Review',
      client_name: 'Acme Corporation',
    });
    if (!data) throw new Error('setup: failed to create case');
    createdCaseId = data.id;
  });

  test('POST /cases creates case with status=draft', async () => {
    const { data, error, status } = await api.cases.post({
      case_name: 'Test Case',
      client_name: 'Test Client',
    });
    expect(error).toBeNull();
    expect(status).toBe(201);
    expect(data?.status).toBe('draft');
    expect(data?.case_name).toBe('Test Case');
    expect(data?.client_name).toBe('Test Client');
    expect(data?.id).toBeTruthy();
    expect(data?.created_at).toBeTruthy();
    expect(data?.updated_at).toBeTruthy();
  });

  test('POST /cases rejects empty case_name', async () => {
    const { error, status } = await api.cases.post({
      case_name: '',
      client_name: 'Test Client',
    });
    expect(status).toBe(422);
    expect(error).not.toBeNull();
  });

  test('POST /cases rejects missing client_name', async () => {
    // @ts-expect-error intentionally testing missing field
    const { error, status } = await api.cases.post({ case_name: 'Valid Name' });
    expect(status).toBe(422);
    expect(error).not.toBeNull();
  });

  test('GET /cases returns array including created case', async () => {
    const { data, error } = await api.cases.get();
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    const found = data?.find((c) => c.id === createdCaseId);
    expect(found).toBeTruthy();
  });

  test('GET /cases/:id returns the specific case', async () => {
    const { data, error } = await api.cases({ case_id: createdCaseId }).get();
    expect(error).toBeNull();
    expect(data?.id).toBe(createdCaseId);
    expect(data?.case_name).toBe('Acme Corp GL Review');
  });

  test('GET /cases/:id returns 404 for non-existent id', async () => {
    const { status } = await api.cases({ case_id: 'non-existent-id' }).get();
    expect(status).toBe(404);
  });

  test('PATCH /cases/:id updates case_name', async () => {
    const { data, error, status } = await api.cases({ case_id: createdCaseId }).patch({
      case_name: 'Updated Name',
    });
    expect(error).toBeNull();
    expect(status).toBe(200);
    expect(data?.case_name).toBe('Updated Name');
    expect(data?.client_name).toBe('Acme Corporation');
  });

  test('PATCH /cases/:id rejects empty body', async () => {
    const { status } = await api.cases({ case_id: createdCaseId }).patch({});
    expect(status).toBe(422);
  });

  test('POST /cases/:id/transition draft + submit → in_review', async () => {
    const { data, error, status } = await api
      .cases({ case_id: createdCaseId })
      .transition.post({ event: 'submit' });
    expect(error).toBeNull();
    expect(status).toBe(200);
    expect(data?.status).toBe('in_review');
  });

  test('POST /cases/:id/transition in_review + complete → completed', async () => {
    await api.cases({ case_id: createdCaseId }).transition.post({ event: 'submit' });
    const { data, status } = await api
      .cases({ case_id: createdCaseId })
      .transition.post({ event: 'complete' });
    expect(status).toBe(200);
    expect(data?.status).toBe('completed');
  });

  test('POST /cases/:id/transition draft + cancel → cancelled', async () => {
    const { data, status } = await api
      .cases({ case_id: createdCaseId })
      .transition.post({ event: 'cancel' });
    expect(status).toBe(200);
    expect(data?.status).toBe('cancelled');
  });

  test('POST /cases/:id/transition completed + submit → 400 invalid transition', async () => {
    await api.cases({ case_id: createdCaseId }).transition.post({ event: 'submit' });
    await api.cases({ case_id: createdCaseId }).transition.post({ event: 'complete' });
    const { status } = await api
      .cases({ case_id: createdCaseId })
      .transition.post({ event: 'submit' });
    expect(status).toBe(400);
  });

  test('DELETE /cases/:id returns 404 for non-existent id', async () => {
    const { status } = await api.cases({ case_id: 'non-existent-id' }).delete();
    expect(status).toBe(404);
  });

  test('DELETE /cases/:id deletes case, subsequent GET returns 404', async () => {
    const { status } = await api.cases({ case_id: createdCaseId }).delete();
    expect(status).toBe(204);
    const { status: getStatus } = await api.cases({ case_id: createdCaseId }).get();
    expect(getStatus).toBe(404);
  });

  test('DELETE /cases/:id returns 409 when case has documents', async () => {
    await api.cases({ case_id: createdCaseId }).documents.post({
      file_name: 'policy.pdf',
      mime_type: 'application/pdf',
      document_type: 'current_policy',
    });
    const { status } = await api.cases({ case_id: createdCaseId }).delete();
    expect(status).toBe(409);
  });
});

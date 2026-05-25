import { beforeEach, describe, expect, test } from 'bun:test';

import { createApi } from './test.utils';

describe('analysis', () => {
  const api = createApi();

  let caseId: string;
  let documentId: string;

  beforeEach(async () => {
    const { data: caseData } = await api.cases.post({
      case_name: 'Analysis Test Case',
      client_name: 'Test Client',
    });
    if (!caseData) throw new Error('setup: failed to create case');
    caseId = caseData.id;

    const { data: docData } = await api.cases({ case_id: caseId }).documents.post({
      file_name: 'contract.pdf',
      mime_type: 'application/pdf',
      document_type: 'contract_requirements',
    });
    if (!docData) throw new Error('setup: failed to create document');
    documentId = docData.id;
  });

  test('POST /analyze triggers analysis and returns completed result', async () => {
    const { data, status } = await api
      .cases({ case_id: caseId })
      .documents({ document_id: documentId })
      .analyze.post({} as never);

    expect(status).toBe(201);
    expect(data?.status).toBe('completed');
    expect(data?.document_id).toBe(documentId);
    expect(data?.document_type).toBe('contract_requirements');
    expect(data?.id).toBeTruthy();
    expect(data?.result).toBeTruthy();
    expect(data?.error).toBeNull();
    expect(data?.model_provider).toBe('mock');
    expect(data?.schema_version).toBe('1.0.0');
    expect(data?.created_at).toBeTruthy();
  });

  test('POST /analyze updates document analysis_status to completed', async () => {
    await api
      .cases({ case_id: caseId })
      .documents({ document_id: documentId })
      .analyze.post({} as never);

    const { data: doc } = await api
      .cases({ case_id: caseId })
      .documents({ document_id: documentId })
      .get();

    expect(doc?.analysis_status).toBe('completed');
  });

  test('POST /analyze returns 404 for wrong case', async () => {
    const { status } = await api
      .cases({ case_id: 'wrong-case' })
      .documents({ document_id: documentId })
      .analyze.post({} as never);

    expect(status).toBe(404);
  });

  test('POST /analyze returns 404 for non-existent document', async () => {
    const { status } = await api
      .cases({ case_id: caseId })
      .documents({ document_id: 'no-such-doc' })
      .analyze.post({} as never);

    expect(status).toBe(404);
  });

  test('POST /analyze on already-completed document returns 400', async () => {
    await api
      .cases({ case_id: caseId })
      .documents({ document_id: documentId })
      .analyze.post({} as never);

    const { status } = await api
      .cases({ case_id: caseId })
      .documents({ document_id: documentId })
      .analyze.post({} as never);

    expect(status).toBe(400);
  });

  test('GET /analysis returns latest analysis', async () => {
    await api
      .cases({ case_id: caseId })
      .documents({ document_id: documentId })
      .analyze.post({} as never);

    const { data, status } = await api
      .cases({ case_id: caseId })
      .documents({ document_id: documentId })
      .analysis.get();

    expect(status).toBe(200);
    expect(data?.status).toBe('completed');
    expect(data?.document_type).toBe('contract_requirements');
  });

  test('GET /analysis returns 404 when no analysis exists', async () => {
    const { status } = await api
      .cases({ case_id: caseId })
      .documents({ document_id: documentId })
      .analysis.get();

    expect(status).toBe(404);
  });

  test('GET /analysis/history returns all analyses', async () => {
    await api
      .cases({ case_id: caseId })
      .documents({ document_id: documentId })
      .analyze.post({} as never);

    const { data, status } = await api
      .cases({ case_id: caseId })
      .documents({ document_id: documentId })
      .analysis.history.get();

    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data?.length).toBe(1);
  });

  test('analysis works for carrier_quote document type', async () => {
    const { data: quoteDoc } = await api.cases({ case_id: caseId }).documents.post({
      file_name: 'carrier-b-quote.pdf',
      mime_type: 'application/pdf',
      document_type: 'carrier_quote',
    });
    if (!quoteDoc) throw new Error('setup failed');

    const { data } = await api
      .cases({ case_id: caseId })
      .documents({ document_id: quoteDoc.id })
      .analyze.post({} as never);

    expect(data?.status).toBe('completed');
    expect(data?.document_type).toBe('carrier_quote');
  });

  test('analysis works for loss_history document type', async () => {
    const { data: lossDoc } = await api.cases({ case_id: caseId }).documents.post({
      file_name: 'loss-history.pdf',
      mime_type: 'application/pdf',
      document_type: 'loss_history',
    });
    if (!lossDoc) throw new Error('setup failed');

    const { data } = await api
      .cases({ case_id: caseId })
      .documents({ document_id: lossDoc.id })
      .analyze.post({} as never);

    expect(data?.status).toBe('completed');
    expect(data?.document_type).toBe('loss_history');
  });
});

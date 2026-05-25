import { beforeEach, describe, expect, test } from 'bun:test';

import { createApi } from './test.utils';

describe('policy-check', () => {
  const api = createApi();

  let caseId: string;
  let requirementsDocId: string;
  let carrierQuoteDocId: string;
  let currentPolicyDocId: string;
  let lossHistoryDocId: string;

  beforeEach(async () => {
    const { data: caseData } = await api.cases.post({
      case_name: 'Policy Check Test Case',
      client_name: 'Northstar Logistics',
    });
    if (!caseData) throw new Error('setup: failed to create case');
    caseId = caseData.id;

    const { data: reqDoc } = await api.cases({ case_id: caseId }).documents.post({
      file_name: 'contract-requirements.pdf',
      mime_type: 'application/pdf',
      document_type: 'contract_requirements',
    });
    if (!reqDoc) throw new Error('setup: failed to create requirements doc');
    requirementsDocId = reqDoc.id;

    const { data: quoteDoc } = await api.cases({ case_id: caseId }).documents.post({
      file_name: 'carrier-b-quote.pdf',
      mime_type: 'application/pdf',
      document_type: 'carrier_quote',
    });
    if (!quoteDoc) throw new Error('setup: failed to create quote doc');
    carrierQuoteDocId = quoteDoc.id;

    const { data: policyDoc } = await api.cases({ case_id: caseId }).documents.post({
      file_name: 'current-policy.pdf',
      mime_type: 'application/pdf',
      document_type: 'current_policy',
    });
    if (!policyDoc) throw new Error('setup: failed to create policy doc');
    currentPolicyDocId = policyDoc.id;

    const { data: lossDoc } = await api.cases({ case_id: caseId }).documents.post({
      file_name: 'loss-history.pdf',
      mime_type: 'application/pdf',
      document_type: 'loss_history',
    });
    if (!lossDoc) throw new Error('setup: failed to create loss history doc');
    lossHistoryDocId = lossDoc.id;

    await api
      .cases({ case_id: caseId })
      .documents({ document_id: requirementsDocId })
      .analyze.post({} as never);
    await api
      .cases({ case_id: caseId })
      .documents({ document_id: carrierQuoteDocId })
      .analyze.post({} as never);
    await api
      .cases({ case_id: caseId })
      .documents({ document_id: currentPolicyDocId })
      .analyze.post({} as never);
  });

  test('POST policy-check with Carrier B quote returns all OK', async () => {
    const { data, status } = await api.cases({ case_id: caseId })['policy-check'].post({
      requirements_document_id: requirementsDocId,
      target_document_id: carrierQuoteDocId,
    });

    expect(status).toBe(201);
    expect(data?.id).toBeTruthy();
    expect(data?.case_id).toBe(caseId);
    expect(data?.requirements_document_id).toBe(requirementsDocId);
    expect(data?.target_document_id).toBe(carrierQuoteDocId);
    expect(data?.target_document_type).toBe('carrier_quote');
    expect(data?.results?.length).toBe(5);
    expect(data?.summary_counts).toEqual({
      ok: 5,
      gap: 0,
      missing: 0,
      review: 0,
      not_applicable: 0,
    });
    expect(data?.created_at).toBeTruthy();
  });

  test('POST policy-check with current policy returns gaps and missing', async () => {
    const { data, status } = await api.cases({ case_id: caseId })['policy-check'].post({
      requirements_document_id: requirementsDocId,
      target_document_id: currentPolicyDocId,
    });

    expect(status).toBe(201);
    expect(data?.summary_counts).toEqual({
      ok: 1,
      gap: 2,
      missing: 2,
      review: 0,
      not_applicable: 0,
    });

    const results = data?.results ?? [];
    const cgl = results.find((r) => r.check_id === 'cgl_limit');
    expect(cgl?.verdict).toBe('gap');
    expect(cgl?.severity).toBe('blocking');

    const auto = results.find((r) => r.check_id === 'auto_limit');
    expect(auto?.verdict).toBe('gap');

    const cyber = results.find((r) => r.check_id === 'cyber_coverage');
    expect(cyber?.verdict).toBe('missing');

    const ai = results.find((r) => r.check_id === 'additional_insured');
    expect(ai?.verdict).toBe('ok');

    const waiver = results.find((r) => r.check_id === 'waiver_primary');
    expect(waiver?.verdict).toBe('missing');
  });

  test('POST policy-check returns 404 for non-existent case', async () => {
    const { status } = await api.cases({ case_id: 'no-such-case' })['policy-check'].post({
      requirements_document_id: requirementsDocId,
      target_document_id: carrierQuoteDocId,
    });

    expect(status).toBe(404);
  });

  test('POST policy-check returns 400 for wrong target document type', async () => {
    await api
      .cases({ case_id: caseId })
      .documents({ document_id: lossHistoryDocId })
      .analyze.post({} as never);

    const { status } = await api.cases({ case_id: caseId })['policy-check'].post({
      requirements_document_id: requirementsDocId,
      target_document_id: lossHistoryDocId,
    });

    expect(status).toBe(400);
  });

  test('POST policy-check returns 400 if target has no completed analysis', async () => {
    const { data: noAnalysisDoc } = await api.cases({ case_id: caseId }).documents.post({
      file_name: 'unanalyzed.pdf',
      mime_type: 'application/pdf',
      document_type: 'carrier_quote',
    });
    if (!noAnalysisDoc) throw new Error('setup failed');

    const { status } = await api.cases({ case_id: caseId })['policy-check'].post({
      requirements_document_id: requirementsDocId,
      target_document_id: noAnalysisDoc.id,
    });

    expect(status).toBe(400);
  });

  test('GET policy-check returns latest result', async () => {
    await api.cases({ case_id: caseId })['policy-check'].post({
      requirements_document_id: requirementsDocId,
      target_document_id: carrierQuoteDocId,
    });

    const { data, status } = await api.cases({ case_id: caseId })['policy-check'].get();

    expect(status).toBe(200);
    expect(data?.target_document_id).toBe(carrierQuoteDocId);
    expect(data?.summary_counts?.ok).toBe(5);
  });

  test('GET policy-check returns 404 when no results exist', async () => {
    const { status } = await api.cases({ case_id: caseId })['policy-check'].get();

    expect(status).toBe(404);
  });

  test('GET policy-check with target_document_id filters correctly', async () => {
    await api.cases({ case_id: caseId })['policy-check'].post({
      requirements_document_id: requirementsDocId,
      target_document_id: carrierQuoteDocId,
    });
    await api.cases({ case_id: caseId })['policy-check'].post({
      requirements_document_id: requirementsDocId,
      target_document_id: currentPolicyDocId,
    });

    const { data, status } = await api
      .cases({ case_id: caseId })
      ['policy-check'].get({ query: { target_document_id: currentPolicyDocId } });

    expect(status).toBe(200);
    expect(data?.target_document_id).toBe(currentPolicyDocId);
  });

  test('GET policy-check/history returns all runs', async () => {
    await api.cases({ case_id: caseId })['policy-check'].post({
      requirements_document_id: requirementsDocId,
      target_document_id: carrierQuoteDocId,
    });
    await api.cases({ case_id: caseId })['policy-check'].post({
      requirements_document_id: requirementsDocId,
      target_document_id: currentPolicyDocId,
    });

    const { data, status } = await api.cases({ case_id: caseId })['policy-check'].history.get();

    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data?.length).toBe(2);
  });
});

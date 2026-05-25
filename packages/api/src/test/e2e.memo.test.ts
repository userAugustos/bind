import { beforeEach, describe, expect, test } from 'bun:test';

import { createApi } from './test.utils';

describe('memo', () => {
  const api = createApi();

  let caseId: string;
  let requirementsDocId: string;
  let carrierQuoteDocId: string;
  let currentPolicyDocId: string;

  beforeEach(async () => {
    const { data: caseData } = await api.cases.post({
      case_name: 'Memo Test Case',
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

    await api.cases({ case_id: caseId })['policy-check'].post({
      requirements_document_id: requirementsDocId,
      target_document_id: carrierQuoteDocId,
    });
    await api.cases({ case_id: caseId })['policy-check'].post({
      requirements_document_id: requirementsDocId,
      target_document_id: currentPolicyDocId,
    });

    await api.cases({ case_id: caseId })['quote-comparison'].post({
      requirements_document_id: requirementsDocId,
      target_document_ids: [carrierQuoteDocId, currentPolicyDocId],
    });
  });

  test('POST memo generates a completed memo with all sections', async () => {
    const { data, status } = await api.cases({ case_id: caseId }).memo.post({} as never);

    expect(status).toBe(201);
    expect(data?.id).toBeTruthy();
    expect(data?.case_id).toBe(caseId);
    expect(data?.status).toBe('completed');
    expect(data?.model_provider).toBe('mock');
    expect(data?.model_name).toBe('mock-v1');
    expect(data?.error).toBeNull();
    expect(data?.created_at).toBeTruthy();

    const content = data?.content;
    expect(content).toBeTruthy();
    expect(content?.executive_summary).toContain('Northstar Logistics');
    expect(content?.coverage_gaps).toContain('Carrier A');
    expect(content?.quote_comparison).toContain('$45,800');
    expect(content?.recommendation).toContain('Carrier B');
    expect(content?.next_steps?.length).toBeGreaterThanOrEqual(3);
  });

  test('GET memo returns the latest generated memo', async () => {
    await api.cases({ case_id: caseId }).memo.post({} as never);

    const { data, status } = await api.cases({ case_id: caseId }).memo.get();

    expect(status).toBe(200);
    expect(data?.status).toBe('completed');
    expect(data?.content?.executive_summary).toContain('Northstar');
  });

  test('GET memo returns 404 when no memo exists', async () => {
    const { status } = await api.cases({ case_id: caseId }).memo.get();
    expect(status).toBe(404);
  });

  test('POST memo returns 404 for non-existent case', async () => {
    const { status } = await api.cases({ case_id: 'no-such-case' }).memo.post({} as never);
    expect(status).toBe(404);
  });

  test('POST memo returns 400 when no quote comparison exists', async () => {
    const { data: freshCase } = await api.cases.post({
      case_name: 'Empty Case',
      client_name: 'No Data',
    });
    if (!freshCase) throw new Error('setup failed');

    const { status } = await api.cases({ case_id: freshCase.id }).memo.post({} as never);
    expect(status).toBe(400);
  });

  test('POST memo can be called multiple times (regenerate)', async () => {
    await api.cases({ case_id: caseId }).memo.post({} as never);
    const { data: secondMemo, status } = await api
      .cases({ case_id: caseId })
      .memo.post({} as never);

    expect(status).toBe(201);
    expect(secondMemo?.id).toBeTruthy();
    expect(secondMemo?.status).toBe('completed');
  });

  test('GET memo returns the most recent memo after regeneration', async () => {
    const { data: first } = await api.cases({ case_id: caseId }).memo.post({} as never);
    const { data: second } = await api.cases({ case_id: caseId }).memo.post({} as never);

    const { data: latest } = await api.cases({ case_id: caseId }).memo.get();

    expect(latest?.id).toBe(second?.id);
    expect(latest?.id).not.toBe(first?.id);
  });

  test('Memo content sections contain substantive text', async () => {
    const { data } = await api.cases({ case_id: caseId }).memo.post({} as never);
    const content = data?.content;

    expect(content?.executive_summary.length).toBeGreaterThan(100);
    expect(content?.coverage_gaps.length).toBeGreaterThan(100);
    expect(content?.quote_comparison.length).toBeGreaterThan(100);
    expect(content?.recommendation.length).toBeGreaterThan(100);
    expect(content?.next_steps.every((step) => step.length > 10)).toBe(true);
  });
});

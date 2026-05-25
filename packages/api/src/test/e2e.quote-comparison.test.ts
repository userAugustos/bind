import { beforeEach, describe, expect, test } from 'bun:test';

import { createApi } from './test.utils';

describe('quote-comparison', () => {
  const api = createApi();

  let caseId: string;
  let requirementsDocId: string;
  let carrierQuoteDocId: string;
  let currentPolicyDocId: string;

  beforeEach(async () => {
    const { data: caseData } = await api.cases.post({
      case_name: 'Quote Comparison Test Case',
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
  });

  test('POST quote-comparison returns structured comparison with recommendation', async () => {
    const { data, status } = await api.cases({ case_id: caseId })['quote-comparison'].post({
      requirements_document_id: requirementsDocId,
      target_document_ids: [carrierQuoteDocId, currentPolicyDocId],
    });

    expect(status).toBe(201);
    expect(data?.id).toBeTruthy();
    expect(data?.case_id).toBe(caseId);
    expect(data?.requirements_document_id).toBe(requirementsDocId);
    expect(data?.target_document_ids).toEqual([carrierQuoteDocId, currentPolicyDocId]);
    expect(data?.result?.options?.length).toBe(2);
    expect(data?.created_at).toBeTruthy();
  });

  test('Carrier B option summary is correct', async () => {
    const { data } = await api.cases({ case_id: caseId })['quote-comparison'].post({
      requirements_document_id: requirementsDocId,
      target_document_ids: [carrierQuoteDocId, currentPolicyDocId],
    });

    const carrierB = data?.result?.options?.find((o) => o.target_document_id === carrierQuoteDocId);
    expect(carrierB).toBeTruthy();
    expect(carrierB?.carrier_name).toBe('Carrier B');
    expect(carrierB?.premium).toBe(45800);
    expect(carrierB?.meets_core_requirements).toBe(true);
    expect(carrierB?.policy_check_summary).toEqual({
      ok: 5,
      gap: 0,
      missing: 0,
      review: 0,
      not_applicable: 0,
    });
    expect(carrierB?.strengths?.length).toBe(5);
    expect(carrierB?.risks?.length).toBe(0);
    expect(carrierB?.missing_requirements?.length).toBe(0);
  });

  test('Current policy option summary is correct', async () => {
    const { data } = await api.cases({ case_id: caseId })['quote-comparison'].post({
      requirements_document_id: requirementsDocId,
      target_document_ids: [carrierQuoteDocId, currentPolicyDocId],
    });

    const currentPolicy = data?.result?.options?.find(
      (o) => o.target_document_id === currentPolicyDocId
    );
    expect(currentPolicy).toBeTruthy();
    expect(currentPolicy?.carrier_name).toBe('Carrier A');
    expect(currentPolicy?.premium).toBeNull();
    expect(currentPolicy?.meets_core_requirements).toBe(false);
    expect(currentPolicy?.policy_check_summary).toEqual({
      ok: 1,
      gap: 2,
      missing: 2,
      review: 0,
      not_applicable: 0,
    });
    expect(currentPolicy?.risks?.length).toBe(2);
    expect(currentPolicy?.missing_requirements?.length).toBe(2);
  });

  test('Recommendation is Carrier B', async () => {
    const { data } = await api.cases({ case_id: caseId })['quote-comparison'].post({
      requirements_document_id: requirementsDocId,
      target_document_ids: [carrierQuoteDocId, currentPolicyDocId],
    });

    const rec = data?.result?.recommendation;
    expect(rec?.recommended_document_id).toBe(carrierQuoteDocId);
    expect(rec?.reason).toBe('meets_all_requirements_only_option');
    expect(rec?.explanation).toContain('Carrier B');
  });

  test('POST returns 404 for non-existent case', async () => {
    const { status } = await api.cases({ case_id: 'no-such-case' })['quote-comparison'].post({
      requirements_document_id: requirementsDocId,
      target_document_ids: [carrierQuoteDocId, currentPolicyDocId],
    });

    expect(status).toBe(404);
  });

  test('POST returns 422 with fewer than 2 targets', async () => {
    const { status } = await api.cases({ case_id: caseId })['quote-comparison'].post({
      requirements_document_id: requirementsDocId,
      target_document_ids: [carrierQuoteDocId],
    } as never);

    expect(status).toBe(422);
  });

  test('POST returns 400 if policy check not run for a target', async () => {
    const { data: newQuoteDoc } = await api.cases({ case_id: caseId }).documents.post({
      file_name: 'carrier-c-quote.pdf',
      mime_type: 'application/pdf',
      document_type: 'carrier_quote',
    });
    if (!newQuoteDoc) throw new Error('setup failed');

    await api
      .cases({ case_id: caseId })
      .documents({ document_id: newQuoteDoc.id })
      .analyze.post({} as never);

    const { status } = await api.cases({ case_id: caseId })['quote-comparison'].post({
      requirements_document_id: requirementsDocId,
      target_document_ids: [carrierQuoteDocId, newQuoteDoc.id],
    });

    expect(status).toBe(400);
  });

  test('GET quote-comparison returns latest result', async () => {
    await api.cases({ case_id: caseId })['quote-comparison'].post({
      requirements_document_id: requirementsDocId,
      target_document_ids: [carrierQuoteDocId, currentPolicyDocId],
    });

    const { data, status } = await api.cases({ case_id: caseId })['quote-comparison'].get();

    expect(status).toBe(200);
    expect(data?.result?.options?.length).toBe(2);
    expect(data?.result?.recommendation?.recommended_document_id).toBe(carrierQuoteDocId);
  });

  test('GET quote-comparison returns 404 when no results exist', async () => {
    const { status } = await api.cases({ case_id: caseId })['quote-comparison'].get();
    expect(status).toBe(404);
  });

  test('GET quote-comparison/history returns all runs', async () => {
    await api.cases({ case_id: caseId })['quote-comparison'].post({
      requirements_document_id: requirementsDocId,
      target_document_ids: [carrierQuoteDocId, currentPolicyDocId],
    });
    await api.cases({ case_id: caseId })['quote-comparison'].post({
      requirements_document_id: requirementsDocId,
      target_document_ids: [carrierQuoteDocId, currentPolicyDocId],
    });

    const { data, status } = await api.cases({ case_id: caseId })['quote-comparison'].history.get();

    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data?.length).toBe(2);
  });
});

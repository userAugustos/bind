import { and, desc, eq } from 'drizzle-orm';

import { db } from '@api/db/client';
import { policyCheckResults } from '@api/db/schema';

export interface PolicyCheckRow {
  id: string;
  case_id: string;
  requirements_document_id: string;
  target_document_id: string;
  target_document_type: string;
  results: string;
  summary_counts: string;
  created_at: string;
}

type InsertPolicyCheck = {
  case_id: string;
  requirements_document_id: string;
  target_document_id: string;
  target_document_type: string;
  results: string;
  summary_counts: string;
};

const toRow = (row: typeof policyCheckResults.$inferSelect): PolicyCheckRow => ({
  id: row.id,
  case_id: row.caseId,
  requirements_document_id: row.requirementsDocumentId,
  target_document_id: row.targetDocumentId,
  target_document_type: row.targetDocumentType,
  results: row.results,
  summary_counts: row.summaryCounts,
  created_at: row.createdAt,
});

export const policyCheckRepository = {
  async create(data: InsertPolicyCheck): Promise<PolicyCheckRow> {
    const rows = await db
      .insert(policyCheckResults)
      .values({
        caseId: data.case_id,
        requirementsDocumentId: data.requirements_document_id,
        targetDocumentId: data.target_document_id,
        targetDocumentType: data.target_document_type,
        results: data.results,
        summaryCounts: data.summary_counts,
      })
      .returning();
    return toRow(rows[0]!);
  },

  async findLatestByCaseId(
    caseId: string,
    targetDocumentId?: string
  ): Promise<PolicyCheckRow | null> {
    const conditions = [eq(policyCheckResults.caseId, caseId)];
    if (targetDocumentId) {
      conditions.push(eq(policyCheckResults.targetDocumentId, targetDocumentId));
    }

    const rows = await db
      .select()
      .from(policyCheckResults)
      .where(and(...conditions))
      .orderBy(desc(policyCheckResults.createdAt))
      .limit(1);
    return rows[0] ? toRow(rows[0]) : null;
  },

  async findAllByCaseId(caseId: string, targetDocumentId?: string): Promise<PolicyCheckRow[]> {
    const conditions = [eq(policyCheckResults.caseId, caseId)];
    if (targetDocumentId) {
      conditions.push(eq(policyCheckResults.targetDocumentId, targetDocumentId));
    }

    const rows = await db
      .select()
      .from(policyCheckResults)
      .where(and(...conditions))
      .orderBy(desc(policyCheckResults.createdAt));
    return rows.map(toRow);
  },
};

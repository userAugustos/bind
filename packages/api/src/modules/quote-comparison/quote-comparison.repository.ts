import { desc, eq } from 'drizzle-orm';

import { db } from '@api/db/client';
import { quoteComparisons } from '@api/db/schema';

export interface QuoteComparisonRow {
  id: string;
  case_id: string;
  requirements_document_id: string;
  target_document_ids: string;
  result: string;
  created_at: string;
}

type InsertQuoteComparison = {
  case_id: string;
  requirements_document_id: string;
  target_document_ids: string;
  result: string;
};

const toRow = (row: typeof quoteComparisons.$inferSelect): QuoteComparisonRow => ({
  id: row.id,
  case_id: row.caseId,
  requirements_document_id: row.requirementsDocumentId,
  target_document_ids: row.targetDocumentIds,
  result: row.result,
  created_at: row.createdAt,
});

export const quoteComparisonRepository = {
  async create(data: InsertQuoteComparison): Promise<QuoteComparisonRow> {
    const rows = await db
      .insert(quoteComparisons)
      .values({
        caseId: data.case_id,
        requirementsDocumentId: data.requirements_document_id,
        targetDocumentIds: data.target_document_ids,
        result: data.result,
      })
      .returning();
    return toRow(rows[0]!);
  },

  async findLatestByCaseId(caseId: string): Promise<QuoteComparisonRow | null> {
    const rows = await db
      .select()
      .from(quoteComparisons)
      .where(eq(quoteComparisons.caseId, caseId))
      .orderBy(desc(quoteComparisons.createdAt))
      .limit(1);
    return rows[0] ? toRow(rows[0]) : null;
  },

  async findAllByCaseId(caseId: string): Promise<QuoteComparisonRow[]> {
    const rows = await db
      .select()
      .from(quoteComparisons)
      .where(eq(quoteComparisons.caseId, caseId))
      .orderBy(desc(quoteComparisons.createdAt));
    return rows.map(toRow);
  },
};

import { desc, eq } from 'drizzle-orm';

import { db } from '@api/db/client';
import { proposalMemos } from '@api/db/schema';

export interface MemoRow {
  id: string;
  case_id: string;
  status: string;
  content: string;
  error: string | null;
  model_provider: string;
  model_name: string;
  created_at: string;
}

type InsertMemo = {
  case_id: string;
  status: string;
  content: string;
  error?: string | null;
  model_provider: string;
  model_name: string;
};

const toRow = (row: typeof proposalMemos.$inferSelect): MemoRow => ({
  id: row.id,
  case_id: row.caseId,
  status: row.status,
  content: row.content,
  error: row.error,
  model_provider: row.modelProvider,
  model_name: row.modelName,
  created_at: row.createdAt,
});

export const memoRepository = {
  async create(data: InsertMemo): Promise<MemoRow> {
    const rows = await db
      .insert(proposalMemos)
      .values({
        caseId: data.case_id,
        status: data.status,
        content: data.content,
        error: data.error ?? null,
        modelProvider: data.model_provider,
        modelName: data.model_name,
      })
      .returning();
    return toRow(rows[0]!);
  },

  async findLatestByCaseId(caseId: string): Promise<MemoRow | null> {
    const rows = await db
      .select()
      .from(proposalMemos)
      .where(eq(proposalMemos.caseId, caseId))
      .orderBy(desc(proposalMemos.createdAt))
      .limit(1);
    return rows[0] ? toRow(rows[0]) : null;
  },

  async findAllByCaseId(caseId: string): Promise<MemoRow[]> {
    const rows = await db
      .select()
      .from(proposalMemos)
      .where(eq(proposalMemos.caseId, caseId))
      .orderBy(desc(proposalMemos.createdAt));
    return rows.map(toRow);
  },
};

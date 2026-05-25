import { count, eq } from 'drizzle-orm';

import { db } from '@api/db/client';
import { documents } from '@api/db/schema';

import type { DocumentResponseType } from './documents.schemas';

type InsertDocument = {
  case_id: string;
  file_name: string;
  mime_type: string;
  document_type: string;
};

const toResponse = (row: typeof documents.$inferSelect): DocumentResponseType => ({
  id: row.id,
  case_id: row.caseId,
  file_name: row.fileName,
  mime_type: row.mimeType,
  document_type: row.documentType,
  analysis_status: row.analysisStatus,
  created_at: row.createdAt,
});

export const documentsRepository = {
  async create(data: InsertDocument): Promise<DocumentResponseType> {
    const rows = await db
      .insert(documents)
      .values({
        caseId: data.case_id,
        fileName: data.file_name,
        mimeType: data.mime_type,
        documentType: data.document_type,
      })
      .returning();
    return toResponse(rows[0]!);
  },

  async findByCaseId(caseId: string): Promise<DocumentResponseType[]> {
    const rows = await db.select().from(documents).where(eq(documents.caseId, caseId));
    return rows.map(toResponse);
  },

  async findById(id: string): Promise<DocumentResponseType | null> {
    const rows = await db.select().from(documents).where(eq(documents.id, id));
    return rows[0] ? toResponse(rows[0]) : null;
  },

  async deleteById(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  },

  async countByCaseId(caseId: string): Promise<number> {
    const rows = await db
      .select({ total: count() })
      .from(documents)
      .where(eq(documents.caseId, caseId));
    return rows[0]?.total ?? 0;
  },

  async updateAnalysisStatus(id: string, status: string): Promise<void> {
    await db.update(documents).set({ analysisStatus: status }).where(eq(documents.id, id));
  },
};

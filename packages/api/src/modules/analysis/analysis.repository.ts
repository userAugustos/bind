import { desc, eq } from 'drizzle-orm';

import { db } from '@api/db/client';
import { documentAnalyses } from '@api/db/schema';

export interface AnalysisRow {
  id: string;
  document_id: string;
  document_type: string;
  status: string;
  result: string;
  error: string | null;
  prompt_name: string;
  prompt_version: string;
  schema_version: string;
  model_provider: string;
  model_name: string;
  created_at: string;
}

type InsertAnalysis = {
  document_id: string;
  document_type: string;
  status: string;
  result: string;
  error?: string | null;
  prompt_name: string;
  prompt_version: string;
  schema_version: string;
  model_provider: string;
  model_name: string;
};

const toRow = (row: typeof documentAnalyses.$inferSelect): AnalysisRow => ({
  id: row.id,
  document_id: row.documentId,
  document_type: row.documentType,
  status: row.status,
  result: row.result,
  error: row.error,
  prompt_name: row.promptName,
  prompt_version: row.promptVersion,
  schema_version: row.schemaVersion,
  model_provider: row.modelProvider,
  model_name: row.modelName,
  created_at: row.createdAt,
});

export const analysisRepository = {
  async create(data: InsertAnalysis): Promise<AnalysisRow> {
    const rows = await db
      .insert(documentAnalyses)
      .values({
        documentId: data.document_id,
        documentType: data.document_type,
        status: data.status,
        result: data.result,
        error: data.error ?? null,
        promptName: data.prompt_name,
        promptVersion: data.prompt_version,
        schemaVersion: data.schema_version,
        modelProvider: data.model_provider,
        modelName: data.model_name,
      })
      .returning();
    return toRow(rows[0]!);
  },

  async findByDocumentId(documentId: string): Promise<AnalysisRow[]> {
    const rows = await db
      .select()
      .from(documentAnalyses)
      .where(eq(documentAnalyses.documentId, documentId))
      .orderBy(desc(documentAnalyses.createdAt));
    return rows.map(toRow);
  },

  async findLatestByDocumentId(documentId: string): Promise<AnalysisRow | null> {
    const rows = await db
      .select()
      .from(documentAnalyses)
      .where(eq(documentAnalyses.documentId, documentId))
      .orderBy(desc(documentAnalyses.createdAt))
      .limit(1);
    return rows[0] ? toRow(rows[0]) : null;
  },
};

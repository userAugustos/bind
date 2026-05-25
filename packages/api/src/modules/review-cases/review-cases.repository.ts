import { desc, eq } from 'drizzle-orm';

import { db } from '@api/db/client';
import { reviewCases } from '@api/db/schema';

import type { CaseResponseType, CaseStatus } from './review-cases.schemas';

type InsertCase = {
  case_name: string;
  client_name: string;
};

type UpdateCase = {
  case_name?: string;
  client_name?: string;
  status?: CaseStatus;
  updated_at: string;
};

const toResponse = (row: typeof reviewCases.$inferSelect): CaseResponseType => ({
  id: row.id,
  case_name: row.caseName,
  client_name: row.clientName,
  status: row.status as CaseStatus,
  created_at: row.createdAt,
  updated_at: row.updatedAt,
});

export const reviewCasesRepository = {
  async create(data: InsertCase): Promise<CaseResponseType> {
    const rows = await db
      .insert(reviewCases)
      .values({ caseName: data.case_name, clientName: data.client_name })
      .returning();
    return toResponse(rows[0]!);
  },

  async findAll(): Promise<CaseResponseType[]> {
    const rows = await db.select().from(reviewCases).orderBy(desc(reviewCases.createdAt));
    return rows.map(toResponse);
  },

  async findById(id: string): Promise<CaseResponseType | null> {
    const rows = await db.select().from(reviewCases).where(eq(reviewCases.id, id));
    return rows[0] ? toResponse(rows[0]) : null;
  },

  async update(id: string, data: UpdateCase): Promise<CaseResponseType | null> {
    const rows = await db
      .update(reviewCases)
      .set({
        ...(data.case_name !== undefined && { caseName: data.case_name }),
        ...(data.client_name !== undefined && { clientName: data.client_name }),
        ...(data.status !== undefined && { status: data.status }),
        updatedAt: data.updated_at,
      })
      .where(eq(reviewCases.id, id))
      .returning();
    return rows[0] ? toResponse(rows[0]) : null;
  },

  async deleteById(id: string): Promise<void> {
    await db.delete(reviewCases).where(eq(reviewCases.id, id));
  },
};

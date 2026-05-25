import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const reviewCases = sqliteTable('review_cases', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  caseName: text('case_name').notNull(),
  clientName: text('client_name').notNull(),
  status: text('status').notNull().default('draft'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const documents = sqliteTable('documents', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  caseId: text('case_id')
    .notNull()
    .references(() => reviewCases.id, { onDelete: 'restrict' }),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  documentType: text('document_type').notNull(),
  analysisStatus: text('analysis_status').notNull().default('pending'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

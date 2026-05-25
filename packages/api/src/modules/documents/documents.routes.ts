import { Elysia } from 'elysia';
import { z } from 'zod';

import {
  CreateDocumentBody,
  DocumentCaseParams,
  DocumentParams,
  DocumentResponse,
} from './documents.schemas';
import { documentsService } from './documents.service';

export const documentsRoutes = new Elysia({ prefix: '/cases' })
  .post(
    '/:case_id/documents',
    async ({ params, body, set }) => {
      set.status = 201;
      return documentsService.createDocument(params.case_id, body);
    },
    {
      params: DocumentCaseParams,
      body: CreateDocumentBody,
      response: { 201: DocumentResponse },
      detail: { summary: 'Upload a document to a case', tags: ['documents'] },
    }
  )
  .get('/:case_id/documents', async ({ params }) => documentsService.getDocuments(params.case_id), {
    params: DocumentCaseParams,
    response: { 200: z.array(DocumentResponse) },
    detail: { summary: 'List documents for a case', tags: ['documents'] },
  })
  .get(
    '/:case_id/documents/:document_id',
    async ({ params }) => documentsService.getDocument(params.case_id, params.document_id),
    {
      params: DocumentParams,
      response: { 200: DocumentResponse },
      detail: { summary: 'Get a document', tags: ['documents'] },
    }
  )
  .delete(
    '/:case_id/documents/:document_id',
    async ({ params, set }) => {
      await documentsService.deleteDocument(params.case_id, params.document_id);
      set.status = 204;
    },
    {
      params: DocumentParams,
      detail: { summary: 'Delete a document', tags: ['documents'] },
    }
  );

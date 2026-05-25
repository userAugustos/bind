import { Elysia, t } from 'elysia';

import { CreateDocumentBody, DocumentResponse } from './documents.schemas';
import { documentsService } from './documents.service';

export const documentsRoutes = new Elysia({ prefix: '/cases' })
  .post(
    '/:case_id/documents',
    async ({ params, body, set }) => {
      set.status = 201;
      return documentsService.createDocument(params.case_id, body);
    },
    {
      params: t.Object({ case_id: t.String() }),
      body: CreateDocumentBody,
      response: { 201: DocumentResponse },
      detail: { summary: 'Upload a document to a case', tags: ['documents'] },
    }
  )
  .get('/:case_id/documents', async ({ params }) => documentsService.getDocuments(params.case_id), {
    params: t.Object({ case_id: t.String() }),
    response: { 200: t.Array(DocumentResponse) },
    detail: { summary: 'List documents for a case', tags: ['documents'] },
  })
  .get(
    '/:case_id/documents/:document_id',
    async ({ params }) => documentsService.getDocument(params.case_id, params.document_id),
    {
      params: t.Object({ case_id: t.String(), document_id: t.String() }),
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
      params: t.Object({ case_id: t.String(), document_id: t.String() }),
      detail: { summary: 'Delete a document', tags: ['documents'] },
    }
  );

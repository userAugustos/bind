import { randomUUID } from 'crypto';

import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { analysisRoutes } from '@api/modules/analysis/analysis.routes';
import { documentsRoutes } from '@api/modules/documents/documents.routes';
import { reviewCasesRoutes } from '@api/modules/review-cases/review-cases.routes';
import { config } from '@core/env';
import { errorPlugin } from '@core/errors';
import { LOG_DOMAINS, logger } from '@core/logger';
import { enterRequestContext } from '@core/request-context';
import { securityHeaders } from '@core/security-headers';
import { emitMetric } from '@core/telemetry';

const httpLogger = logger.child({ domain: LOG_DOMAINS.HTTP });

const getClientIp = (request: Request): string =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
  request.headers.get('x-real-ip') ??
  'unknown';

export const createApp = () =>
  new Elysia({ name: 'bind-api' })
    .use(errorPlugin)
    .use(securityHeaders())
    .onRequest(({ request, set }) => {
      const requestId =
        request.headers.get('x-request-id') ?? request.headers.get('cf-ray') ?? randomUUID();
      set.headers['x-request-id'] = requestId;
      (request as unknown as Record<string, unknown>).__requestId = requestId;
      (request as unknown as Record<string, unknown>).__startTime = performance.now();
      enterRequestContext(requestId, getClientIp(request));
    })
    .onAfterResponse(({ request, set, path: route }) => {
      const startTime = (request as unknown as Record<string, unknown>).__startTime as
        | number
        | undefined;
      if (!startTime) return;
      const url = new URL(request.url);
      if (url.pathname === '/healthz') return;
      const duration_ms = Math.round((performance.now() - startTime) * 100) / 100;
      emitMetric('http.request.duration', duration_ms, {
        request_id: (request as unknown as Record<string, unknown>).__requestId,
        method: request.method,
        path: url.pathname,
        route,
        status: (set as unknown as Record<string, unknown>).status ?? 200,
      });
    })
    .use(cors())
    .use(reviewCasesRoutes)
    .use(documentsRoutes)
    .use(analysisRoutes)
    .use(
      config.isProduction
        ? new Elysia({ name: 'openapi-disabled' })
        : openapi({
            path: '/docs',
            mapJsonSchema: { zod: zodToJsonSchema },
            documentation: {
              info: { title: 'Bind API', version: '0.1.0' },
              tags: [],
            },
          })
    )
    .get(
      '/healthz',
      () => ({
        status: 'ok',
        version: config.gitCommitSha,
        timestamp: new Date().toISOString(),
      }),
      { detail: { summary: 'Health Check', tags: ['system'] } }
    );

export const bindApi = createApp();

export type BindApi = typeof bindApi;

export const setupApi = async () => {
  httpLogger.info('Setup complete', { env: config.environment });
};

export const startApi = async ({ host, port }: { host: string; port: number }) => {
  httpLogger.info('Starting API', { env: config.environment });
  await setupApi();
  const app = createApp();
  return app.listen({ hostname: host, port }, ({ port: p }) => {
    httpLogger.info('API listening', { host, port: p, env: config.environment });
  });
};

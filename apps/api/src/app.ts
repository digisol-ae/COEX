import express, { type Express } from 'express';
import type { ApiConfig } from './config';
import { errorHandler, HttpError } from './http/errors';
import { requestId, sameOriginForWrites } from './http/middleware';
import { buildOpenApi } from './http/openapi';
import { mountRoutes } from './http/route';
import { routes } from './routes';

/**
 * The Express application, without a listener, so tests can drive it directly.
 *
 * Everything lives under /api/v2. Apache sends that prefix here and everything else to the
 * Next.js app, which is how the two run side by side on one address without anyone noticing.
 */

export const API_VERSION = '0.1.0';

export function createApp(config: Pick<ApiConfig, 'allowedOrigins'>): Express {
  const app = express();

  app.disable('x-powered-by');
  // Behind Apache: trust the one proxy in front, so request details are the real caller's.
  app.set('trust proxy', 1);

  app.use(requestId);
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/v2', sameOriginForWrites(config.allowedOrigins));

  app.get('/api/v2/openapi.json', (_req, res) => {
    res.json(buildOpenApi(routes, API_VERSION));
  });
  app.use('/api/v2', mountRoutes(routes));

  app.use((_req, _res, next) => next(new HttpError(404, 'not_found', 'No such route.')));
  app.use(errorHandler);

  return app;
}

import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { defineRoute } from '../http/route';
import { HttpError } from '../http/errors';

/** Health and identity: the two routes every other part of the system leans on. */

const healthResponse = z.object({
  status: z.literal('ok'),
  database: z.literal('up'),
  time: z.string(),
});

const meResponse = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  tenantId: z.string(),
  tenantName: z.string(),
  permissions: z.array(z.string()),
  theme: z.enum(['sunset', 'light', 'dark']),
});

export const systemRoutes = [
  defineRoute({
    method: 'get',
    path: '/health',
    tag: 'System',
    summary: 'Is the API up and the database reachable',
    public: true,
    response: healthResponse,
    handler: async () => {
      try {
        const mongoose = await connectToDatabase();
        await mongoose.connection.db?.admin().ping();
      } catch {
        // Apache and pm2 checks read the status code, so an unreachable database is a 503.
        throw new HttpError(503, 'database_down', 'The database is not reachable.');
      }

      return { status: 'ok' as const, database: 'up' as const, time: new Date().toISOString() };
    },
  }),

  defineRoute({
    method: 'get',
    path: '/me',
    tag: 'System',
    summary: 'The signed in person, their tenant and permissions',
    response: meResponse,
    handler: async ({ auth }) => auth,
  }),
];

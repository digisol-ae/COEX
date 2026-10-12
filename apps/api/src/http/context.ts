import type { AuthenticatedUser } from '@/modules/core/services/auth-context.service';

declare global {
  // Express's own extension point for adding fields to the request.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** A short id, also returned in the X-Request-Id header, so a report can be found in the logs. */
      id: string;
      /** Set by authenticate(); absent on public routes. */
      auth?: AuthenticatedUser;
    }
  }
}

export {};

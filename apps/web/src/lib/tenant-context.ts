import { AsyncLocalStorage } from 'node:async_hooks';
import type { Types } from 'mongoose';

/**
 * Tenant and actor for the current request.
 *
 * Every query in the application is scoped by this context rather than by each caller remembering
 * to pass a tenantId. Anything that reaches the database without a context is a bug, and the
 * repository layer throws rather than returning another tenant's data.
 */

export interface RequestContext {
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  /** True for DigiSol platform staff who may switch tenant. Every switch is audited. */
  isPlatformAdmin: boolean;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(context: RequestContext, callback: () => T): T {
  return storage.run(context, callback);
}

export function getContext(): RequestContext {
  const context = storage.getStore();

  if (!context) {
    throw new Error(
      'No request context. Database access must run inside runWithContext so that the tenant is known.',
    );
  }

  return context;
}

/** Returns the context when there is one, without throwing. Used by logging and health checks. */
export function peekContext(): RequestContext | undefined {
  return storage.getStore();
}

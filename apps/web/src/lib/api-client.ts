import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/modules/core/services/session.service';

/**
 * How the Next.js app calls the Express API while modules move over (revamp Phase 2).
 *
 * Each module has a flag: `COEX_API_MODULES` is a comma separated list of the modules whose pages
 * and actions go through the API, for example `leads`. Unset, nothing changes, which is also the
 * rollback: remove the module from the list and restart `coex-app`. The call is made from the
 * server, carrying the person's own session cookie, so the API sees exactly the same sign in and
 * permissions as a browser would.
 */

export function apiEnabledFor(moduleName: string): boolean {
  const modules = (process.env.COEX_API_MODULES ?? '').split(',');
  return modules.some((name) => name.trim() === moduleName);
}

/** The API refused with 409 and told us who the new record looks like. */
export class ApiConflictError extends Error {
  constructor(
    message: string,
    public readonly details: unknown,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  body?: unknown,
): Promise<T> {
  const base = process.env.COEX_API_URL ?? 'http://127.0.0.1:3002/api/v2';
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? '';

  const response = await fetch(`${base}${path}`, {
    method,
    cache: 'no-store',
    headers: {
      cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.ok) return (await response.json()) as T;

  const failure = (await response.json().catch(() => null)) as {
    error?: { code?: string; message?: string; details?: unknown };
  } | null;
  const message = failure?.error?.message ?? 'The request failed.';

  // Refusals ("Lead not found.") are sentences for a person and pass through unchanged; the
  // screens already show an Error's message.
  if (response.status === 409) throw new ApiConflictError(message, failure?.error?.details);
  throw new Error(message);
}

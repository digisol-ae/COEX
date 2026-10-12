import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { Types } from 'mongoose';
import { runWithContext } from '@/lib/tenant-context';
import { SESSION_COOKIE } from '@/modules/core/services/session.service';
import { resolveAuthenticatedUser } from '@/modules/core/services/auth-context.service';
import type { Permission } from '@coex/shared/core/permissions';
import { HttpError } from './errors';
import './context';

export const requestId: RequestHandler = (req, res, next) => {
  req.id = randomUUID().slice(0, 8);
  res.setHeader('X-Request-Id', req.id);
  next();
};

/** Reads one cookie without a dependency; the cookie header is a plain `a=b; c=d` list. */
export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;

  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * Signs the request in from the same `coex_session` cookie the Next.js app sets and reads, through
 * the same service, then runs the rest of the request inside the tenant context. From here on a
 * service call is scoped to the person's tenant exactly as it is in a server action.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const token = readCookie(req.headers.cookie, SESSION_COOKIE);
    if (!token) throw new HttpError(401, 'unauthenticated', 'Sign in first.');

    const user = await resolveAuthenticatedUser(token);
    if (!user) throw new HttpError(401, 'unauthenticated', 'Sign in first.');

    req.auth = user;

    runWithContext(
      {
        tenantId: new Types.ObjectId(user.tenantId),
        userId: new Types.ObjectId(user.id),
        isPlatformAdmin: user.role === 'platform_admin',
      },
      () => next(),
    );
  } catch (error) {
    next(error);
  }
};

/** Refuses a person who lacks the permission. Services still check for themselves as well. */
export function requirePermission(permission: Permission): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth?.permissions.includes(permission)) {
      next(new HttpError(403, 'forbidden', 'You may not do that.'));
      return;
    }
    next();
  };
}

/**
 * A browser attaches the cookie to any request to this site, including one fired from another
 * site's page. So a request that changes data must come from our own pages: when the browser says
 * where it came from (the Origin header, always sent on a POST) it must be one of ours. A request
 * with no Origin is not a browser form post and carries no ambient cookie risk worth blocking here;
 * the cookie is also SameSite, which covers the rest.
 */
export function sameOriginForWrites(allowedOrigins: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      next();
      return;
    }

    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      next(new HttpError(403, 'bad_origin', 'This request did not come from the COEX site.'));
      return;
    }

    next();
  };
}

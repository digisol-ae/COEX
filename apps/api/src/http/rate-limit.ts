import type { Request, RequestHandler } from 'express';
import { HttpError } from './errors';

/**
 * A small fixed window limiter, kept in memory.
 *
 * It is for the sign in routes, which are reachable by anyone and which a password guesser would
 * hammer. One API process runs per server, so memory is enough; if the API is ever run as several
 * processes the counters would need to move into MongoDB. Counting happens before the work, so a
 * guesser pays for every attempt, and the window forgets on its own.
 */

export function rateLimit(options: {
  windowMs: number;
  max: number;
  /** What one caller is, for example the address plus the email being tried. */
  key: (req: Request) => string;
}): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req, res, next) => {
    const now = Date.now();

    // Forget finished windows so the map cannot grow without bound.
    if (hits.size > 5000) {
      for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
    }

    const key = options.key(req);
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    entry.count += 1;
    if (entry.count > options.max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      next(
        new HttpError(
          429,
          'too_many_requests',
          'Too many attempts. Wait a few minutes and try again.',
        ),
      );
      return;
    }

    next();
  };
}

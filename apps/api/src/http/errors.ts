import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

/**
 * One error shape for every response: `{ error: { code, message } }`, with the HTTP status.
 *
 * Services refuse by throwing a plain `Error` whose message is a sentence for a person ("Lead not
 * found.", "You may not change leads."). That is how every service in COEX already signals a
 * refusal, so the API maps a plain `Error` to 422 and shows the message unchanged. Anything else
 * (a TypeError, a MongoDB error) is a bug or an outage: it is logged with the request id and the
 * caller sees only "Something went wrong" and that id.
 */

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error instanceof HttpError) {
    res
      .status(error.status)
      .json({ error: { code: error.code, message: error.message, details: error.details } });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'invalid_request',
        message: 'The request is not valid.',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  // A body that is not valid JSON, raised by Express's own parser.
  if (
    typeof error === 'object' &&
    error &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  ) {
    res
      .status(400)
      .json({ error: { code: 'invalid_json', message: 'The body is not valid JSON.' } });
    return;
  }

  if (error?.constructor === Error) {
    res.status(422).json({ error: { code: 'refused', message: error.message } });
    return;
  }

  console.error(`[${req.id}] unexpected error:`, error);
  res.status(500).json({
    error: { code: 'internal', message: 'Something went wrong.', requestId: req.id },
  });
};

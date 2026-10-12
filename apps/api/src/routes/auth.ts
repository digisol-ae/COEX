import type { CookieOptions, Request } from 'express';
import { z } from 'zod';
import { signInWithEntra, signInWithPassword } from '@/modules/core/services/auth.service';
import { resolveAuthenticatedUser } from '@/modules/core/services/auth-context.service';
import {
  ENTRA_STATE_COOKIE,
  completeEntraSignIn,
  entraStateCookieOptions,
  startEntraSignIn,
} from '@/modules/core/services/entra.service';
import {
  requestPasswordReset,
  resetLinkIsValid,
  resetPasswordWithToken,
} from '@/modules/core/services/password-reset.service';
import { SESSION_COOKIE, revokeSession } from '@/modules/core/services/session.service';
import { HttpError } from '../http/errors';
import { readCookie } from '../http/middleware';
import { rateLimit } from '../http/rate-limit';
import { defineRedirectRoute, defineRoute, type AnyRoute } from '../http/route';
import { meResponse } from './system';

/**
 * Sign in, sign out, password reset and Microsoft Entra, moved from the Next.js server actions and
 * routes with the same behaviour and the same cookie.
 *
 * The services underneath (auth.service, password-reset.service, entra.service) are the ones the
 * web app uses, unchanged, so what a sign in does (the audit entries, the generic failure message,
 * the once only reset link, signing every device out after a reset) cannot drift between the two.
 * What this file adds is the HTTP layer: the cookie, the status codes and a rate limit.
 *
 * The web app's own login page and Entra routes keep working untouched. Nothing points at these
 * routes until the web app is switched over, and the Microsoft sign in cannot be used here until
 * its redirect address is added in Azure (see apps/api/README.md).
 */

/** The same cookie the web app sets, so a person signed in through either is signed in on both. */
function sessionCookieOptions(expires: Date): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  };
}

function callerAddress(req: Request): string | null {
  return req.ip ?? null;
}

export const ENTRA_API_CALLBACK_PATH = '/api/v2/auth/entra/callback';

export interface AuthRouteLimits {
  /** Sign in attempts allowed per address and email in the window. */
  loginAttempts: number;
  /** Password reset requests allowed per address in the window. */
  resetRequests: number;
  windowMs: number;
}

export const DEFAULT_AUTH_LIMITS: AuthRouteLimits = {
  loginAttempts: 10,
  resetRequests: 5,
  windowMs: 10 * 60 * 1000,
};

export function createAuthRoutes(limits: AuthRouteLimits = DEFAULT_AUTH_LIMITS): AnyRoute[] {
  const loginLimit = rateLimit({
    windowMs: limits.windowMs,
    max: limits.loginAttempts,
    key: (req) => `login|${req.ip}|${String(req.body?.email ?? '').toLowerCase()}`,
  });
  const resetLimit = rateLimit({
    windowMs: limits.windowMs,
    max: limits.resetRequests,
    key: (req) => `reset|${req.ip}`,
  });

  return [
    defineRoute({
      method: 'post',
      path: '/auth/login',
      tag: 'Auth',
      summary: 'Sign in with email and password; sets the coex_session cookie',
      public: true,
      before: [loginLimit],
      body: z.object({ email: z.string().min(1), password: z.string().min(1) }),
      response: z.object({ user: meResponse }),
      handler: async ({ body, req, res }) => {
        const result = await signInWithPassword({
          email: body.email,
          password: body.password,
          ipAddress: callerAddress(req),
          userAgent: req.get('user-agent') ?? null,
        });

        if (!result.ok || !result.token || !result.expiresAt) {
          throw new HttpError(401, 'invalid_credentials', result.error ?? 'Sign in failed.');
        }

        res.cookie(SESSION_COOKIE, result.token, sessionCookieOptions(result.expiresAt));

        const user = await resolveAuthenticatedUser(result.token);
        if (!user) throw new HttpError(401, 'invalid_credentials', 'Sign in failed.');

        return { user };
      },
    }),

    defineRoute({
      method: 'post',
      path: '/auth/logout',
      tag: 'Auth',
      summary: 'Sign out: ends this session and clears the cookie',
      public: true,
      response: z.object({ ok: z.literal(true) }),
      handler: async ({ req, res }) => {
        const token = readCookie(req.headers.cookie, SESSION_COOKIE);
        if (token) await revokeSession(token);

        res.clearCookie(SESSION_COOKIE, { path: '/' });
        return { ok: true as const };
      },
    }),

    defineRoute({
      method: 'post',
      path: '/auth/forgot-password',
      tag: 'Auth',
      summary:
        'Email a password reset link. Always answers the same, so it cannot reveal accounts.',
      public: true,
      before: [resetLimit],
      body: z.object({ email: z.string().min(1) }),
      response: z.object({ sent: z.literal(true) }),
      handler: async ({ body }) => {
        await requestPasswordReset(body.email.trim());
        return { sent: true as const };
      },
    }),

    defineRoute({
      method: 'post',
      path: '/auth/reset-password/check',
      tag: 'Auth',
      summary:
        'Whether a reset link can still be used (the token is sent in the body, not the URL)',
      public: true,
      before: [resetLimit],
      body: z.object({ token: z.string().min(1) }),
      response: z.object({ valid: z.boolean() }),
      handler: async ({ body }) => ({ valid: await resetLinkIsValid(body.token) }),
    }),

    defineRoute({
      method: 'post',
      path: '/auth/reset-password',
      tag: 'Auth',
      summary: 'Choose a new password from a reset link. Signs every device out.',
      public: true,
      before: [resetLimit],
      body: z.object({
        token: z.string().min(1),
        password: z.string().min(1),
        confirm: z.string(),
      }),
      response: z.object({ done: z.literal(true) }),
      handler: async ({ body }) => {
        if (body.password !== body.confirm) throw new Error('The two passwords do not match.');

        await resetPasswordWithToken(body.token, body.password);
        return { done: true as const };
      },
    }),

    defineRedirectRoute({
      method: 'get',
      path: '/auth/entra',
      tag: 'Auth',
      summary: 'Start Microsoft Entra sign in',
      handler: ({ res }) => {
        try {
          const { authorizationUrl, stateCookie } = startEntraSignIn(ENTRA_API_CALLBACK_PATH);
          res.cookie(ENTRA_STATE_COOKIE, stateCookie, entraStateCookieOptions);
          res.redirect(authorizationUrl);
        } catch {
          res.redirect('/login?entra=not-configured');
        }
      },
    }),

    defineRedirectRoute({
      method: 'get',
      path: '/auth/entra/callback',
      tag: 'Auth',
      summary: 'Where Microsoft sends the person back; verifies the identity and signs in',
      query: z.object({
        code: z.string().optional(),
        state: z.string().optional(),
        error: z.string().optional(),
      }),
      handler: async ({ query, req, res }) => {
        const { code, state, error } = query as { code?: string; state?: string; error?: string };
        const clearState = () => res.clearCookie(ENTRA_STATE_COOKIE, entraStateCookieOptions);

        if (!code || !state || error) {
          clearState();
          res.redirect('/login?entra=cancelled');
          return;
        }

        try {
          const identity = await completeEntraSignIn({
            code,
            state,
            stateCookie: readCookie(req.headers.cookie, ENTRA_STATE_COOKIE) ?? undefined,
            callbackPath: ENTRA_API_CALLBACK_PATH,
          });

          const result = await signInWithEntra({
            ...identity,
            ipAddress: callerAddress(req),
            userAgent: req.get('user-agent') ?? null,
          });

          clearState();

          if (!result.ok || !result.token || !result.expiresAt) {
            res.redirect('/login?entra=account');
            return;
          }

          res.cookie(SESSION_COOKIE, result.token, sessionCookieOptions(result.expiresAt));
          res.redirect('/dashboard');
        } catch {
          clearState();
          res.redirect('/login?entra=failed');
        }
      },
    }),
  ];
}

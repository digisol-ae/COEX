# @coex/api

The Express API that takes COEX modules over from the Next.js app, one at a time
(docs/ARCHITECTURE-REVAMP.md).

## Run

```bash
npm run api:dev      # tsx watch, port 3002, loopback only
npm run api:start    # as pm2 runs it: pm2 start npm --name coex-api -- run api:start
```

It reads the same `.env.local` / `.env` as the web app. New settings are optional: `API_PORT`
(default 3002), `API_HOST` (default 127.0.0.1), `COEX_APP_URL`.

Until Apache routes `/api/v2` to it (deploy/apache-coex.conf), nothing reaches it from outside.

## How it fits

- **Same session.** It reads the `coex_session` cookie through the same service the web app uses
  (`resolveAuthenticatedUser`), so a person signed in on one is signed in on the other.
- **Same tenant rule.** After sign in the request runs inside `runWithContext`, so every service
  call is scoped to the person's tenant exactly as it is in a server action. A service still
  refuses for itself; the route's permission check is a second lock, not the only one.
- **Same services.** Services are imported unchanged from `apps/web/src/modules/*/services` (the `@/`
  alias points at the web app's `src`). When a module's screens switch to the API its services are
  moved here with `git mv`; until then there is one copy, never two.

## Adding a route

Declare it with `defineRoute` in `src/routes/<module>.ts` and add it to `src/routes/index.ts`:

```ts
defineRoute({
  method: 'get', path: '/leads', tag: 'Leads', summary: '...',
  permission: 'lead.read',
  query: z.object({ ... }), response: z.object({ ... }),
  handler: async ({ query, auth }) => { ... },
});
```

The declaration checks the query, parameters and body, applies sign in and the permission, shapes
the response through its schema (fields the schema does not name are dropped) and appears in
`GET /api/v2/openapi.json`. A route that is not declared does not exist.

## Errors

`{ error: { code, message } }`. A plain `Error` thrown by a service is a refusal and returns 422
with its sentence unchanged; validation returns 400; no session 401; missing permission 403;
anything unexpected is logged with the request id (header `X-Request-Id`) and returns 500.

## Sign in routes (`/api/v2/auth/*`)

| Route | What it does |
| --- | --- |
| `POST /auth/login` | Email and password; sets the `coex_session` cookie (httpOnly, SameSite=Lax, Secure in production). 10 attempts per address and email per 10 minutes. |
| `POST /auth/logout` | Ends the session and clears the cookie. |
| `POST /auth/forgot-password` | Emails a reset link. Always answers `{ sent: true }`, so it cannot reveal accounts. 5 per address per 10 minutes. |
| `POST /auth/reset-password/check` | Whether a link is still usable (the token travels in the body, never the URL). |
| `POST /auth/reset-password` | Sets the new password from a link; the link works once; every device is signed out. |
| `GET /auth/entra`, `GET /auth/entra/callback` | Microsoft Entra sign in. Redirects, no JSON. |

They call the same services as the web app (`auth.service`, `password-reset.service`,
`entra.service`), so audit entries, the generic failure message and the password rules are the same.
A session made here works on the web app and the other way round (checked against the running
servers). The web app's own login page and `/api/auth/entra` routes are untouched.

**Microsoft Entra needs one change in Azure before it can be used through the API** (John, Microsoft
account): add the redirect URI `https://coex.digisol.ae/api/v2/auth/entra/callback` to the app
registration, beside the existing `/api/auth/entra/callback`. Until then `/api/v2/auth/entra` works
but Microsoft would refuse the return address. Nothing else changes: the same client id, tenant id
and secret are used.

## Writes

State changing requests must come from our own origin (`sameOriginForWrites`) and, with the
SameSite cookie, are protected against requests fired from other sites. No write routes exist yet.

## Tests

`apps/api/tests` run with the rest of the suite (`npm run test:db` for the database ones).

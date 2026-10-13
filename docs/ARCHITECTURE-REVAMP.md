# Architecture revamp: Express API and a Next.js only frontend

Status: agreed in principle by John, 10 Oct 2026. Starts after P2.2b (pipeline and opportunities)
is accepted; no feature freeze before then, and none after it, except that new features are built
on the new structure once Phase 1 below exists.

## Decisions (John, 10 Oct 2026)

1. Backend is Node.js with Express, frontend is Next.js alone, database stays MongoDB as it is.
2. One monorepo with shared types (not two repositories).
3. Microsoft Entra sign in is owned by DigiSol and implemented in the Express API. Next.js only
   starts the redirect and shows the result. (If John meant something different by "DigiSol", say so
   before Phase 1.)
4. Real time stays as it is: the 30 second poll (Support badge, live refresh) is fine. Server sent
   events are a later option, not part of this revamp.
5. P2.2b is finished first. This replaces decision 1 in CLAUDE.md (Next.js server actions) only
   when each module has switched over; until then both exist.

## Rule one: agents are never disturbed

- Same domain, same login, same `coex_session` cookie, same MongoDB. No data copy, no migration,
  nothing to reconcile.
- Each module switches behind a feature flag (per tenant, stored in tenant settings) and can be
  switched back in seconds. Order of exposure: John, one pilot agent, everyone.
- Deploys happen outside UAE office hours. A MongoDB backup (`deploy/backup.sh`) is taken before
  each module goes live.
- Tickets and the email intake go last and run old and new side by side for a day before cutover.
- A module's old code is deleted only after a week of stable use.

## Target layout

```
coex/
  apps/
    api/        Express + TypeScript. Routes, middleware, workers (email, desk close, channels)
    web/        Next.js (App Router). Pages and components only. No Mongoose, no server actions
  packages/
    shared/     Mongoose models, zod schemas, permission rules, pure helpers (contract-status,
                lead-rules, phone, email-text...), API types generated from the zod schemas
  deploy/       Apache, pm2, backup scripts (as today)
  docs/
```

The services in `src/modules/*/services` move into `apps/api/src/modules/*` almost unchanged: they
already contain the business rules and do not depend on Next.js. The folder pattern (models,
services, routes in place of actions, tests) and the rule that business logic lives in services
stay as they are. Decision 13 (Tasks and Tickets read each other directly) carries over unchanged.

## API conventions

- REST, JSON, under `/api/v2/<module>/...`. The old `/api/*` routes keep working until their
  module is switched.
- Every route declares a zod schema for input and output; the OpenAPI document is generated from
  them, so the frontend and backend developers work from one contract.
- Middleware order: request id, session (reads `coex_session` from the existing sessions
  collection), tenant context (replaces today's `runWithContext`/`getContext`), permission check
  (`requirePermission('contract.read')`, same permission names), handler, error mapper.
- Services keep refusing on their own (`actorCan`, tenant scoping in `repository()`), so a route
  that forgets a check still cannot leak data. Permissions are never enforced only in the frontend.
- Errors: `{ error: { code, message } }` with the status code; user messages are the same sentences
  the services throw today.
- File uploads (ticket attachments) keep the 3 MB per file and 10 MB per message limits and the
  current storage layer.
- Passwords, Entra, password reset links and the 30 minute/once only rules move with the auth
  module and keep their behaviour exactly.

## Frontend rules after the revamp

- Server components fetch from the API with the user's cookie forwarded; client components call it
  directly. Forms post to the API; there are no server actions.
- All interface conventions in CLAUDE.md (icon buttons, glass popups, tooltips, themes, back arrow,
  phone first) are unchanged and move with the components.
- The What's new rule is unchanged: a user-visible change still gets a release note. A pure
  re-platforming change does not, unless agents will notice a difference.

## Phases

### Phase 0: agree and prepare (about 1 to 2 weeks, no risk to agents)

Status: built 12 Oct 2026 (see "Phase 0 as built" below).

- Dev team reviews this document; the open points above are settled.
- Create the monorepo skeleton (npm workspaces), move `packages/shared` first (models, schemas,
  pure helpers) and make today's app import from it. Behaviour unchanged, all 138 unit tests and the
  database tests still pass. This alone is a safe, reviewable first pull request.
- CI runs lint, types, unit and database tests for every workspace.

### Phase 1: Express beside the app (invisible)

- `apps/api` boots with health check, session and tenant middleware, permission middleware, error
  mapper and the OpenAPI document. Apache sends `/api/v2/*` to it (new port, e.g. 3002); everything
  else stays on the Next.js app (port 3001).
- Workers move into `apps/api` as pm2 processes with the same names (`coex-mail`,
  `coex-desk-close`, `coex-channels`), one at a time, restarted with `--update-env`.
- Auth module: Entra authorization code + PKCE flow, sign in, sign out, password reset, in Express,
  still issuing the same cookie, so a person signed in on either side is signed in on both.

### Phase 2: module by module

Order (lowest risk first): Leads and Contracts, CRM (customers, contacts, products, custom
fields) and Setup, Time, Tasks and My Desk, Tickets and email intake last. P2.2b opportunities are
built straight onto the new structure if Phase 1 exists by then, otherwise in the old one and moved
with CRM.

Checklist for every module:

1. Express routes and zod schemas; services moved to `apps/api`.
2. Same tests, now against the API (`supertest`) as well as the services.
3. Next.js pages switched to the API behind the module's flag.
4. Chromium walk-through of every screen with the flag on and off.
5. Pilot (John, then one agent), then everyone; one week stable.
6. Delete the module's server actions and old routes.

### Phase 3: Next.js only

- No Mongoose and no server actions left in `apps/web`. Remove the flags. Update CLAUDE.md
  decision 1, the Environment section, `deploy/DEPLOYMENT-STATUS.md` (new pm2 process `coex-api`,
  Apache routing) and onboarding docs.

## Risks and how they are handled

| Risk                                                       | Handling                                                                           |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Two code paths for a while                                 | Flags per module, one module at a time, delete the old path after a stable week    |
| Session or cookie mismatch signs agents out                | Express reads the same sessions collection; tested on a copy before any real use   |
| Behaviour drift (messages, permissions, tenant scoping)    | Services move unchanged; the existing tests become the parity check                |
| Email intake or outbox runs twice                          | One worker owner at a time; check `pm2 status` shows exactly one of each           |
| Performance from an extra hop                              | API and web on the same server; measure the ticket list before and after           |
| Entra needs the exact production callback and secret       | Entra stays inactive until DigiSol sets the secret and redirect URI, as today      |
| Developers join mid-migration                              | This document, the OpenAPI contract and the per-module checklist                   |

## What this document does not decide

Hosting changes, a different database, a new auth provider, server sent events, mobile apps. Each
is a separate decision for John.

## Phase 0 as built (12 Oct 2026, Claude)

- npm workspaces at the repository root (`workspaces: ["packages/*"]`) and one package,
  `@coex/shared` (`packages/shared`). It holds the 33 Mongoose models and 21 pure files (permissions,
  permission labels, password policy, phone, lead, contract and opportunity rules, contract email
  text, task statuses, dates, office day and document links, week and clock maths, ticket email text,
  business hours, canned reply text, preview, collaborators, channel canonical schemas). Release
  notes stay in the web app: they are content, not a shared rule.
- The package ships TypeScript source. Applications import
  `@coex/shared/<module>/<path>` (an `exports` wildcard to `src/<path>.ts`); Next compiles it through
  `transpilePackages`, `tsx` workers and Vitest resolve it through the workspace link. `mongoose` is
  a peer dependency so there is exactly one copy and one model registry.
- 131 files had their imports rewritten mechanically (a codemod, not by hand); nothing else
  changed. Behaviour is identical.
- **Deviation from the layout above:** the Next.js app stays at the repository root instead of
  moving to `apps/web` now. A physical move changes deployment paths, pm2's working directory and
  where `.env.local` lives, which is exactly the disturbance this plan exists to avoid. The move to
  `apps/web` happens in Phase 1 in one step, together with the creation of `apps/api` and the
  matching change to `deploy/` and the pm2 processes.
- CI now type-checks the shared package on its own, lints and format-checks `packages/`.
- Deploy: unchanged commands. `npm ci` at the root installs the workspace link. No migration, no new
  process, no restart beyond the usual `pm2 restart ... --update-env`.
- Verified in a scratch copy: type check of both packages, ESLint zero warnings, Prettier, 146 unit
  tests, 59 database tests (leads, opportunities, contracts, CRM foundation, custom fields) on
  FerretDB, production build, and the email worker starting under `tsx`. The full database suite on
  real MongoDB is still John's run.
- Next (Phase 1): `apps/api` skeleton, session and tenant middleware, health check, Apache route for
  `/api/v2`, workers moved over one at a time, Entra in Express, and the move of the web app to
  `apps/web`.

## Phase 1a as built (12 Oct 2026, Claude)

Phase 1 is delivered in steps so each one can be checked on its own. Step 1a is the API beside the
app; it is invisible until Apache is told to route to it.

- `apps/api` (`@coex/api`): Express 5, TypeScript, started with `npm run api:start` (pm2 process
  `coex-api`, loopback port 3002) or `npm run api:dev`. It reads the same `.env.local` / `.env`.
- **Same session, proven.** A person signs in on the web app; the API accepts the very same
  `coex_session` cookie. Both resolve it through one framework-free service,
  `core/services/auth-context.service.ts` (the web app's `session.ts` now calls it too), so they can
  never disagree about who someone is or what they may do. Web sign in was re-verified after this
  refactor.
- **Same tenant rule.** After sign in each request runs inside `runWithContext`, so services are
  scoped to the person's tenant exactly as in a server action. Services still refuse for themselves.
- **Routes are declared as data** (`defineRoute`): sign in, permission, query, params and body
  validation (zod), and a response schema that also strips any field it does not name. The OpenAPI
  3.0 document is generated from the same declarations at `GET /api/v2/openapi.json`, which is the
  contract for the frontend and backend developers.
- **Errors**: `{ error: { code, message } }`. A plain `Error` thrown by a service is a refusal
  (422, message unchanged); validation 400; no session 401; no permission 403; anything unexpected
  is logged with the request id (`X-Request-Id`) and returns a generic 500.
- **Writes** must come from our own origin (`sameOriginForWrites`); the cookie is SameSite. No write
  routes exist yet.
- **First slice**: `GET /health`, `GET /me`, `GET /leads` (read only), enough to prove the pattern
  end to end. `GET /leads` uses the existing lead service unchanged.
- **No duplicate code.** The API imports services from the web app's `src/modules/*/services` (its
  `@/` alias points there). A module's services are moved into `apps/api` with `git mv` when its
  screens switch over (Phase 2), so there is only ever one copy of a rule.
- **Deploy, when John chooses** (nothing changes until then): `npm ci`, `pm2 start npm --name
  coex-api -- run api:start`, `pm2 save`, then uncomment the two `ProxyPass /api/v2/` lines in the
  Apache site (deploy/apache-coex.conf) and `sudo apache2ctl configtest && sudo systemctl reload
  apache2`. Check: `curl https://coex.digisol.ae/api/v2/health`.
- Verified in a scratch copy: typecheck of all three packages, ESLint zero warnings, 163 unit tests,
  10 new API tests (supertest against a MongoDB emulator, with the session expiry index disabled
  because the emulator cannot build it; real MongoDB builds it), production build, the real API
  started under `tsx`, and the web app's sign in cookie used against `/me` and `/leads`.

Remaining Phase 1 steps (1c is built, below), each its own commit: **1b** move the three workers (`coex-mail`,
`coex-desk-close`, `coex-channels`) into `apps/api`, one at a time; **1c** sign in, sign out, password
reset and the Entra flow as API routes (still issuing the same cookie); **1d** move the Next.js app
to `apps/web` with the matching `deploy/` and pm2 changes.

## Phase 1c as built (12 Oct 2026, Claude)

Sign in, sign out, password reset and Microsoft Entra are now API routes (`/api/v2/auth/*`, table in
apps/api/README.md), done before the workers because they carry the least risk to agents' daily work
and unlock the web app's switch to the API.

- Same services, same behaviour: `auth.service`, `password-reset.service` and `entra.service` are
  the ones the web app uses, unchanged except that `entra.service` takes an optional callback path
  (default is the web app's, so the web flow is identical). The API adds only the HTTP layer: the
  cookie, status codes and a rate limit.
- **One session across both.** A session created through the API was used on the running web app
  (`/dashboard` answered 200), and after an API logout the web app redirected to `/login`; the web
  login cookie already worked against the API (1a). Same cookie name and flags (httpOnly,
  SameSite=Lax, Secure in production, path `/`, 30 day expiry).
- **New protection on a new surface:** an in memory rate limit on sign in (per address and email) and
  on password reset (per address), `Retry-After` on 429. In memory is enough for one API process;
  see `rate-limit.ts` for what to change if it ever runs as several.
- **Entra** is served at `/api/v2/auth/entra` and `/api/v2/auth/entra/callback`. **John must add
  `https://coex.digisol.ae/api/v2/auth/entra/callback` as a redirect URI in the Azure app
  registration** before it can be used; the web app's existing redirect URI keeps working and nothing
  switches until the login page is pointed at the API.
- **Not tested end to end:** the final Microsoft token exchange (it needs Microsoft). Tested: not
  configured redirect, redirect to Microsoft with state and PKCE, the state cookie, and that a
  cancelled, tampered or unverifiable return signs nobody in.
- Verified in a scratch copy: typecheck of all packages, ESLint zero warnings, 163 unit tests and 23
  API tests (13 new, emulator, TTL indexes disabled there), production build, and the running API and
  web app exercised together with curl.
- The web login page is **not** switched yet; that is a one line change per form and is held until
  John wants it, so nothing changes for agents.

## Phase 1, workers: desk-close moved (12 Oct 2026, Claude)

- `scripts/desk-close-worker.ts` is now `apps/api/src/workers/desk-close.ts` (history kept),
  behaviour unchanged. The pm2 name `coex-desk-close` and `npm run desk:worker` are the same, so the
  deploy steps do not change: `pm2 restart coex-desk-close --update-env` after the pull; never
  `pm2 start` it again.
- It reuses the web app's `desk-close.service` through the `@/` path (already mapped in
  `apps/api/tsconfig.json`) until Tasks switches to the API; the service moves with its module.
- Verified in a scratch copy: typecheck, ESLint zero warnings, Prettier, unit tests, and the worker
  starting and stopping cleanly under `tsx`. NOT run: a real office-day close against MongoDB; watch
  the first 23:59 Gulf close in `pm2 logs coex-desk-close`.
- Next workers: `coex-channels`, then `coex-mail`.

## Phase 1, workers: channels moved (12 Oct 2026, Claude)

- `scripts/channel-worker.ts` is now `apps/api/src/workers/channels.ts` (history kept), behaviour
  unchanged. The pm2 name `coex-channels` and `npm run channels:worker` are the same. It reuses the
  web app's channel services through the `@/` path until the module switches. M6.3 to M6.6 stay
  suspended; this only moves the process.
- Deploy: `pm2 restart coex-channels --update-env && pm2 save` after the pull; never `pm2 start` it
  again. Check `pm2 logs coex-channels --lines 20 --nostream` for "COEX channel worker starting."
- Verified in a scratch copy: typecheck, ESLint zero warnings, Prettier, unit tests, and the worker
  starting and stopping cleanly under `tsx`. NOT run: delivery against a real channel provider.
- Left: `coex-mail`, the largest worker.

## Dependency fix (12 Oct 2026, Claude)

- `npm audit --omit=dev` on the server reported two high findings: `sharp` below 0.35.5 (a flaw in
  its bundled librsvg, reachable through image uploads) and `source-map-js` up to 1.2.1 (event-loop
  denial of service). Lockfile now resolves `sharp` 0.35.5 and `source-map-js` 1.2.2; `package.json`
  raises the `sharp` floor to ^0.35.5. Production audit: 0 vulnerabilities.
- Verified in a scratch copy: `npm ci`, typecheck, 163 unit tests, production build, and sharp
  encoding an image. Deploy: `npm ci` then `npm run build` and restart `coex-app` (sharp is loaded by
  the web app).

## Phase 1, workers: mail moved (12 Oct 2026, Claude)

- `scripts/email-worker.ts` is now `apps/api/src/workers/mail.ts` (history kept), behaviour unchanged:
  IMAP IDLE intake, the outbox, contract and opportunity reminders and the daily performance email.
  The pm2 name `coex-mail` and `npm run email:worker` are the same. It reuses the web app's services
  through the `@/` path until those modules switch. This was the last of the three workers.
- Deploy: `pm2 restart coex-mail --update-env && pm2 save` after the pull; never `pm2 start` it again.
  Check `pm2 logs coex-mail --lines 30 --nostream`: it should connect to the mailbox and show no
  errors. Do it outside office hours or accept a few seconds of delay in outgoing mail: the restart
  re-reads settings and reconnects, and the first run per mailbox never re-imports old mail (progress
  is tracked by UID).
- Verified in a scratch copy: typecheck, ESLint zero warnings, Prettier, unit tests, and the worker
  starting and stopping cleanly under `tsx`. NOT run: a real mailbox, a send, or a reminder pass.
- Left in Phase 1: Apache route and starting the API on port 3002 (John's go), the Entra redirect URI
  in Azure (John), and the move of the web app to `apps/web`.

## Phase 1d as built: the web app moves to apps/web (12 Oct 2026, Claude)

- `src`, `public`, `next.config.ts` and `postcss.config.mjs` moved to `apps/web` with `git mv`, so
  history is kept. `apps/web` has its own `package.json` (`@coex/web`: next, react, react-dom, clsx,
  tailwind-merge, tailwind and the Next ESLint config) and `tsconfig.json`. Shared service-level
  dependencies (mongoose, nodemailer, imapflow, sharp and so on) stay in the root `package.json`,
  because the workers and the API use the same services.
- The `@/` alias now means `apps/web/src`: in `apps/web/tsconfig.json`, the root `tsconfig.json`
  (scripts and tests, and what `tsx` reads for the workers), `apps/api/tsconfig.json` and
  `vitest.config.mts`. The scripts in `scripts/` import from `../apps/web/src`.
- `.env` and `.env.local` stay at the repository root. Next.js only reads its own folder, so
  `apps/web/bin/run-next.mjs` loads the root files and then starts the Next.js command line. The first
  attempt (loading them in `next.config.ts`) left the running server without `MONGODB_URI`, because
  `next start` does not re-run the config; the launcher fixes that. `.env.local` is read before `.env`
  so it overrides, as for the workers.
- Root `npm run dev`, `build` and `start` forward to the web package and pass extra arguments through
  (`npm start -- -p 3001`). `PORT` sets the port, default 3100. `turbopack.root` is the repository root.
- Uploads: with no `STORAGE_DIR` the default `.storage` is now relative to `apps/web`. Production sets
  `STORAGE_DIR`, so only a developer's local uploads move; copy `.storage` into `apps/web` if needed.
- CI lints and format-checks `apps` and `packages`; `npm run typecheck` covers web, scripts and tests,
  shared and api.
- Verified in a scratch copy: `npm install` and a fresh lockfile, typecheck of all four, ESLint zero
  warnings, Prettier, 163 unit tests, production build, `npm start` serving login, CSS and public
  files, the root `.env` being read at runtime, `npm start -- -p 3952` binding that port, all three
  workers starting under `tsx`, and a Chromium walk-through of 23 screens against a seeded FerretDB:
  22 returned 200 and rendered styled; `/time/report` returned 500 because FerretDB does not implement
  `$cond` in `$group` (an emulator limit, not this change; it needs a run on real MongoDB). NOT run: a
  real MongoDB, the full database suite, or any pm2 process.
- Server cutover is a one-time step: see "Cutover to apps/web" in deploy/DEPLOYMENT-STATUS.md.

## Phase 1 status (13 Oct 2026, Claude)

- 1a API skeleton, 1b all three workers in `apps/api`, 1c auth and Entra routes, 1d web app in
  `apps/web`: built, merged and live on the server (cutover done 13 Oct, see deploy/DEPLOYMENT-STATUS.md).
- Still not started in production: the API process itself (port 3002) and its Apache route. The Entra
  redirect URI for `/api/v2/auth/entra/callback` is still to be added in Azure by John.
- Next: Phase 2, module by module (Leads and Contracts first), behind a flag per module.

## Phase 2, Leads: routes (13 Oct 2026, Claude)

- Checklist step 1 and 2 for Leads, partly: all lead routes exist under `/api/v2/leads` with zod schemas and supertest cases (written, not yet run against a database). Steps 3 to 6 and moving the service file remain.

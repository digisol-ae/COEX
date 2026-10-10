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

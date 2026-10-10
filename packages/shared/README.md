# @coex/shared

Mongoose models and pure business rules used by every COEX application: today the Next.js web app,
later the Express API (docs/ARCHITECTURE-REVAMP.md, Phase 0).

## What belongs here

- `src/<module>/models/*.model.ts`: the Mongoose schemas. Types derive from them
  (`InferSchemaType`), never typed twice.
- Pure rules with no database, no HTTP and no framework: statuses, validation, phone numbers, week
  and office-day maths, email text, permission tables.

## What does not belong here

Anything that reads or writes the database (services), renders (components), or talks HTTP
(actions, routes, middleware). Services stay with the application that runs them until their module
moves to the API.

## Rules

1. A file here imports only `mongoose`, `zod`, `node:` built-ins and other files in this package,
   always by relative path. Never `@/...` and never a service.
2. Folder layout mirrors the modules (`crm`, `core`, `tasks`, `tickets`, `time`, `channels`).
3. Applications import with the package name and the path without extension:
   `import { LeadModel } from '@coex/shared/crm/models/lead.model';`
4. `mongoose` is a peer dependency: there must be exactly one copy in the install, or the model
   registry splits in two. The root `npm install` guarantees it.

Check this package on its own with `npm run typecheck -w @coex/shared`.

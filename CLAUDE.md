# COEX

Standing context for every Claude session on this project. Read this first, then FEEDBACK.md.

## What this is

COEX, short for Co-existence, is DigiSol's own multi tenant business platform. It replaces ClickUp and osTicket,
adds a CRM foundation, and is built so that Contracts, full CRM and Payroll attach to it later.
Zoho Books stays as the accounting system and is integrated with, never replaced.

Confirmed product name. The repository is COEX.

## Owner and team

- John (Syed Muhammad Jan Ali), CEO of DigiSol, is the product owner and the only reviewer for now.
- Claude is the core developer through Phase 1.
- A designer, a frontend developer and a backend developer join later. Readability and documentation
  are acceptance criteria on every milestone, not afterthoughts.

## Phase 1 scope

M1 Foundation, M2 CRM foundation, M3 Tasks and dashboard, M4 Time tracking, M5 Tickets,
M6 Channels, M7 osTicket migration, M8 Hardening and cutover. Fourteen weeks.

The full scope document lives in the Claude project "ECHO System Development" as
"COEX Phase 1 Scope".

## Decisions already made

1. Stack: Next.js 16 App Router, TypeScript strict, MongoDB with Mongoose, Tailwind, shadcn ui.
2. Authentication: Microsoft Entra single sign on for DigiSol staff, password fallback for client
   contacts. Auth.js with database sessions.
3. Job queue: MongoDB backed, no Redis. Wrapped in a thin service so BullMQ can replace it later.
4. Multi tenant from day one. Every document carries tenantId, enforced in the data access layer.
5. Documents live in Microsoft 365. Tasks store links, never files. Ticket attachments are the one
   exception and are compressed automatically on upload.
6. No ClickUp data migration. osTicket migrates in full.
7. No knowledge base, no automations builder, no whiteboards, no goals.
8. Task terminology is ours, not ClickUp's: Portfolio, Project, Task, Step. Confirmed by John.
9. XVERSE integration: COEX writes events to an outbox, a connector sends them. Both sides are ours.
10. Client tenants will be billed eventually. The model is undecided, so tenant settings carry an
    inert commercial block and nothing more.

## Code standards

1. TypeScript strict, no `any`. Types derive from the Mongoose schemas, never typed twice.
2. Identical folder pattern in every module: models, services, components, actions, tests.
3. Business logic lives in services. Components render, services decide.
4. Full descriptive names in English. No invented abbreviations.
5. Comments explain why, never what.
6. Prettier and ESLint enforced. Formatting is never a review topic.
7. Conventional commits, small pull requests.
8. Documentation updated in the same commit as the code.

## Where things live

- `src/modules/<module>/` one folder per module, never importing from a sibling module
- `src/modules/core/` tenancy, users, audit log, outbox, shared primitives
- `src/lib/` framework level helpers: database connection, tenant context, utilities
- `src/components/ui/` the shared component library
- `docs/` architecture, data model, onboarding
- `scripts/` migration and maintenance scripts

Cross module needs go through core services or the outbox. This rule is what keeps a modular
monolith from becoming a tangle.

## How the work runs

- A fresh Claude session per working day.
- Feedback raised in chat as numbered items, then written into FEEDBACK.md.
- Anything decided in conversation is written into CLAUDE.md or FEEDBACK.md, never left in chat.
- John pushes to the repository himself.
- John runs every command himself. Claude writes the code and hands over the exact commands with a
  short note on what each one does and what good output looks like. Claude does not run npm
  scripts, seeds, migrations or the dev server on John's machine.
- Replies on this project in English only, whatever language the question is asked in.

## Environment

Node 22 LTS, pinned in .nvmrc and in the engines field. Node 23 is an odd numbered release, never
became LTS and is already end of life; it also ships the npm build that throws
"Cannot read properties of null (reading 'edgesOut')" during install. Mongoose 9 renamed
FilterQuery to QueryFilter, so older examples found online will not compile here.

## Environment rule that bit us once

Dependencies are installed on John's Mac, by John, with `npm install` in Terminal. Claude must
never run `npm install` from its Linux sandbox into this folder: packages such as lightningcss,
@tailwindcss/oxide and @node-rs/argon2 ship compiled binaries per platform, so a Linux install
leaves node_modules unusable on macOS and the build fails with "Cannot find module
'../lightningcss.darwin-arm64.node'". The cure is `rm -rf node_modules package-lock.json` followed
by `npm install` on the Mac.

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

## Where we are

M1 Foundation is accepted. M2 CRM foundation, M3 Tasks and dashboard, M4 Time tracking and M5
Support are built. Current work is local verification, mobile QA and controlled rollout.

Conventions worth knowing before changing CRM code:

- Mobile numbers are stored in E.164 and entered with a country picker, because XVERSE matches
  inbound WhatsApp by number.
- Money is stored as integer minor units with an explicit currency.
- Nothing deletes: customers and contacts archive, products retire, custom fields hide.
- Custom field keys are generated from the label once and then frozen; renaming a key would orphan
  every value stored against it.

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
   exception and are compressed automatically on upload. DigiSol's own cloud server is the planned
   production store; application limits are 3 MB per file and 10 MB per ticket message.
6. No ClickUp data migration. osTicket migrates in full.
7. No knowledge base, no automations builder, no whiteboards, no goals.
8. Task structure is four levels: Space, Folder, Task, Subtask. Set by John's team on 18 Sep 2026,
   replacing the three level structure agreed the day before. A Space or Folder without named
   members is open to the tenant; naming members makes it private to exactly those members, a
   tenant administrator excepted. Work in a private Space or Folder can only be assigned to its
   members, and making one private while it strands an assignee is refused. Phases were removed: a
   folder does everything a phase did and adds visibility, so keeping both would give the team two
   ways to group the same work. Portfolios were removed earlier. scripts/migrate-spaces.ts carries
   an older database across.
9. XVERSE integration: COEX writes events to an outbox, a connector sends them. Both sides are ours.
10. Client tenants will be billed eventually. The model is undecided, so tenant settings carry an
    inert commercial block and nothing more.
11. Ticket-linked Task work updates are internal support notes. They may update the linked ticket,
    but must never notify the customer automatically.
12. IMAP email intake is configured locally only. It must use a per-mailbox UID baseline so old
    unread mail cannot be imported accidentally; production polling is a deployment decision.

## Code standards

1. TypeScript strict, no `any`. Types derive from the Mongoose schemas, never typed twice.
2. Identical folder pattern in every module: models, services, components, actions, tests.
3. Business logic lives in services. Components render, services decide.
4. Full descriptive names in English. No invented abbreviations.
5. Comments explain why, never what.
6. Prettier and ESLint enforced. Formatting is never a review topic.
7. Conventional commits, small pull requests.
8. Documentation updated in the same commit as the code.

## Navigation

One file defines the menu: src/components/navigation/navigation.ts. Groups are named after the
part of the business they serve, not after the module implementing them. A new module adds a group
there and nothing else, because the sidebar, the permission filtering and the collapse state all
read from that list. Permissions are applied on the server, so a link a person may not open is
never sent to their browser.

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
- John runs the commands himself and pastes the output back. Standing permission for Claude to
  drive the Mac was granted 17 Sep 2026 and turned off again on 19 Sep 2026 because it spent credits
  too fast, so Claude proposes the exact command and John runs it. Installs still happen natively on
  macOS, never from the Linux sandbox, or the binaries come out wrong.
- Claude still hands over the command when the point is for John to see it run, and always says what
  it ran and what came back.
- Pushing works only from macOS: the GitHub credentials live in the Mac keychain, and the sandbox
  cannot read them. Use the Terminal bridge for git push.
- Two things stay with John: anything that costs money, and anything needing his Microsoft or
  GitHub account.
- Replies on this project in English only, whatever language the question is asked in.

## AI collaboration

Claude and ChatGPT share project context through the files in `ai/`.

Before significant work:
1. Read `ai/PROJECT_STATE.md`.
2. Read `ai/CURRENT_TASK.md`.
3. Read `ai/HANDOFF.md`.
4. Follow `CLAUDE.md` as the permanent project authority.
5. Read `FEEDBACK.md` when product history or acceptance status is relevant.
6. Inspect the actual code before making assumptions.

During work:
- Treat the repository and shared AI files as the source of truth, not another AI's conversation history.
- Do not assume that work mentioned in chat was completed; verify it in the repository.
- Do not overwrite or discard another AI's uncommitted work without John's direction.

After significant work:
1. Update `ai/PROJECT_STATE.md` with the new project state.
2. Update `ai/CURRENT_TASK.md` if the active task changed.
3. Update `ai/HANDOFF.md` when work is being handed to another AI.
4. Record permanent architectural or product decisions in `CLAUDE.md` or `FEEDBACK.md`, as appropriate.
5. State what was changed, what was tested, and what remains.

When handing work to ChatGPT:
- Write a concise handoff in `ai/HANDOFF.md`.
- Identify changed files, tests run, unresolved issues, and the recommended next step.

When continuing work started by ChatGPT:
- Read the shared AI files first.
- Verify ChatGPT's reported work against the repository before continuing.

When handing work to Claude:
- ChatGPT will update `ai/HANDOFF.md` with the current state and recommended next step.

## Environment

COEX runs on port 3100, not 3000, because the CIBO accounts program already uses 3000 on John's
Mac. Both can run at once. Cookies ignore the port, so the session cookie is named coex_session to
keep it distinct from anything CIBO sets on localhost.

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

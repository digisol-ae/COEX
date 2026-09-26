# COEX — Shared AI Project State

> **Current verified update — 26 Sep 2026 (Claude).** Supersedes everything below where they
> conflict. `origin/main` is deployed through `6fa0730` (unread marks, live refresh, one Outlook
> thread per ticket, black phone drawer, leftover patch files removed). The team cut over to COEX
> on 25 Sep. Email runs through the `coex-mail` pm2 worker (IMAP IDLE). QA on 26 Sep passed:
> escalation → Task work update → Task completion posts two internal notes on the ticket and
> queues no customer email; phone menu, timer tray and sign-out work; Status/Priority show on
> phone cards and the desktop table. QA fixed and deployed live (`6fa0730`, verified on coex.digisol.ae): phone timer tray ran off the
> left edge; priority "Normal" clipped on macOS; long subjects widened the tickets table; forms
> still warned at 25MB (limit is 3MB per file); the screenshot test used an image over 3MB. All
> 151 tests pass. Tasks and Tickets reading each other directly is intended (CLAUDE.md
> decision 13), no longer an open item. Local QA runs against a separate `coex_qa` database
> (test user `qa@coex.test`, password kept outside the repository), never `coex_dev`.
> Production runs on its own MongoDB on the VPS. Server OS updates belong to Nabeel. Batch C
> (CLAUDE.md decision 18) was built and tested on 26 Sep; committed locally, awaiting push, deploy
> and John's acceptance.

> **Earlier update — 24 Sep 2026.** The historical snapshot below is superseded where it
> conflicts with this section. The local branch now has completed Space privacy, per-user access,
> task/ticket timers, attachment previews and limits, ticket mobile cards, task-to-ticket internal
> work updates, and a safe IMAP intake service. `npm run build` passes; the four remaining
> `src/lib/storage.ts` tracing warnings are pre-existing deployment-size warnings. The code is
> committed locally for Claude, but must not be pushed or deployed without John's approval.
>
> Inbound email uses Message-ID deduplication, threading and existing CRM matching. It intentionally
> skips historic unread mailbox mail using a local UID baseline, and no production scheduler exists
> yet. `.env.local` contains local secrets/settings and is never committed. Phone header controls
> need one final actual-device check after the development-server restart.

> **Later on 24 Sep (Claude):** QA fixes accepted by John: escalated Tasks now carry
> `sourceTicketId` (with a fallback via the ticket's `escalatedTaskId` for older tasks), and the
> phone menu drawer renders through a portal. The hydration warning seen in development comes from
> a Chrome extension injecting `__gcr*` attributes, not from COEX. Type check and lint pass.

> **24 Sep evening (Claude):** decisions recorded in FEEDBACK.md and CLAUDE.md (items 13 to 16).
> Batch A's 22 Sep redeploy and acceptance are now recorded. Production DB was seeded on 19 Sep,
> after the 18 Sep Spaces change, so it does not need `migrate:spaces`. Known pre-existing issues:
> 36 files fail Prettier and `board.tsx` has one react-hooks lint error, so CI is red until a
> formatting pass. Cutover to COEX: 25 Sep 2026.

## Purpose

This is the shared working memory for AI agents collaborating on COEX.

Claude and ChatGPT must read this before significant project work.

Permanent project rules and architecture belong in `CLAUDE.md`.
Product feedback and acceptance history belong in `FEEDBACK.md`.

---

## Product

COEX (Co-existence) is DigiSol's multi-tenant business platform.

It replaces ClickUp and osTicket, provides the CRM foundation, and is designed so Contracts,
full CRM and Payroll can attach later.

Zoho Books remains the accounting system and will be integrated rather than replaced.

---

## Current Phase

M3 Tasks and Dashboard is substantially built.

Completed major areas:

- M1 Foundation
- M2 CRM foundation
- M3 Tasks and dashboard
- M4 Time tracking
- M5 Support desk

Batch A code is merged and deployed.

---

## Git State

Branch: `main`

Remote: `origin/main`

Latest commit:

`770eead` — chore: remove stray Batch A patch and scratch readme committed in bf3421d

Recent chain:

- `770eead` removed the stray `batch-a-board-fixes.patch` and `readme.txt` that `bf3421d` had
  committed by accident.
- `2f8e238` established the AI collaboration workflow.
- `bf3421d` merged Batch A.

Working tree: clean.

---

## Deployment

Documented production environment:

- Contabo VPS
- Ubuntu 24.04
- MongoDB 8 with authentication
- PM2
- Apache reverse proxy
- Production URL: `coex.digisol.ae`
- Production application port: `3001`

Detailed deployment information is in:

`deploy/DEPLOYMENT-STATUS.md`

Claude reports that Batch A was redeployed on 22 Sep 2026 and John confirmed the deployed
Batch A behaviour during testing.

That deployment confirmation is not yet recorded in the repository documentation.

---

## Batch A

Merged in:

`bf3421d`

Commit:

`board: portal task pickers, highlight active filter, assign subtasks`

Scope included:

- portal task pickers
- active filter highlighting
- subtask assignment
- related board/list/task UI changes

Known limitation:

The subtask assignee dropdown currently lists every member rather than restricting the list
to private-folder members.

This limitation is not yet formally recorded in `FEEDBACK.md`.

---

## Batch B — Proposed / Not Started

The next proposed work is space visibility.

Existing folder visibility rule:

- no named members = open to the space
- named members = private
- tenant administrator is excepted
- private-folder work can only be assigned to its members

Proposed extension to spaces:

- no named space members = visible to the tenant
- named space members = private
- tenant administrator is excepted

Proposed implementation:

- `visibleSpaceFilter`
- enforce visibility in `listSpaces`
- enforce visibility in `getSpace`
- enforce visibility in navigation
- member picker on space create/edit
- members backfill for existing spaces
- B2 private personal task place
- restrict subtask assignees to valid folder members

Status:

**Not started.**

Claude reports that this space-visibility approach was selected by John on 22 Sep 2026,
but the implementation has not started.

---

## Earlier "Batch C" (22 Sep): timer tray — historical, since built

> Not the current Batch C. The timer tray below shipped with the September baseline. The current
> Batch C is John's 26 Sep list in FEEDBACK.md item 1 (CLAUDE.md decision 18).

Proposed feature:

A right-side collapsible timer tray allowing a user to:

- see today's timers
- pause a timer
- switch to another task
- resume a previous timer
- stop a timer

Existing backend already has:

- one running timer per person
- starting a new timer stops the existing running timer
- a partial unique index enforcing one running timer
- existing running timer display

Proposed scope:

- timer tray UI
- "my timers today" query
- resume action

Status:

**Not started.**

Claude suggested ChatGPT could handle Batch C while Claude handles Batch B.
John has not yet confirmed that division of work.

---

## Other Outstanding Work

- Gantt export as image/PDF.
- Production attachment storage decision.
- Entra app registration.
- Production backup strategy.
- Figma design adoption.

See `FEEDBACK.md` for the authoritative product backlog.

---

## Context Requiring Reconciliation

The following information exists in prior Claude conversation context but is not yet fully
recorded in the repository:

1. Resolved. The permission for Claude to control John's Mac was turned off on 19 Sep 2026, and
   `CLAUDE.md` now records this.
2. A mobile navigation logo sizing issue was identified.
3. The proposed mobile navigation logo correction was 148x50.
4. That mobile navigation logo correction has not been merged.
5. Batch A deployment and acceptance on 22 Sep has not yet been recorded in remote documentation.
6. Batch B space visibility and Batch C timer tray scope need to be formally recorded.

These must not be treated as permanent decisions unless confirmed by John.

---

## AI Collaboration Rules

Before significant work:

1. Read this file.
2. Read `CURRENT_TASK.md`.
3. Read `HANDOFF.md`.
4. Read `CLAUDE.md`.
5. Read `FEEDBACK.md` when product history or acceptance status matters.
6. Inspect the actual repository before making assumptions.

During work:

- The repository is the implementation source of truth.
- The `ai/` files are the shared AI collaboration source of truth.
- AI conversation history is not a substitute for project documentation.
- Never assume another AI completed work; verify it.
- Do not overwrite or discard another AI's uncommitted changes without John's direction.

After significant work:

1. Update `PROJECT_STATE.md`.
2. Update `CURRENT_TASK.md` when the active task changes.
3. Update `HANDOFF.md` when handing work to another AI.
4. Record permanent architectural decisions in `CLAUDE.md`.
5. Record product feedback and acceptance information in `FEEDBACK.md`.
6. Record what changed, what was tested, and what remains.

---

## Historical Snapshot — 2026-09-23

2026-09-23

Updated by:

Claude, docs pass: removed the obsolete patch-guard references after `770eead` deleted the file,
and recorded the 19 Sep Mac permission change in `CLAUDE.md`. Superseded by the 24 Sep update at
the top of this file.

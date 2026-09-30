# COEX — Shared AI Project State

## Release handoff — 1 Oct 2026 (Codex)

John approved QA, updating Claude's instructions, committing, pushing to GitHub, deploying
to the app server, then shutting down the Mac. This release is ready locally; VPS access
is blocked. No shutdown until deployment is verified.

### Delivered
- After today's first saved snapshot, My Desk says **Update today’s summary**.
- One status per task; statuses are configurable per Space in Space settings, shared by
  Board/List/Gantt. Add, order and remove stages; choose exactly one completed stage.
  Used stages cannot be renamed/removed or change completion meaning until their tasks move.
  Completion uses isClosed, never guesses from names such as "Incomplete".
- Shared table headings toggle ascending/descending sorting, with Reset sort. Explicit
  numeric/date values sort hours and dates correctly. Task/subtask row groups stay together;
  sorting preserves React row state and disables manual dragging until reset.
- All Timesheets shows Monday–Sunday hours for the selected week alongside weekly totals.
  Timesheet export/person navigation preserves the local week date instead of slicing UTC.
- Desk icons with tooltips add/remove the signed-in person's eligible tasks from lists,
  boards, detail panels/pages, dashboard, timesheets, linked tickets and global search.
  Checked icon indicates selection. Adds are idempotent and service-enforce assignment.
- My Available Tasks titles open an in-place native modal preview with loaded description,
  dates, status, time, tags, documents and subtasks. Open task icon navigates only if requested.
- Includes earlier local Performance History, office close scheduling/retry, mobile and Entra
  preparation. Entra remains inactive without the secret and exact production callback.
- Formatting cleanup resolves the pre-existing CI formatting failures.

### Verification
- Full suite: 21 files / 208 tests passed in 572.32s using isolated
  coex_test_8d3b94_* databases. Shared coex_qa, coex_dev and production were untouched.
- Final unit run: 79 passed. Final focused desk/status DB run: 5 passed in 64.33s.
- TypeScript, ESLint with zero warnings, CI Prettier check, production build and diff check pass.
- Local Codex browser functional QA (no screenshots): updated confirmation label; available
  task preview loads and closes without navigation, Open task link; daily week columns;
  timesheet numeric ascending/descending order; custom status add/edit/cancel; Space list
  heading sorting and eligible desk icons. Read-only checks did not change existing task data.
- Existing storage tracing warnings remain. Pixel/device visual QA was not performed.

### Claude's next action
1. Confirm the newest GitHub main commit and CI result; this session commits/pushes after
   this handoff is written. Preserve all unrelated work and never commit env/credentials.
2. Deployment is authorized, but Codex could not authenticate: macOS denied reading
   ~/Downloads/digisol-zabbix.pem. SSH-agent fallback also failed. Terminal automation timed
   out and Computer Use denied Terminal access for safety reasons. Use John's authorized
   native terminal after the local permission issue is resolved; do not bypass safety controls.
3. Follow deploy/DEPLOYMENT-STATUS.md (Apache + pm2, /srv/coex/app, port 3001), not DEPLOY.md.
   Check remote HEAD and dirty state, pull with --ff-only, npm ci, build, restart coex-app and
   coex-mail. Start/restart coex-desk-close and pm2 save. Do not alter Entra secrets/settings.
4. Verify target SHA, all three pm2 processes, HTTPS login and the deployed My Desk/status/
   timesheet behavior. Update deployment status and this handoff with the result.
5. Only after deployment succeeds, carry out the authorized Mac shutdown. Until then leave it
   running. No OS patching or Apache changes are part of this release.

## Local fixes — 1 Oct 2026 (Codex)

- Continue locally only. John questioned server access; no SSH or live-server operations were
  performed in this continuation.
- Desk-close now schedules 23:59:59 in OFFICE_TZ (default Asia/Dubai), prevents overlapping
  closes, and retries failures after 30 seconds without advancing its completed date.
- Failed users are reported while other users continue. Retries preserve the original close
  timestamp and office workDate even after midnight. Desk scoring uses office-day boundaries
  and the close timestamp rather than the host timezone/current retry time.
- Save confirmations now close panels in action callbacks rather than effects. Board folder
  navigation and task-form refresh synchronize state during render when their input changes.
  Fixed unescaped quotes and hook/unused warnings.
- Validation: 69 unit tests pass, including six new scheduler/service regressions; ESLint
  has 0 errors and 0 warnings; TypeScript and the normal production build pass. The temporary
  build failed on symlink resolution; the actual checkout build passed. Existing storage
  tracing warnings remain. git diff --check passes.
- The 30 Sep full database QA result remains 189/189 on coex_qa, predating these fixes; it
  was not rerun in this continuation. No browser/device QA performed.
- All changes remain local and uncommitted. No push or deployment. Next: local My Desk
  regression QA (same-day accumulation, carryover and history) against coex_qa.

## Verified continuation — 30 Sep 2026 (Codex)

- Live login at https://coex.digisol.ae/login returns HTTP 200. Local HEAD and GitHub main
  both resolve to 0f5e858; newer local work remains uncommitted.
- Full QA on a temporary copy of the current working tree, with the test harness restricted
  to exactly coex_qa: **16 files, 189 tests passed**, 531.08 seconds. No test writes to coex_dev.
  Unit-only run: 63 passed. TypeScript and production build pass.
- Latest GitHub CI at 0f5e858 failed with 13 lint errors and 3 warnings:
  https://github.com/digisol-ae/COEX/actions/runs/36519498320
- Review blockers in the local desk-close worker: it triggers during 23:59 rather than at
  the requested 23:59:59, and sets lastClosedDate before success, preventing same-day retries.
  closeOfficeDay also suppresses per-user errors. No fixes made during this QA continuation.
- SSH process/revision verification was blocked: macOS denied reading the documented key
  (Operation not permitted). VPS commit and coex-desk-close status remain unverified.
- Next: fix and test desk-close timing/retry handling and CI lint; verify VPS HEAD and pm2
  processes from John's terminal. No commit, push or deployment performed.

> **Current update — 29 Sep 2026 (Codex):** Local feature bundle completed and approved for commit,
> push and deployment. Added Personal (private per-user task capture; excluded even from admins),
> All tasks naming, My Desk (user-selected assigned tasks, drag/drop plus mobile add, daily
> completion snapshot and risk counters; numeric score hidden pending John's final algorithm),
> shared save confirmations/auto-close behaviour, and timer/UI refinements. `npm run build` passes.
> Deployment still needs verification on the VPS after pull/restart.

> **My Desk follow-up — 29 Sep 2026 (Codex):** A local-only Performance history tab has been
> added under My Desk. It shows the current user's date-wise saved desk snapshots and operational
> counters, never the score; the performance-score algorithm is awaiting John's decision. Build
> passes. This follow-up has not been committed, pushed or deployed.

> **Snapshot decision — 29 Sep 2026 (John):** Performance History is an audit record, not a
> normal editable form. A user may refresh today's snapshot by choosing “I am done” again after
> correcting live task data. Past snapshots remain immutable. A future administrator-only
> correction feature must require a reason and retain an audit trail.

> **QA update — 29 Sep 2026 (Codex):** Full `npx vitest run` on the 28 Sep temporary QA snapshot, configured for `coex_qa`: 188 passed, 1 failed. Failure: `tests/database/time.test.ts:261`, “moves an entry to another day”; `after.entries[0]` is undefined when reading `workDate`. No fix made, no push or deployment. Next: investigate this test failure.

> **Current verified update — 28 Sep 2026 (Claude, handing to ChatGPT).** Supersedes everything
> below where they conflict. `origin/main` is at `a71cee8`; one local commit on top adds What's new
> (release notes drawer) and the database reconnect fix. Everything built from 26 to 28 Sep is
> described in ai/HANDOFF.md and recorded with reasons in CLAUDE.md (decisions 12, 17, 18 and
> "Interface conventions"). John deploys himself; restart both coex-app and coex-mail. The Mac's
> connection to MongoDB Atlas was dropping intermittently on 28 Sep, so the last test run and a
> browser check of What's new are still to do.

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

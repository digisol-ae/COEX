# COEX — Shared AI Project State

## P2.1b renewals built — 4 Oct 2026 (Claude)

- Renew action (draft for next term, activating it retires the old contract), Renewals due strip,
  hourly reminder pass inside the existing coex-mail worker (no new pm2 process), new staff alert
  `contract_renewal` (Setup, Email toggle). Files: crm/contract-status.ts, crm/services/
  contract.service.ts, contract-reminder.service.ts, scripts/email-worker.ts, contracts page.
- Verified in a scratch copy: tsc, eslint zero warnings, prettier on changed files, 121 unit
  tests. NOT run: tests/database/contracts.test.ts (needs MongoDB). Deploy: restart coex-app and
  coex-mail with --update-env.
- Open for John: renewal task and dashboard card (cross module, see spec).

## P2.1a Contracts built — 4 Oct 2026 (Claude)

- Contracts live in the CRM module (they read organisations and products; a separate module would
  break the sibling import rule). Files: crm/models/contract.model.ts, crm/contract-status.ts,
  crm/services/contract.service.ts, app/(app)/contracts/*, nav item under CRM, permissions
  `contract.read`/`contract.manage` (tenant admin and manager), `contract` number series
  (tenant `numbering.contractPrefix`, default C), organisation `expiryWarningDays` (customer
  details form), release note 2026-10-04.
- Status: stored draft/active/renewed/cancelled; expiring/expired are derived from end date in the
  office time zone (Asia/Dubai), so no job is needed. Dates are YYYY-MM-DD text.
- Verified in a scratch copy: tsc, prettier, eslint (zero warnings), 118 unit tests. NOT run:
  tests/database/contracts.test.ts (no MongoDB in the sandbox) and the browser. John to run
  `npx vitest run tests/database/contracts.test.ts` on the Mac.
- Next: P2.1b renewal action, reminders and tasks; P2.1c ticket warning in the acknowledgement
  email and agent banner. Customer warning goes to the contact who raises the ticket.

## Contracts spec answers — 4 Oct 2026 (Claude)

- John: products from the CRM list with add-from-drop-down; renewal owner is the organisation's
  owner; expiry warning to agents and to the customer's contract contact from 30 days before expiry
  (configurable per customer). SLA tiers still undecided (explained in the spec). See
  docs/P2-1-CONTRACTS-SPEC.md. No code yet.

## Phase 2 order and Contracts spec — 4 Oct 2026 (Claude)

- John confirmed Contracts / AMC, then full CRM, then Payroll. Billing entirely in Zoho; support
  hours against a contract are optional; payroll needs AED, USD and PKR, no UAE specifics.
- docs/PHASE-2-PLAN.md updated; first milestone drafted in docs/P2-1-CONTRACTS-SPEC.md with four
  open questions for John. No code written for Phase 2 yet.

## Slow Atlas tests diagnosed — 4 Oct 2026 (Claude)

- Cause: `testTimeout` (30 s) does not cover `beforeAll`/`beforeEach`, whose default is 10 s, and
  every database test clears all collections and reseeds in `beforeEach` over the link to Atlas.
  That matches the four files that time out in a full run but pass alone (1 Oct note).
- Changed (not run here, no database or node_modules in the sandbox): `hookTimeout` 60 s in
  vitest.config.mts; indexes built once in `connectForTests`; optional `MONGODB_TEST_URI` for a
  local MongoDB (see tests/README.md), falling back to `MONGODB_URI`.
- John to run on the Mac: `npm run test:db`; for real speed install a local MongoDB and set
  `MONGODB_TEST_URI`. Report timings.

## Hardening started, M6 suspended — 4 Oct 2026 (Claude)

- John suspended M6.3 to M6.6 until further notice (XVERSE team unavailable). PR #5 is merged to
  main (M6.1, M6.2, Oct 3 release) and was deployed to the server on the morning of 4 Oct 2026
  (John). The hardening commit below is not deployed yet.
- M8 hardening: `npm audit` critical was `next` 16.2.0-16.3.5 (RCE in next/og ImageResponse; COEX
  does not use next/og, but fixed anyway). package.json and package-lock.json now pin next and
  eslint-config-next 16.3.8; production audit reports 0 vulnerabilities (lockfile updated with
  `--package-lock-only`, nothing installed here). Five remaining high findings are the dev-only
  lint chain (braces via fast-glob via eslint-config-next); no fixed release exists, not shipped.
- storage.ts: added turbopackIgnore hints for the four tracing warnings. NOT verified: needs
  `npm run build` on the Mac.
- John to run on the Mac: `npm ci && npm run build && npx vitest run tests/unit`, then deploy;
  on the VPS `npm ci` should no longer report a critical.
- Still open: rotate off Raheel's SSH key; slow Atlas tests have a fix awaiting a Mac run (below).
- Phase 2 plan drafted in docs/PHASE-2-PLAN.md for John's review.

## START HERE — committed release for Claude — 3 Oct 2026 (Codex)

- Feature commit: `955ea3f` (44 files), branch `claude/dreamy-carson-86yxhh`.
  Includes today's customer creation, CC, attachments, previews, timer/sender, ticket analytics,
  task badge/creator and colors. To do = yellow; In progress = blue. Full inventory:
  `ai/RELEASE-2026-10-03.md`. Earlier Claude channel commits remain on this branch.
- Verified at commit: 18 unit files / 109 tests, TypeScript, full ESLint, full source/test
  formatting and diff checks passed. Production build blocked twice by sandbox worker-port
  permissions. New database regressions and browser acceptance have NOT been verified.
- John authorized commit/push and proceeding to app-server pull. Feature commit exists locally;
  no push, CI result or deployment is confirmed. GitHub/Microsoft account actions stay with John.
- John was given this Mac sequence: `npm run build`, then
  `npx vitest run tests/database/ticket-collaborators.test.ts tests/database/tasks.test.ts`,
  then (only on success) `git push origin HEAD:main`. Test databases are forced to
  `coex_test_ticket_cc_1003` and `coex_test_tasks`; never clear shared databases.
- Next: obtain command output, verify remote exact SHA and main CI. If push is rejected because
  main advanced, reconcile safely; never force-push or discard another AI's work.
- Then verify VPS /srv/coex/app has clean status, record actual HEAD/PM2, pull --ff-only,
  npm ci/build and restart coex-app/coex-mail/coex-desk-close with --update-env, pm2 save.
  Inspect coex-channels before restarting/creating it; avoid duplicate workers. Verify deployed
  SHA, processes and HTTPS. Follow deploy/DEPLOYMENT-STATUS.md; keep Apache/Zabbix intact.
- Last documented live baseline: dd037e6; actual current server revision remains unverified.
- This handover is a documentation-only follow-up commit. No code changes after feature commit.

## Release commit preparation — 3 Oct 2026 (Codex)

- John authorized committing today's bundle, pushing and proceeding to app-server pull.
- Includes today's ticket/customer/CC/attachments/preview/timer/sender/analytics and task
  badge/creator/colors changes. Existing branch also contains Claude's M6.1/M6.2 channel work.
- Verified: 18 unit files / 109 tests, TypeScript, full ESLint and source/test formatting pass.
- Production build blocked twice by sandbox local-port permission (Turbopack CSS worker).
  Database and browser acceptance still pending. Run native Mac build and focused DB tests
  before push. No push or server change performed; GitHub credentials stay with John.
- Next: native checks, fast-forward push HEAD to main, confirm CI, then clean ff-only VPS pull,
  npm ci/build and restart app/mail/desk workers. Inspect channels worker before adding/restarting.

## Ticket analytics counts — 3 Oct 2026 (Codex, local only)

- Replaced Mine/All open/Unassigned/Missed/Everything scope buttons with green Opened, amber
  Delayed and red Missed count buttons. Each selects its corresponding ticket list.
- Opened = active tickets (excludes resolved/closed); Delayed = SLA due_soon (within 60 minutes),
  excluding Missed; Missed = breached reply or resolution SLA. Definitions in tooltips.
- Counts share matching queue/search/priority/status and permissions with the list, without
  the former 200-record cap. Personal agents remain server-restricted to their assignments.
- Queue/search/status/priority controls retained; clicking analytics clears status, and choosing
  a specific status enables that status view so resolved/closed tickets stay reachable.
- Files: tickets/page.tsx, filters.tsx, tickets/analytics.ts, new unit tests and release notes.
- Verified: TypeScript, focused ESLint zero warnings, formatting/diff checks; 109 unit tests.
  Browser acceptance remains unverified due previous browser policy block. No push/deploy.
- Added to today's single cumulative release. Next: refresh Tickets and check colored counts.


## Tasks badge and fixed creator — 3 Oct 2026 (Codex, local only)

- Tasks rail badge is an open-assigned-work count, not unread notifications. Tooltip now
  explains it; clicking opens /tasks?mine=1 and the page shows the matching open-task count.
- countMyOpenTasks applies the same Space/Folder visibility as listTasks, avoiding counts
  for hidden work that cannot appear in the list. All tasks remains available via the sidebar.
- John clarified: creator remains fixed; reassignment is allowed. createdById is now immutable
  in the Mongoose schema; the editable Owner row is renamed Assignees. Created by remains
  read-only in existing origin lines. Task update services already whitelist editable fields.
- Files: icon-rail.tsx, tasks/page.tsx, task-panel.tsx, task model/service, release-notes.ts,
  tests/database/tasks.test.ts. Added DB regressions for immutable creator/reassignment and
  visibility-aligned badge counts; NOT RUN due prior database-test execution restrictions.
- Checks: TypeScript, focused ESLint zero warnings, formatting/diff checks and 107 unit tests
  passed. Browser and database regression QA remain pending. No push/deploy.
- Added to cumulative 3 October release entry and ai/RELEASE-2026-10-03.md.
- Next: local acceptance; restart dev when reloading model schemas; run
  `npx vitest run tests/database/tasks.test.ts` on Mac using isolated coex_test_tasks.


## Cumulative release notes — 3 Oct 2026 (Codex)

- Accumulated changes since last documented live pull dd037e6 into one What's new entry
  dated 3 October 2026, id 2026-10-03: task origin, WhatsApp preparation and all today's
  ticket/customer/CC/attachment/preview/timer/sender improvements. Earlier live history kept.
- Full technical/change inventory and QA limitations: ai/RELEASE-2026-10-03.md.
- Verified baseline-to-HEAD Git history and diff; actual VPS revision is unverified.
- Files: release-notes.ts, dated release inventory, shared AI docs and FEEDBACK.md.
- Validation: release-note formatting and diff check. No new application code, push/deploy.
- Next: use dated inventory for local QA and verify the server baseline before release.


## Compact ticket preview — 3 Oct 2026 (Codex, local only)

- Replaced the tall label/value grid with wrapping icon-and-value chips, tooltips and
  screen-reader labels. Hidden empty customer/contact fields and zero attachment count.
- Smaller padding/title, narrower popup; brief limited to four lines and latest message to
  three, with redundant repeated message omitted. Full ticket remains accessible via Open.
- Files: ticket-preview-button.tsx, shared icon-button.tsx and release-notes.ts.
- Checks: TypeScript, focused ESLint zero warnings, Prettier and diff check passed.
  Visual/browser QA not performed (previous browser URL-policy block). No new tests for
  this presentation-only change. No database writes, push or deployment.
- Next: refresh localhost and reopen a ticket preview for local acceptance.


## Ticket preview, timer clock and reply sender — 3 Oct 2026 (Codex, local only)

- Eye icon on desktop ticket rows, phone cards and the full ticket opens a native modal preview
  without navigating or marking the ticket read. Brief, latest permitted message, customer,
  agent, status, priority, queue, attachment count and logged time; Open full ticket link.
- New /api/tickets/[id]/preview checks sign-in, ticket.read.own, tenant scope and assignment
  unless ticket.read.all. Internal notes and their files are excluded without ticket.manage.
- TicketTimerButton now shows HH:MM:SS alongside Stop timer using the real startedAt.
- Reply to customer has Send from: current Standard sender stays default; configured Alert
  and Admin addresses are optional choices. Only address/name/role sent to the browser, no
  credentials. Selected configured role validated before saving; persisted in the email outbox
  for existing delivery routing. Internal notes ignore sender and never queue customer mail.
- Files: new ticket-preview-button, preview API, tickets/preview.ts, time/elapsed-clock.ts;
  icon-button, TicketTimerButton, ticket list/detail/reply UI, support actions, ticket and
  email services, release notes; new preview/clock unit tests; sender DB test added to ticket CC suite.
- Verification: TypeScript, focused ESLint zero warnings, formatting and diff check passed;
  full unit suite 17 files / 107 tests passed, including preview access/privacy and clock rollover.
- DB sender integration and browser/live-send QA NOT RUN. Previous browser policy and
  DB-test permission review timeouts remain unresolved. No customer mail sent; no push/deploy.
- Next: refresh localhost, check preview/open/close and timer start/stop; run
  `npx vitest run tests/database/ticket-collaborators.test.ts` on Mac (disposable test DB),
  then verify the configured sender on a disposable ticket before release.


## Customer creation and CC collaborators — 3 Oct 2026 (Codex, local only)

- New-ticket Customer dropdown now offers Create customer: requires name and valid email,
  saves a client customer and selects it while keeping the ticket draft. Editable later in CRM.
- Multiple CC collaborators on new/existing tickets; search active team/customer/branch contacts
  in the current tenant or enter an email. Explicit Save CC collaborators on existing tickets.
- Ticket ccEmails persist; public replies queue CC on EmailOutbox and SMTP sends them.
  Primary recipient is excluded from CC; duplicates normalize. Internal notes queue no customer
  mail. Customer email is the fallback recipient when no contact/requester email exists.
- Files: support actions, ticket list/detail/new-ticket UI, new collaborator-picker and
  collaborators-panel; tickets/collaborators.ts and collaborator.service.ts; Ticket and
  EmailOutbox models; ticket/email services; release notes; new unit/database test files.
- Verified: TypeScript passed; full unit suite 15 files / 101 tests passed; focused ESLint
  zero warnings; formatted changed source/tests; diff check passed.
- Database integration tests NOT RUN: automatic permission review timed out twice before
  launching tests. Run `npx vitest run tests/database/ticket-collaborators.test.ts` on Mac;
  harness forces disposable coex_test_ticket_cc_1003. No coex_dev writes or live emails sent.
- Interactive browser QA remains blocked by the previously reported browser URL policy.
- Next: restart local dev server to reload Mongoose schemas, run integration tests, then
  verify customer creation/editing and CC save/reply on a disposable ticket. No push/deploy.


## Ticket attachment picker — 3 Oct 2026 (Codex, local only)

- Fixed repeated file selection replacing earlier selections. Replies/internal notes and new
  tickets now share a click/drop area, accumulating files with icons, names, sizes and removal.
- Files: `src/components/ui/ticket-attachment-picker.tsx`, ticket `reply-box.tsx`,
  `new-ticket-panel.tsx`, and `src/modules/core/release-notes.ts` (What's new entry).
- Uses an accumulated FileList on the form's files input; the separate picker clears each batch.
  Form reset clears selection. Existing server limits remain; UI warns at 3 MB/file and 10 MB total.
- Verification: TypeScript, focused ESLint (zero warnings), Prettier and diff check passed.
  No database writes or customer replies sent. Browser automation rejected the local ticket
  URL under its URL policy; interactive drag/drop, sending and visual QA remain unverified.
- Next: refresh the local ticket page; add two files separately, drop another, remove one,
  and verify remaining attachments send using a disposable test ticket. No push/deploy.
- Earlier customer dropdown creation request remains pending implementation.


## Local QA — 3 Oct 2026 (Codex): customer creation from ticket dropdown

- Requested feature is absent at HEAD `ec2cd09`: `new-ticket-panel.tsx` lists No customer
  and existing customers, with no Create customer option. Requirement fails source inspection.
- No feature code changed. Working tree was clean before QA; Claude's channel work preserved.
- Checks run here: `npx tsc --noEmit` passed; `npm run test:unit` passed, 14 files / 98 tests.
  These are baseline checks, not verification of the missing feature. No database writes/tests.
- Started local `npm run dev` on port 3100 and requested the Tickets page in Codex's browser
  panel. Interactive browser QA and customer persistence/editing remain unverified.
- Next: implement Create customer in the new-ticket dropdown with name-only entry, select
  the saved customer, retain the ticket draft, and verify later editing in CRM. No push/deploy.


## Task origin built and merged — 1 Oct 2026 (Claude), deploy pending

- John: "I don't know who created and assigned the task to me." `createdById` existed but was
  never shown; assignments were not recorded anywhere (audit covered only title/priority/dates).
- Built: `assignments` on the task model; `assignmentsAfter` keeps it in step in createTask,
  updateTask, patchTask (ticket escalation goes through createTask); `taskOrigin` resolves names;
  `TaskOriginLines` (src/components/tasks/task-origin.tsx) on the task page, the My Desk preview
  and the task side panel (data from /api/tasks/[id]/panel). Assignee changes now audited.
  What's new `2026-10-01-d`. No migration: older tasks show the creator only.
- Tests: 3 new in tests/database/tasks.test.ts; full suite 219/219 on MongoDB 8.0; build,
  TypeScript, ESLint, Prettier pass. Browser: preview, task page and side panel show "Created by"
  and "Assigned to you by"; assigning someone in the form records the signed-in person as their
  assigner; no browser errors.
- John authorized Claude to finish and merge; John runs the server deploy (git pull etc.).

## Team history built — 1 Oct 2026 (Claude), live at dd037e6

- John's request: managers see everyone's My Desk Performance history. His choices: access by a
  new per-person permission `desk.read.all` (no role has it; platform admins hold all), and both
  a team table and a per-person view.
- Files: core/permissions.ts and permission-labels.ts (new permission, appears in Users and
  roles automatically); tasks/services/access.service.ts (`actorHasPermission`, read from the
  account); desk.service.ts (`listTeamDeskHistory`, refuses without the permission);
  app/(app)/my-desk/page.tsx, my-desk-tabs.tsx, team-history.tsx, format-desk-date.ts. Filters
  live in the address: `/my-desk?view=team&from=&to=&person=`.
- Deliberately NOT in What's new (John): only granted people use it, so it is announced to them
  directly. Do not add a release note for it; the newest entry stays `2026-10-01-b`.
- Tests: 4 new in tests/database/desk.test.ts (manager refused, tenant admin refused by role
  alone, granted sees all with person/date filters and no score, denial wins). Full suite
  216/216 on MongoDB 8.0; build passes; TypeScript, ESLint, Prettier pass.
- Browser (tenant admin): no tab and nothing via ?view=team without the permission; after a
  grant the tab, table by date range, person link to full history, Back to everyone, phone width
  without sideways scroll; tab gone after a denial; no browser errors.
- Merged as PR #2 and deployed at `dd037e6`. John grants the permission to chosen people in Users
  and roles.

## Deployed — 1 Oct 2026, 126767a (Claude)

- PR https://github.com/digisol-ae/COEX/pull/1 merged into main as `126767a` (CI green) and
  deployed by John: pull, npm ci, build, restart of coex-app, coex-mail and coex-desk-close with
  --update-env, pm2 save. VPS HEAD `126767a`; pm2 shows one of each, all online.
- Live now: Back arrow, task status picker on the task page, tooltips kept on screen, Personal
  and Space pages listing only their own tasks, What's new `2026-10-01-b`.
- Open item: `npm ci` on the VPS reports "1 critical severity vulnerability". Not investigated
  yet; never run `npm audit fix --force` on the server.

## START HERE — state at end of 1 Oct 2026 (Claude)

- **Live on the VPS:** `dd037e6` (Team history, PR #2).
- **Merged to main, deploy pending:** PR #3, task origin ("Created by", "Assigned to you by")
  plus docs. John deploys with the commands below; no migration is needed.
- **Next step:** John deploys; then whatever John chooses. John grants `desk.read.all` to chosen
  people. Open item: the critical npm audit finding reported by `npm ci` on the VPS. Channels
  (M6) is the next milestone.
- **Deploy (John runs, from his Mac terminal):**
  `ssh -i ~/Downloads/digisol-zabbix.pem digisol@194.163.137.54`, then
  `cd /srv/coex/app && git status --short` (must be empty),
  `git pull --ff-only && npm ci && npm run build`,
  `pm2 restart coex-app coex-mail coex-desk-close --update-env && pm2 save`, `pm2 status`
  (exactly three processes), `git rev-parse --short HEAD`. Never `pm2 start` an existing process.
  `git pull` saying "Already up to date" means the work is not merged into main yet.
- **How Claude QA'd from the cloud sandbox (reusable):** copy of the repo in a scratch folder
  (never `npm install` into the real folder), `npm ci` there; throwaway MongoDB in Docker
  (`docker run -d -p 27017:27017 mongo:8.0` for the test suite; 8.0 segfaults in that sandbox
  during long runs, so `mongo:7.0` for browser QA); `.env.local` pointing at it with fresh
  random secrets; `npx vitest run`; `npm run build`; `next start --port 3100`; `npm run seed`
  then Playwright with Chromium at /opt/pw-browsers. Stop the old server by its pid
  (`next-server`) before restarting, or a stale server serves a mismatched build.
- **Standing rules worth remembering:** one tooltip component (`GlobalTooltip`), never a CSS
  pseudo-element tooltip; every user-visible change gets a What's new entry; John runs server
  commands himself; keep replies short and commands-first.

## John feedback built and accepted — 1 Oct 2026, after deployment (Claude)

- Tooltips stay on screen: `src/components/ui/global-tooltip.tsx` now handles `data-tooltip` too,
  measures itself and clamps to the window; the `.has-tooltip::after` CSS in globals.css is gone.
- Back arrow on every screen: `src/components/navigation/back-button.tsx`, placed in the header
  by `src/app/(app)/layout.tsx`; new `back` icon in icon-button.tsx.
- Status picker on the full task page: `src/app/(app)/tasks/[id]/task-status.tsx` and
  `setTaskStatusAction` in tasks/actions.ts (uses `moveTask`, the board's service).
- What's new entry `2026-10-01-b`. FEEDBACK.md and CLAUDE.md updated.
- QA (Claude, cloud sandbox, throwaway MongoDB in Docker, never coex_qa/dev/production):
  full suite 21 files / 210 tests passed on MongoDB 8.0 (twice); production build passes (the
  4 known storage.ts warnings); TypeScript, ESLint (zero warnings), Prettier pass.
- Browser QA (Playwright, built app): sign in; My Desk > preview > Open task; status picker lists
  the Space's stages, changes To do > In progress with a confirmation and survives reload; Back
  returns to My Desk (also after a refresh); a page opened directly offers Back to dashboard;
  no arrow on the dashboard at the start; arrow fits at phone width; tooltips (Theme, Timers,
  floating timer, desk icon, Back, Open task over the preview dialog) and a long tooltip in all
  four corners stay inside the window; no browser errors. MongoDB 8.0 segfaults in the sandbox
  during long runs, so browser QA ran on MongoDB 7.0.
- Two defects found by that QA and fixed: tooltips never showed when the pointer was over an
  icon's SVG (pre-existing, hidden by the old CSS tooltips); Back forgot its trail on refresh
  (now kept per tab in sessionStorage).
- Accepted by John on 1 Oct 2026. Not deployed yet: merge to main, then deploy.

## Deployed and verified — 1 Oct 2026 (Claude)

- VPS /srv/coex/app is at 7afa81e, the same as GitHub main. John ran the deployment by hand:
  ff-only pull, npm ci and npm run build (only the four known storage.ts tracing warnings),
  then restarted coex-app and coex-mail with --update-env.
- coex-desk-close was already running, so `pm2 start` added a second copy. The extra copy was
  deleted, the remaining one restarted with --update-env, and pm2 save run again. pm2 now shows
  exactly one each of coex-app, coex-mail and coex-desk-close, all online. The desk-close
  worker logs "starting (office tz Asia/Dubai)". ".env.local not found" in its error log is
  harmless.
- https://coex.digisol.ae/login returns HTTP/1.1 200 OK.
- On future redeploys, run `pm2 restart coex-desk-close --update-env`; never `pm2 start` it again.
- The deployment blocker is cleared. The authorized Mac shutdown may proceed.

## Verified release outcome — 1 Oct 2026

- Release commit bd65e26dabadb97d9537a215512968e1e4f0484d is pushed to GitHub main.
- Exact release CI is green (install, types, lint, formatting, unit tests and production build):
  https://github.com/digisol-ae/COEX/actions/runs/36775161483
- Full isolated QA passed 208 tests; final unit run passed 79, and the final focused desk/status
  database run passed 5. Final source/build/browser checks are recorded below.
- VPS deployment did not happen: the documented SSH key is blocked by macOS privacy access;
  agent authentication failed, Terminal AppleEvents timed out, and Computer Use denied Terminal.
  No server configuration, processes or data were changed. Keep the existing authorized release
  deployment pending until John can resolve native SSH access.
- Mac shutdown was not performed because the requested deployment could not be completed and
  verified. Claude's next step is the deployment procedure below, then the authorized shutdown.
- A documentation-only follow-up records this outcome; use the source release SHA above to
  identify the tested feature bundle. Temporary QA env copy removed; real env files untouched.

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

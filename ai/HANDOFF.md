# COEX — AI Handoff

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

## To do tasks yellow — 3 Oct 2026 (Codex, local only)

- To do task dots, status pills and full-page status selector now use yellow in all themes.
  In progress remains blue; completion behavior unchanged.
- Files: ui/pill.tsx, globals.css, tasks/[id]/task-status.tsx, release-notes.ts.
- Checks: TypeScript, focused ESLint, formatting and diff checks passed; visual acceptance unverified.
- Next: refresh Tasks. Included in today's cumulative release; no push/deploy.

## In-progress tasks blue — 3 Oct 2026 (Codex, local only)

- Changed shared in-progress task dots from green to blue in lists and panels. Existing
  status pills and full task status control already use blue for in-progress work.
- Files: src/components/ui/pill.tsx, release-notes.ts; added to today's cumulative release.
- Checks: focused ESLint, TypeScript, formatting and diff checks passed; browser
  acceptance not verified.
- Next: refresh Tasks and verify In progress dots. No push/deploy.

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

## Current Handoff — 29 Sep 2026, Codex

### Follow-up: My Desk history (local, not yet committed)

- My Desk now has **Today's desk** and **Performance history** tabs. History is visible only to
  the signed-in user and shows their saved daily snapshot date, desk-task count, on-time,
  overdue, tomorrow and due-soon counters.
- Numeric score remains stored internally but is not shown anywhere; John is deciding the final
  performance algorithm.
- `npm run build` passed. The existing four `storage.ts` Turbopack tracing warnings remain.
- Do not push/deploy this follow-up until John asks. Once approved, commit the four feature files
  plus these handoff updates, push, then redeploy both `coex-app` and `coex-mail`.
- Snapshot policy agreed by John: ordinary users never edit history. Re-running “I am done” on
  the same date refreshes that date's snapshot. Historical corrections, if built later, are
  administrator-only and require a reason plus an audit record.
- Built (local, 29 Sep 2026): confirming "I am done" archives completed desk tasks into that day's
  Performance History and removes them from the active desk; incomplete tasks stay for the next
  day, condition recorded; same-day confirmations accumulate. The `coex-desk-close` worker closes
  the day automatically at 23:59 office time. Test time.test.ts:261 also fixed. Not pushed.
- QA 30 Sep: `npm run check:db` connected successfully. The corrected single database test passes
  after resetting only `coex_test_time`. The full Vitest runner did not reach a final summary in
  this Codex execution environment; it was terminated early. Run `npx vitest run` in the Mac
  terminal before approving a commit or deployment.

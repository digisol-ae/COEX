# Worktello feedback release — 28 October 2026

## Deployment

- PR [#70](https://github.com/digisol-ae/COEX/pull/70) merged as `515649d3b9abddbf02b7990e035e368d29c6512e`.
- Active process: `coex-app-feedback`, PID 515255, loopback port 3004, `/srv/coex/releases/feedback-20261028`, Node 22.23.4. All four Worktello/COEX application vhosts target port 3004.
- Green port 3002 and blue port 3001 remain warm rollback slots. osTicket and the mail, desk-close and channels workers were left untouched. PM2 saved; candidate restart count 0 at final check.
- Backup and private config snapshots: `/srv/coex/shared/backups/worktello-feedback-20261028/`. `coex-2026-10-28-1602.archive.gz` passed `gzip -t`; `files-2026-10-28-1602.tar.gz` passed archive listing verification. Snapshot includes prior PM2 dump and all four prior canonical Apache vhosts.

## Scope shipped

The authorized completed feedback includes contract start dates from 2025; searchable contacts sourced from tickets; Team Activity last-active filter; Outlook email-to-task API and task-pane assets; Gantt subtasks and PDF export; 10-record initial/paginated lists; staff-only assignee controls and strict customer/staff separation; consistent filter/action styling; recurring tasks; and reduced account/query/navigation/refresh load across the application.

Owner/admin task assignment requests are deferred for the next release and are not included. No database migration, production task creation, email sending, user account changes or session expiry was performed.

## Verification and limits

- PR CI and merged-main CI passed types, lint, formatting, all 441 unit tests and production build.
- Local production build generated 83 routes. The production server build passed using Node 22.23.4.
- Isolated local MongoDB database suite under `TZ=Asia/Dubai`: 265 passed, 1 known unrelated failure. `tests/database/time.test.ts:176` expects an omitted `billable` value to count as billable; the existing service defaults it to false. With `Asia/Karachi`, two additional existing activity day-boundary fixture failures occur; those pass under the configured Dubai timezone.
- Candidate smoke checks: login, Outlook create page, task-pane/dialog assets and all Outlook icons returned 200; unauthenticated Outlook tasks API returned 401. Public HTTPS monitor: 20/20 samples returned login 200, task pane 200 and API 401. Final check confirmed all three web slots and public login return 200 and Apache config test passes.
- Authenticated production flows were not tested because staff had signed out and no user credentials were used. The Outlook manifest at `outputs/microsoft/Worktello-Outlook-production/manifest.xml` points to `https://worktello.com` but has not been sideloaded or accepted in Outlook/Microsoft 365.
- The application load reductions address the confirmed excessive account fetch. Production team freezes and earlier proxy resets have not been demonstrated to be resolved; correlate any follow-up with staff browser traces and server logs.

## Rollback

Verify `http://127.0.0.1:3002/login` returns 200. Restore the four `*.before` files from `/srv/coex/shared/backups/worktello-feedback-20261028/` into `/etc/apache2/sites-available/`, run `sudo apache2ctl configtest`, then `sudo apache2ctl graceful`. Verify `https://worktello.com/login`. Keep database and workers untouched. Leave the 3004 release and process in place until rollback is confirmed.

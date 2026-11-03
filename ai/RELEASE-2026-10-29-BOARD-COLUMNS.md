# Board column pagination live — 29 October 2026

## Board columns fixed live — 29 October 2026

PR #77 merged as `2312c21c4c43d426a37928206ed4e68aaffc0877`. Each Board status column has an independent ten-task window and Show more control; task edits retain expansion and new tasks reveal within their own column. Signed-in live Personal Board verified 5 To do, 7 In progress, 1 Blocked and initially 10 of 44 Done cards. Done expanded to 20 while To do remained 5. No production tasks changed.

Active `coex-app-board-columns` PID 559971, PM2 id 27, loopback 3007, `/srv/coex/releases/board-columns-20261029`. All four app vhosts target 3007. Prior `coex-app-show-more` PID 557684 on 3006 is immediate rollback. Workers retained PIDs/restart counts; PM2 saved. Local checks, 444 unit tests, local/server builds and PR/main CI passed; 20 HTTPS switch samples passed. Full evidence and rollback: `ai/RELEASE-2026-10-29-BOARD-COLUMNS.md`.

## Source and validation

Feature commit `1cea6909ea3e3caae6b2e1b971888920cbf14523`; feature and merged trees both `bd1e5562b54f8aad3a4339e43ef185dd0fa1f4c7`. Scope: Board rendering, shared RecordWindow component and three regressions. Original mixed checkout preserved; clean source worktree `/Volumes/sd-mac/Developer/DigiSol/worktello-show-more-live`.

Local workspace types, source ESLint, formatting, 69 unit files / 444 tests and production webpack build (83 generated entries) passed. The first concurrent typecheck raced the build's removal of generated Next type files; the sequential rerun passed. PR CI 40860709500 and merged-main CI 40861163498 passed. Server Node 22.23.4 install/build passed; prior server-action encryption key matched and old hashed static assets were copied without overwrite. Archive SHA-256 matched at both ends: `34e4a8e268b0b6cfc3c303664ce814ed582daef142b2bff2a4102ba0bc60506e`.

Dedicated local QA Space `6ae324af22c06958bfcb64f4`, database `worktello_feedback_local` on 27020: initial counts 5/7/1/44 rendered 5/7/1/10 cards. Added synthetic tasks to test two long columns: To do 10→16 while Done stayed 10; creation revealed task 17 without expanding Done; editing retained expansion; Done expanded independently to 20; moving a task retained windows; filtering reset both to 10. The labelled synthetic records remain for review. No shared/production database was used for mutation tests.

Candidate login/privacy/terms/Outlook and Teams create pages returned 200, unauthenticated Outlook API 401, and no candidate errors were logged. Apache config test passed. Twenty switch-monitor samples returned login 200, Outlook page 200 and API 401. All four proxy mappings and PM2 status verified. Workers 396424/396471/396523 remain online at their prior restart count 1. Existing release slots remain online. No task write, mail, migration, account/session mutation or worker restart occurred in production.

Signed-in live browser reloaded the actual reported Personal Board: 5 To do, 7 In progress, 1 Blocked and 10 Done task links (excluding other document links). Done expanded to 20 by keyboard while To do remained 5. At the narrow viewport, the floating timer overlaps the far-right footer button when scrolled to the bottom; keyboard activation was used for this live expansion check. Local pointer expansion passed. Screenshot showing all five To do cards: `outputs/qa/board-columns-20261029/live-todo.jpg`.

## Backup and rollback

Fresh database, attachment and PM2/configuration snapshots are at `/srv/coex/shared/backups/worktello-board-columns-20261029/` (0700 directory; 0600 files). `before-release.archive.gz` passed gzip verification; `files-before.tar.gz` passed tar listing. `https-switch-monitor.txt` records all 20 checks.

Rollback: verify `http://127.0.0.1:3006/login` returns 200. Restore the four `worktello.conf.before`, `worktello-le-ssl.conf.before`, `coex.conf.before` and `coex-le-ssl.conf.before` snapshots to their canonical `/etc/apache2/sites-available/` files, run `sudo apache2ctl configtest`, then `sudo apache2ctl graceful`. Verify public HTTPS; retain the new 3007 process until rollback is confirmed. Do not modify workers, data or sessions.

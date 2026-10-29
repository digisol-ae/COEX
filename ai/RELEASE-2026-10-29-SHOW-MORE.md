# Space Show more live — 29 October 2026

PR [#76](https://github.com/digisol-ae/COEX/pull/76) merged as `8ea8c87fa85837a36ff5f16fafcfd26fcd8a4bb9`; feature `7247d8c4204db6394517da85f99a2f912c6702de`. Feature and merge trees match `c212cef177682361d36c106569d2510252a930a8`. Scope is three source files only: Space Board/List, task creation actions and shared record-window hook. All unrelated primary-checkout edits were preserved.

Active web: `coex-app-show-more`, PM2 id 26, PID 557684, loopback 3006, `/srv/coex/releases/show-more-20261029`. All four Worktello/COEX app proxy configurations target 3006. Prior `coex-app-ui-improvements` PID 544805 on 3005 remains immediate rollback; other existing slots stay online. PM2 saved. Workers retain PIDs 396424, 396471 and 396523, each with its prior restart count 1. No worker restart, database migration, task write, email, account change or session expiry was performed.

## Verification

- Clean isolated source: workspace types, source ESLint, Prettier, 68 unit files / 441 tests and webpack production build (83 generated entries) passed.
- PR CI [40857797105](https://github.com/digisol-ae/COEX/actions/runs/40857797105) and merged-main CI [40858157937](https://github.com/digisol-ae/COEX/actions/runs/40858157937) passed.
- Server source archive SHA-256 matched local: `73707275e4608b96974453d97a3e983c3f7a822348ea962abc5f0d6311a9ef4c`. Node 22.23.4 `npm ci` and server webpack build passed. Server-action key matched the previous build; prior hashed static assets were copied without overwrite. Production environment and shared absolute storage retained.
- Candidate `/login`, `/privacy`, `/terms`, Outlook create pane and Teams create page returned 200; unauthenticated Outlook API returned 401. Candidate log had no errors.
- Apache config test passed; graceful switch. Twenty HTTPS monitor samples all returned login 200, Outlook create pane 200 and unauthenticated Outlook API 401. Canonical proxy mappings and PM2 state verified afterward.
- Signed-in production browser reloaded Personal Space and expanded 10 to 20 of 57 tasks. No production edit/create action was used for QA. Task mutation and creation behavior was verified on isolated local data in the preceding task; do not describe those as production write tests. Screenshot: `outputs/qa/show-more-20261029/live-board.jpg`.

## Backup and rollback

Private directory `/srv/coex/shared/backups/worktello-show-more-20261029/` (0700; files 0600) contains fresh database `before-release.archive.gz`, uploaded-files `files-before.tar.gz`, PM2 snapshot, four `*.conf.before` configuration snapshots and `https-switch-monitor.txt`. Gzip and tar integrity checks passed.

Rollback: first verify `http://127.0.0.1:3005/login` returns 200. Restore `worktello.conf.before`, `worktello-le-ssl.conf.before`, `coex.conf.before` and `coex-le-ssl.conf.before` to their corresponding canonical `/etc/apache2/sites-available/` files. Run `sudo apache2ctl configtest`, then `sudo apache2ctl graceful`; verify public HTTPS and leave the 3006 process online until rollback is confirmed. Do not modify database, workers or sessions.

# Worktello PWA release — 4 November 2026

Status: live at https://worktello.com/install. User requested deployment after a 15-minute delay; the scheduled attempt began at 01:07 PKT. Cutover and bounded HTTPS acceptance completed at 01:18 PKT (3 November 2026, 20:18 UTC). The one-time follow-up was deleted.

## Scope and source

PR [#80](https://github.com/digisol-ae/COEX/pull/80) merged as `5657097385434b0e66b267f613c415bb4d4b5cdb`. Initial PWA commit `8b433db` was integrated with current main `7b04e75` in tested source `7f84660e4e1aa68efcf79c185aea8c4e8e7263ea`. Source and merge have identical Git tree `b20c6b45e33ab3474a28f4c981dc1f1c8d48608f`. The PR remains sixteen PWA-specific files relative to current main; already-live Customer Resources, native signing and compatible security patches are preserved.

App manifest with stable identity, role-aware `/login` launch, standalone display, branded opaque 192/512 icons, a maskable icon and Apple touch icon. Shared staff/customer account-menu installation entry; public `/install` guide with a deferred browser prompt and manual Edge/Safari/Chrome fallback. Normal operations stay online. No service worker, offline data cache, queued writes or new push subscription.

Isolated source checkout: `/Volumes/sd-mac/Developer/DigiSol/worktello-pwa`. The original mixed checkout and other feature worktrees were untouched. The production archive includes only `apps/`, `packages/` and required root build/package configuration; it excludes exports, outputs, private datasets and backup/project artifacts present elsewhere in main. SHA-256 verified on both hosts: `ae4fbe6c6e1a003d8e71f24bd358ff047a6a0fc4e77d7b00e1b65a7998d278ea`.

## Validation

- Fresh installation against current main, workspace typecheck, CI-scoped ESLint/Prettier and 71 unit files / 455 tests passed.
- Local and server standard Next 16.4.5 Turbopack production builds passed. An optional Webpack attempt failed on the existing resource-preview `node:crypto` import; the project-standard build, also used by CI/current production, passed. No unrelated bundler change was made.
- Refreshed PR CI [41709986532](https://github.com/digisol-ae/COEX/actions/runs/41709986532) and merged-main CI [41710581319](https://github.com/digisol-ae/COEX/actions/runs/41710581319) passed before cutover.
- Candidate login/install/privacy/terms/Outlook pages returned 200; unauthenticated Outlook API 401; invalid signing link rendered its refusal and invalid receipt returned 404. Manifest and all icon bytes matched source. Install HTML links the manifest and Apple touch icon; server-candidate guide rendered in the browser.
- Portable manual JSON/JavaScript matched; packaging passed with 77 source/assets, 32 chapters and 18 resolutions. No generated ZIP was committed.

## Production cutover

Active PM2 `coex-app-pwa`, id 12/PID 61787, zero restarts, cwd `/srv/coex/releases/pwa-20261104/apps/web`. Listener `127.0.0.1:3010`; actual executable `/srv/coex/shared/runtimes/node-v22.23.4-linux-x64/bin/node`, Next 16.4.5. Existing canonical environment, absolute shared storage and server-action encryption key preserved. Old hashed static assets copied without overwriting new assets. `RELEASE.json` records source/merge/archive/CI/cutover evidence.

All four canonical Worktello/COEX vhost upstreams changed only from 3009 to 3010 after confirming they were unchanged since preflight. Apache configtests and graceful reload passed; PM2 saved. Twenty public HTTPS samples passed for login/install/manifest 200 and unauthenticated Outlook API 401. Ten live hashed assets and all manifest icons matched candidate bytes. Candidate error log remained empty. The previous native-signing app on 3009 remains online and login returns 200. Mail/desk-close/channels retain PIDs 906/907/908, zero restarts; other web slots and osTicket were untouched.

Signed-in live browser reloaded the dashboard, opened account menu → Install Worktello, and rendered the guide at the production hostname. Existing signature tracking and Customer Resources library/history also rendered. No customer resource upload/share, signature request, contract/task edit, email, account/password/session mutation, session expiry or database migration was used for release acceptance.

Actual OS installation on Windows/Edge and Mac/Safari, native prompt acceptance/cancellation, standalone-mode user testing, fresh password/Microsoft sign-in and attachment/download workflows inside an installed window remain pilot acceptance. The in-app browser displayed the manual fallback and did not offer a native install prompt. Source/build/HTTP checks do not establish those unperformed tests. Public guide screenshot: `/tmp/worktello-pwa-live.png` (local evidence).

## Backups and immediate rollback

Private directory `/srv/coex/shared/backups/pwa-20261104/` (0700) contains PM2/environment and worker snapshots, all four canonical vhost snapshots, candidate process configuration, database archive (3,538,647 bytes), storage archive (38,852,720 bytes), and the twenty-sample HTTPS monitor. Database gzip and storage tar integrity checks passed. Never publish these private files.

First verify `http://127.0.0.1:3009/login` returns 200. Restore `worktello.conf.before`, `worktello-le-ssl.conf.before`, `coex.conf.before` and `coex-le-ssl.conf.before` from the private backup directory to their canonical files in `/etc/apache2/sites-available/`. Run `sudo apache2ctl configtest`, then `sudo apache2ctl graceful`, and verify public HTTPS. Retain both web processes and shared data/keys/workers. Do not restore the database or expire sessions for an application rollback. Documentation-only updates require no rebuild/restart.

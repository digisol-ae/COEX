# Customer Resources live — 4 November 2026

PR [#79](https://github.com/digisol-ae/COEX/pull/79) merged as `6f704035702d8a569e063e6cbedf75bc6a2c27dc`, source head `9748b1ab463c8fcc01af64014102c779dcad4e3f`. Cutover verified 4 November 2026 at 00:24 PKT (3 November 19:24 UTC). Scope is Customer Resources, the inline ticket sharing tab, same-page document previews and DigiSol footer/logo link. The separate local signing/features commit is not part of this release.

## Active release

- Directory: `/srv/coex/releases/customer-resources-20261104`.
- PM2: `coex-app-customer-resources`, id 10, PID 56939, zero restarts. Runtime Node 22.23.4, listener `127.0.0.1:3008`; PM2 cwd is the release's `apps/web` directory.
- All four Worktello/COEX app vhosts proxy to 3008. Apache configtest passed; graceful reload completed; PM2 saved.
- Immediate rollback: `coex-app-board-columns`, id 9/PID 916, `/srv/coex/releases/board-columns-20261029`, loopback 3007; login verified 200 after cutover.
- Mail/desk-close/channels retained PIDs 906/907/908, ids 0/1/2, zero restarts. osTicket and other slots were not changed.
- Private snapshots and monitor: `/srv/coex/shared/backups/customer-resources-20261104/`. The PM2 snapshot contains environment values and must not be published.

## Evidence

Latest-head PR CI [41627319812](https://github.com/digisol-ae/COEX/actions/runs/41627319812) and merged-main CI [41702207087](https://github.com/digisol-ae/COEX/actions/runs/41702207087) passed. Fresh local unit run: 71 files / 455 tests passed. Prior isolated real-Mongo/email coverage: 20 tests, described in the feature QA record. Server `npm ci`, production Turbopack build, types and all 86 generated entries passed. Archive SHA-256 matched both ends: `dc9229d04efcf1ccb3fa18581d0f0ddfd297c6d5a77ffaa37ac9cb8279770837`.

Candidate preserved the existing private environment, canonical `https://worktello.com` URL, auth/database configuration, absolute writable shared storage, active server-action encryption key and prior hashed static assets. Built key equality and actual Node executable were verified without exposing secrets. Existing mail delivery reads the explicit standard sender attached to resource-share rows; no worker restart is required.

Candidate and post-switch login, legal pages, Outlook pane, logo asset, customer unavailable-link branding and bundled PDF worker returned 200. The traffic-switch monitor passed 20/20 public HTTPS login samples. Authenticated browser acceptance after cutover confirmed Customer resources navigation/library and sharing form with the 72-hour default. A request begun before the switch showed the old 404; reload after verified cutover rendered the new library successfully. Candidate error log was empty at the final check.

Screenshot, kept locally rather than published into the manual: `outputs/qa/customer-resources-release-20261104/live-library.png` in the primary checkout. The live library is intentionally empty; no synthetic local fixtures were migrated. No real email, customer upload, account/password/session change or data migration was performed. End-to-end real inbox delivery, customer document sharing and approved video playback remain production pilot acceptance; local synthetic flow evidence remains in `docs/qa/CUSTOMER-RESOURCES-2026-11-03.md`.

## Rollback

Verify `http://127.0.0.1:3007/login` returns 200. Restore the four `worktello.conf.before`, `worktello-le-ssl.conf.before`, `coex.conf.before` and `coex-le-ssl.conf.before` files from the private backup directory to the corresponding canonical files in `/etc/apache2/sites-available/`. Run `sudo apache2ctl configtest`, then `sudo apache2ctl graceful`; verify public HTTPS and authenticated navigation. Retain both application slots until traffic is confirmed. Do not delete additive resource/share data, shared uploads or sessions, and do not restart workers. Documentation-only sync does not require rebuilding/restarting this release.

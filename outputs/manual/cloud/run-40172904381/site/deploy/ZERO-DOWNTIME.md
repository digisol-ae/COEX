# COEX isolated web rollout — current operating state

## Outlook web fixed; local interactive manual added — 25 October 2026

Application `d547d25` (PR #44) is live. Exact Outlook web embedding hosts and Microsoft client were added while retaining signed-token, tenant, scope and staff checks. Owner explicitly approved Entra preauthorization at action time; persisted state verified. All 348 tests, types/lint/format, local/server 75-page builds and PR/main CI passed. Real Outlook web SSO/list/detail and blank create-form rendering passed; fresh Teams web SSO/list/create-form reads also passed. No production task/time/message/assignment/import mutation for the demonstration.

Active green `coex-app-green` id 13 / PID 318054 on 3002, `/srv/coex/releases/outlook-web-20261025`; blue id 9 / PID 302605 on 3001 remains fallback. Workers 10/11/12 remain unchanged in `/srv/coex/releases/worktello-20261025`. All five Node process trees 22.23.4 verified. 40/40 switch samples succeeded; 1 old tenant session revoked at 2026-10-25T01:43:47Z, zero old unexpired remain and one later login preserved. Full scope/backup/rollback/evidence: `docs/resolutions/2026-10-25-outlook-web.md`.

Manual: `docs/manual/index.html` (27 chapters, searchable role guides, reading checklists, image zoom and print option), canonical content.json, generated offline content.js, CSS/JS, actual safe screenshots/provenance and QA limits. Seven documented resolutions indexed in `docs/resolutions/README.md`; each future resolution must update the dated record, manual and local screenshot evidence. Portable package: `outputs/manual/Worktello-Manual-2026-10-25.zip`. Source/assets remain organized in the local SSD checkout and GitHub; secrets/private environments/backups/business exports are excluded. Manual is a repository/local artifact, not a newly public production route. Desktop/mobile/write-flow and physical-print limits are explicit in `docs/manual/QA.md`.

Current rollback is **green 3002 → blue 3001**. First verify blue login200; restore `/srv/coex/shared/apache-before-outlook-20261025054347/` canonical configs (or change only both ProxyPass/ProxyPassReverse mappings3002→3001), configtest and graceful reload. Blue does not include the Outlook fix. Keep workers untouched. Backup archives: coex-2026-10-25-0537.archive.gz and files-2026-10-25-0537.tar.gz, integrity checked. Monitor `/tmp/coex-outlook-switch-20261025054347.log`. Earlier mapping instructions below are historical. Docs/manual-only sync requires no build/restart or second session expiry.


## Completed-work release deployed — 25 October 2026

Application `4701314` (PR #42; branding #40 and Node #41 included) is live at https://coex.digisol.ae. Fresh 342 unit tests, types/lint/format, Docker CSV/Gantt integration, local/server 75-page builds and PR/main CI passed. Active blue `coex-app` id 9 / PID 302605 on 3001; green id 8 / PID 303896 on 3002 remains fallback. Three workers now run in `/srv/coex/releases/worktello-20261025` (mail 10, desk-close 11, channels 12), not the original checkout. All five application process trees verified Node 22.23.4; PM2 saved. 40/40 switch health samples succeeded ; 20 old tenant sessions expired, zero old unexpired remain, later login preserved.

Existing Teams catalog app updated to Worktello 1.2.0 and verified after reload. Real Teams web SSO/list reads and ordinary web Microsoft sign-in passed; full role/device/write pilot remains. What's new contains user-facing planning/Teams/data-transfer features plus generic maintenance counts, no branding announcement. Full backup, PIDs, CI, limitations and rollback: `ai/RELEASE-2026-10-25.md`; operating guide: `deploy/ZERO-DOWNTIME.md`. This entry supersedes earlier pending/local-only statements. Do not repeat expiry/restart for docs-only sync. Unrelated `projects/` preserved.

Current rollback is **blue 3001 → green 3002**, after checking green login 200. Restore `/srv/coex/shared/apache-before-worktello-20261024231458/` canonical configs, configtest and graceful reload. Workers are now in the new release; the earlier “workers unchanged in /srv/coex/app” instructions below are historical. For a runtime patch, controlled one-at-a-time worker migration is necessary; a normal web-only release should leave workers alone. `/usr/bin/node` and PM2 daemon remain separate from explicit 22.23.4 application interpreters. Never change cwd with `pm2 startOrRestart` and assume it worked; verify pm_cwd/script and actual descendant executables. PM2 delete/start using a private preserved environment was required here.


## Active slots after Teams personal tab — 23 October 2026

- Apache COEX vhosts target `http://127.0.0.1:3002/`.
- Active green: coex-app-green id8 / PID214898, /srv/coex/releases/teams-tab-20261023, application merge6dfcf1509c46b1963c0e8de886adfe58c6ba004e.
- Warm blue fallback: coex-app id7 / PID184237, /srv/coex/releases/entra-redirect-20261022, port3001. Old green id6 retired only while blue served traffic.
- Exactly three unchanged workers remain in /srv/coex/app; five intentional PM2 entries saved. Existing ignored environment/shared storage retained.
- Latest monitor40/40 HTTPS200. Apache snapshots: /srv/coex/shared/apache-before-teams-tab-20261023092338. Rollback: verify blue 3001 login 200, change both canonical vhost mappings3002→3001, configtest, graceful reload and public HTTPS verification. Do not restart workers.
- Tenant-scoped session expiry: 7 old sessions revoked at cutoff2026-10-23T05:23:38Z; new post-cutoff sessions preserved. No repeated expiry for docs-only sync.
- Evidence and remaining installation/pilot: ai/RELEASE-2026-10-23-TEAMS-TAB.md. Older mapping/rollback instructions below are historical and superseded here.

Owner permits a short maintenance interruption if necessary. Isolated builds/healthy candidate switching remain the current procedure. The old `deploy/release.sh` builds in the original folder and does not target the active web slot. Inspect Apache and PM2 before acting; `/srv/coex/app` currently hosts workers/configuration only.

## Procedure used

1. Verify clean source, capacity, existing app health and unused alternate loopback port.
2. Add an isolated detached Git worktree for the exact reviewed release. Link the existing ignored `.env`; verify storage is shared/absolute. Run `npm ci` and build there while current traffic continues.
3. Privately set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` from the running build's server-reference manifest for the candidate build/runtime, preserving already-open forms. Never print the key. Copy old `.next/static` hashed files into the candidate without overwriting new files, preserving old tabs' assets. These measures reduce version skew; major server-action changes need additional compatibility planning.
4. Start only the candidate web process on a loopback alternate port. Verify login, policies, Teams dialog, asset contents and correct revision. Require passing PR and merged-main CI.
5. Back up the two COEX vhost configs privately. Change only their ProxyPass/ProxyPassReverse mappings. Preserve standard sites-enabled symlinks (`sed --follow-symlinks` when editing them), or update canonical sites-available files and atomically replace enabled links.
6. Run `sudo apache2ctl configtest`, then `sudo apache2ctl graceful`. Monitor HTTPS through the actual hostname/vhost throughout; revert mappings immediately on failure. Keep the old web app available; do not stop/restart existing workers.
7. Verify public assets and viewport layouts, inspect process state, save PM2 and document the actual active slot. A docs-only source pull does not require restarting the application.

The 22 October logo switch observed 40/40 HTTP 200 responses. That is a bounded monitor result, not a guarantee that every user request or authenticated workflow was tested.

## Owner-requested release session expiry

At verified healthy cutover, inspect unexpired/recent COEX tenant sessions. Mark existing pre-cutoff sessions revokedAt using a fixed release cutoff and explicit tenant scope; do not delete accounts, reset passwords or print session tokens. New sessions created after cutoff must remain valid. Allow already authorised work to finish. Existing auth checks return expired sessions to sign-in on next protected request/navigation; this is not an immediate client logout or unsaved-draft preservation feature. Log counts and verify zero matching old sessions remain.

For 22 October tutorial maintenance: cutoff 2026-10-22T15:19:18Z, 23 revoked, 0 old unexpired sessions remaining. No need to re-expire sessions on a docs-only pull.

## Rollback for the tutorial release

Blue fallback on port 3001 must first return 200 at `/login`. Restore both COEX ProxyPass/ProxyPassReverse mappings from `http://127.0.0.1:3002/` to `http://127.0.0.1:3001/` in canonical `/etc/apache2/sites-available/coex.conf` and `coex-le-ssl.conf`. Test Apache config before a graceful reload. Verify public HTTPS and continue monitoring. No worker or web process needs stopping for this traffic switch. Vhost snapshots: `/srv/coex/shared/apache-before-tutorial-20261022191918/`.

Fallback code restores prior self-email behavior along with prior availability. Session expiry is shared database state and stays in effect across rollback; users can sign in again. Historical logo/email snapshots and old port instructions are superseded by this active mapping. Each of the three 22 October switches observed 40/40 successful HTTPS samples, a bounded monitor result rather than proof of every user workflow.

Do not reset source, delete a release directory, rebuild fallback or remove either slot during emergency rollback. Retire fallback only through planned cleanup after acceptance, updating this runbook and saved PM2 state. Docs-only source sync needs no rebuild/restart/session expiry.

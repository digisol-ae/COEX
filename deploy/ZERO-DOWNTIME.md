# COEX isolated web rollout — current operating state

## Active slots after Teams personal tab — 23 October 2026

- Apache COEX vhosts target `http://127.0.0.1:3002/`.
- Active green: coex-app-green id8 / PID214898, /srv/coex/releases/teams-tab-20261023, application merge6dfcf1509c46b1963c0e8de886adfe58c6ba004e.
- Warm blue fallback: coex-app id7 / PID184237, /srv/coex/releases/entra-redirect-20261022, port3001. Old green id6 retired only while blue served traffic.
- Exactly three unchanged workers remain in /srv/coex/app; five intentional PM2 entries saved. Existing ignored environment/shared storage retained.
- Latest monitor40/40 HTTPS200. Apache snapshots: /srv/coex/shared/apache-before-teams-tab-20261023092338. Rollback: verify blue3001 login200, change both canonical vhost mappings3002→3001, configtest, graceful reload and public HTTPS verification. Do not restart workers.
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

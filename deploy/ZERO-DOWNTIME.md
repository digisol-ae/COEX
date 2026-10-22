# COEX isolated web rollout — current operating state

## Active slots after Microsoft/footer release — 22 October 2026

- Apache COEX vhosts target `http://127.0.0.1:3001/`.
- Active blue: `coex-app` id7 / PID184237, `/srv/coex/releases/entra-redirect-20261022`, application merge `f266afe451f3881ffd6ef707b121b0deba0a705f`.
- Warm green fallback: `coex-app-green` id6 / PID181724, `/srv/coex/releases/tutorial-origin-20261022`, port3002. Former blue id5 retired while green served traffic.
- Exactly three unchanged workers run from `/srv/coex/app`; five intentional PM2 entries saved. Existing ignored environment and shared storage preserved.
- Latest switch: 40/40 HTTPS200; Apache snapshots `/srv/coex/shared/apache-before-entra-20261022194406/`. Rollback: verify green login200, change both canonical vhost mappings3001→3002, configtest, graceful reload, verify public HTTPS. No worker restart.
- Latest tenant session expiry: three revoked at fixed cutoff2026-10-22T15:44:07Z; later logins excluded. No repeated expiry for docs-only pull.
- Full evidence: `ai/RELEASE-2026-10-22-ENTRA-FOOTER.md`. Older tutorial rollback directions below are historical and superseded by the current mapping here.

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

# COEX isolated web rollout — current operating state

## Active slots after Teams email correction — 22 October 2026

- Public Apache COEX vhosts target `http://127.0.0.1:3001/`.
- Active web: PM2 `coex-app` id 5, `/srv/coex/releases/teams-email-6a41d1f`, application merge `530e19225b6839dd9c7446999418b07c3a5ac446`.
- Warm fallback: PM2 `coex-app-green` id 4, `/srv/coex/releases/logo-bb66964`, port 3002. Keep its build intact until deliberately retired. The prior original web process id 0 was retired while green served traffic, before reusing blue port 3001.
- `coex-mail`, `coex-desk-close`, `coex-channels` each still run once from `/srv/coex/app`, with unchanged PIDs. A web-only change must not duplicate/restart these workers.
- Five processes are intentional: active/fallback web plus three workers. PM2 startup state saved. Releases link the existing ignored root `.env`; storage remains shared. Never copy credentials into docs/output.

The old `deploy/release.sh` builds in the original folder and restarts four services. It is **not the no-downtime rollout procedure** and does not target the active isolated web release. Future deployers must inspect Apache and PM2 before acting. Current `/srv/coex/app` serves workers and configuration only.

## Procedure used

1. Verify clean source, capacity, existing app health and unused alternate loopback port.
2. Add an isolated detached Git worktree for the exact reviewed release. Link the existing ignored `.env`; verify storage is shared/absolute. Run `npm ci` and build there while current traffic continues.
3. Privately set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` from the running build's server-reference manifest for the candidate build/runtime, preserving already-open forms. Never print the key. Copy old `.next/static` hashed files into the candidate without overwriting new files, preserving old tabs' assets. These measures reduce version skew; major server-action changes need additional compatibility planning.
4. Start only the candidate web process on a loopback alternate port. Verify login, policies, Teams dialog, asset contents and correct revision. Require passing PR and merged-main CI.
5. Back up the two COEX vhost configs privately. Change only their ProxyPass/ProxyPassReverse mappings. Preserve standard sites-enabled symlinks (`sed --follow-symlinks` when editing them), or update canonical sites-available files and atomically replace enabled links.
6. Run `sudo apache2ctl configtest`, then `sudo apache2ctl graceful`. Monitor HTTPS through the actual hostname/vhost throughout; revert mappings immediately on failure. Keep the old web app available; do not stop/restart existing workers.
7. Verify public assets and viewport layouts, inspect process state, save PM2 and document the actual active slot. A docs-only source pull does not require restarting the application.

The 22 October logo switch observed 40/40 HTTP 200 responses. That is a bounded monitor result, not a guarantee that every user request or authenticated workflow was tested.

## Rollback for the Teams email release

The green fallback on port 3002 must first return 200 at `/login`. Restore both COEX ProxyPass/ProxyPassReverse mappings from `http://127.0.0.1:3001/` to `http://127.0.0.1:3002/` in the canonical files `/etc/apache2/sites-available/coex.conf` and `coex-le-ssl.conf`. Run Apache config test before a graceful reload. Confirm public HTTPS and continue monitoring. No web process or worker needs stopping for this traffic switch. Previous vhost snapshots: `/srv/coex/shared/apache-before-teams-email-20261022102033/`.

The earlier logo rollout remains historical evidence: snapshots `/srv/coex/shared/apache-before-logo-20261022095700/`, 40/40 monitor HTTP 200 responses. Its old original port-3001 process is superseded, so do not restore that old mapping blindly. The email correction also observed 40/40 successful samples.

Do not reset source, delete a release directory, rebuild the fallback or remove either slot during emergency rollback. Retire a fallback only in a separately planned cleanup after acceptance; update this runbook and PM2 saved state at that time. A docs-only pull into the active release requires no rebuild or restart.

# COEX isolated web rollout — current operating state

## Active slots after 22 October 2026

- Public Apache COEX vhosts target `http://127.0.0.1:3002/`.
- Active web: PM2 `coex-app-green` id 4, `/srv/coex/releases/logo-bb66964`, application merge `a5d5356f4d903556df8cf01217e38d64c49c9de9`.
- Warm fallback: PM2 `coex-app` id 0, `/srv/coex/app`, port 3001. Keep its old `.next` build intact until the fallback is deliberately retired.
- `coex-mail`, `coex-desk-close`, `coex-channels` each run once from `/srv/coex/app`. A web-only change must not create another copy of these workers.
- Five processes are intentional during this rollback window. PM2 startup state saved. The active slot has a symlink to the existing root `.env`, whose storage points to shared persistent storage. Never copy credentials into docs/output.

The old `deploy/release.sh` builds in the original live folder and restarts four services. It is **not the no-downtime rollout procedure** and does not currently target the active green web app. Future deployers must inspect Apache and PM2 before acting.

## Procedure used

1. Verify clean source, capacity, existing app health and unused alternate loopback port.
2. Add an isolated detached Git worktree for the exact reviewed release. Link the existing ignored `.env`; verify storage is shared/absolute. Run `npm ci` and build there while current traffic continues.
3. Privately set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` from the running build's server-reference manifest for the candidate build/runtime, preserving already-open forms. Never print the key. Copy old `.next/static` hashed files into the candidate without overwriting new files, preserving old tabs' assets. These measures reduce version skew; major server-action changes need additional compatibility planning.
4. Start only the candidate web process on a loopback alternate port. Verify login, policies, Teams dialog, asset contents and correct revision. Require passing PR and merged-main CI.
5. Back up the two COEX vhost configs privately. Change only their ProxyPass/ProxyPassReverse mappings. Preserve standard sites-enabled symlinks (`sed --follow-symlinks` when editing them), or update canonical sites-available files and atomically replace enabled links.
6. Run `sudo apache2ctl configtest`, then `sudo apache2ctl graceful`. Monitor HTTPS through the actual hostname/vhost throughout; revert mappings immediately on failure. Keep the old web app available; do not stop/restart existing workers.
7. Verify public assets and viewport layouts, inspect process state, save PM2 and document the actual active slot. A docs-only source pull does not require restarting the application.

The 22 October logo switch observed 40/40 HTTP 200 responses. That is a bounded monitor result, not a guarantee that every user request or authenticated workflow was tested.

## Rollback for this release

The old app on port 3001 must first return 200 at `/login`. Restore both COEX ProxyPass/ProxyPassReverse mappings from `http://127.0.0.1:3002/` to `http://localhost:3001/` in the canonical files `/etc/apache2/sites-available/coex.conf` and `coex-le-ssl.conf`. Run Apache config test before a graceful reload. Confirm public HTTPS and continue monitoring. No web process or worker needs stopping for this switch. Original vhost snapshots: `/srv/coex/shared/apache-before-logo-20261022095700/`.

Do not reset source, delete a release directory, rebuild the fallback or remove either slot as part of emergency traffic rollback. Retire a fallback only in a separately planned cleanup after acceptance; update this runbook and PM2 saved state at that time.

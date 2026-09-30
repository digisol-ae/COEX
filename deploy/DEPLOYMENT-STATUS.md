# COEX live deployment: state as of 19 Sep 2026

## Release ready; deployment blocked — 1 Oct 2026
- John authorized commit, push and deployment of the current local bundle, followed by Mac
  shutdown after verification. Local build/types/lint/format, database and browser QA pass.
- VPS revision/process status remains unverified. Codex SSH was refused because macOS denied
  the Downloads SSH key; agent fallback failed. Terminal access is blocked. No live change made.
- Deployment requires native terminal access to the existing key. Follow ai/HANDOFF.md's
  newest release section. Preserve Apache/Zabbix; no OS patching or new proxy is required.
- After a clean --ff-only pull, run npm ci and npm run build, restart both coex-app and coex-mail
  with --update-env. Start or restart coex-desk-close using npm run desk:worker, then pm2 save.
  Verify the exact deployed SHA, all processes and public HTTPS before shutting down the Mac.

## Local release preparation — 1 Oct 2026
- Desk-close scheduling/retry and lint defects fixed locally; TypeScript, 69 unit tests and
  production build pass. Full database QA last passed on 30 Sep before these fixes.
- Worker changes are uncommitted; deployment remains unverified. No server access in this
  continuation. Continue local QA; deployment is not part of the current work.

## Verification — 30 Sep 2026
- Public login responds HTTP 200.
- GitHub main is 0f5e858. VPS HEAD and pm2 process state could not be checked because macOS
  denied access to the SSH key. Do not assume the uncommitted desk-close worker is deployed.
- Current local QA: 189/189 pass; TypeScript/build pass. CI lint and desk-close timing/retry
  issues remain release blockers. See ai/HANDOFF.md.

This is what is ACTUALLY running, for a fresh session. It diverges from DEPLOY.md:
the live box uses pm2 (not systemd) and a single app dir (not releases/current).
Follow this file for the live server; DEPLOY.md is the original design only.

## Deploy history
- 19 Sep 2026: first deploy, fresh seed (after the Spaces change, so no `migrate:spaces` needed).
- 22 Sep 2026: Batch A redeployed; accepted by John in testing.

## Server
- Contabo VPS, host `zabbix-server`, IP 194.163.137.54, Ubuntu 24.04, 6 vCPU / 12 GB.
- SSH: `ssh -i ~/Downloads/digisol-zabbix.pem digisol@194.163.137.54`
  (this key is Raheel's, shared; rotate to John's own key later.)
- `digisol` has PASSWORDLESS sudo.
- Shares the box with Zabbix at https://nms.digisol.ae (Apache). Do NOT install nginx.
  Always `sudo apache2ctl configtest` before `sudo systemctl reload apache2` (never restart).

## COEX
- Live: https://coex.digisol.ae  (Let's Encrypt cert via certbot --apache, auto HTTP->HTTPS).
- Code: /srv/coex/app  (git clone of digisol-ae/COEX, main).
- Process: pm2 app `coex-app`, runs as user `digisol`, `next start` on port 3001.
  pm2 resurrects on reboot (pm2 startup + pm2 save done).
- Apache vhost: /etc/apache2/sites-available/coex.conf -> ProxyPass to localhost:3001.
- Env: /srv/coex/app/.env
    MONGODB_URI=mongodb://coex_app:***@127.0.0.1:27017/coex?authSource=admin
    STORAGE_DIR=/srv/coex/shared/storage
    NODE_ENV=production
- Uploads: /srv/coex/shared/storage (owned by digisol).

## Database
- MongoDB 8.0, local only (bound 127.0.0.1), auth ENABLED.
- db `coex`, app user `coex_app` (readWrite). Node 22.23.2.

## Admin
- ali@digisol.ae (password set at seed; changeable in-app).

## Backups
- Nightly 2am cron (user digisol) -> /srv/coex/shared/backups via deploy/backup.sh
  (mongodump + tar of storage, 14-day retention). Copy off-box periodically.

## Email worker (from 24 Sep 2026)
- Third pm2 process `coex-desk-close`: `pm2 start npm --name coex-desk-close -- run desk:worker`,
  then `pm2 save`. Set `OFFICE_TZ` (default Asia/Dubai) if the office is elsewhere.
- Second pm2 process `coex-mail`: `pm2 start npm --name coex-mail -- run email:worker`, then
  `pm2 save`. It reads the same /srv/coex/app/.env. Restart it with the app after each redeploy.
- .env needs `COEX_ENCRYPTION_KEY` (openssl rand -base64 32, never change it) and
  `COEX_APP_URL=https://coex.digisol.ae`.
- Mailbox and SMTP details are entered in COEX, Setup, Email, not in .env.

## Redeploy after a git push to main
    cd /srv/coex/app && git pull && npm ci && npm run build && pm2 restart coex-app

## Watch out for
- 183 pending apt updates; patch during a quiet hour before the test ends.
- Rotate off Raheel's SSH key.
- Run `npm run migrate:spaces` ONLY against a database written before the Spaces change;
  a fresh seed does not need it.

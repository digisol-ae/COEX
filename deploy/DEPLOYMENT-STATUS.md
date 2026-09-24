# COEX live deployment: state as of 19 Sep 2026

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

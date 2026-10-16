# COEX live deployment

## Deployed — 16 Oct 2026, 4d95d74 (Claude, run by John)

- PR https://github.com/digisol-ae/COEX/pull/21 merged into main as `4d95d74`; John ran the usual
  redeploy (ff-only pull, npm ci, build, restart of coex-app, coex-mail, coex-desk-close and
  coex-channels with --update-env, pm2 save) and reported everything fine. A first attempt earlier
  that day pulled only documentation because the PR was not yet merged; check the pull output lists the
  code files.
- Live now: team feedback T1 to T5, T7, T8, T11, T12, Assigned by me, browser notifications, Dark theme
  fixes, the new menu and phone menu, What's new `2026-10-15`. Leads on the API stays OFF.
- Open: confirm `scripts/copy-planned-to-estimate.ts` was run (dry run, then `APPLY=1`); `npm ci` on the
  server reports 5 high severity packages, `npm audit --omit=dev` not yet checked.

## Release ready for production — 16 Oct 2026 (Claude)

- Branch `claude/gallant-faraday-r1u4g8` (not yet merged to main): team feedback T1 to T5, T7, T8, T11,
  T12, Assigned by me, Dark theme fixes, browser notifications, phone menu, Leads on the API behind a
  flag (OFF: `COEX_API_MODULES` unset, so no API process is needed). John ran `npm test` on his Mac
  (all passing so far) and checked the app locally. Production build, typecheck, ESLint and unit tests
  pass in a scratch copy.
- Deploy as usual (fresh terminal, backup first): ff-only pull, `npm ci`, `npm run build`,
  `pm2 restart coex-app coex-mail coex-desk-close coex-channels --update-env`, `pm2 save`.
- After deploy, once: `npx tsx --env-file=.env scripts/copy-planned-to-estimate.ts` (dry run), then
  `APPLY=1 npx tsx --env-file=.env scripts/copy-planned-to-estimate.ts`.
- Check afterwards: sign in with Microsoft and with a password; a task start time of 9:00 stays 9:00;
  resolve a test ticket with a timer running; the phone menu on a real phone.

## Release pending — 3 Oct 2026

John authorized today’s commit/push and server pull. Feature commit `955ea3f` exists locally
on `claude/dreamy-carson-86yxhh`; documentation-only handover follow-up follows it. Local unit/types/lint/format checks pass.
Native build, focused DB tests and GitHub CI remain required before live pull. Server HEAD and
process state have not been reverified; last documented live revision remains dd037e6.
No push or deployment performed by this preparation.

Live at `dd037e6` since 1 Oct 2026 (PR #2, Team history; PR #1 before it). Pending: PR #3
(task origin), merged to main, waiting for John's deploy. See ai/HANDOFF.md, START HERE.

## Deployed — 1 Oct 2026, 126767a (Claude)

- PR https://github.com/digisol-ae/COEX/pull/1 merged into main as `126767a` (CI green) and
  deployed by John: pull, npm ci, build, restart of coex-app, coex-mail and coex-desk-close with
  --update-env, pm2 save. VPS HEAD `126767a`; pm2 shows one of each, all online.
- Live now: Back arrow, task status picker on the task page, tooltips kept on screen, Personal
  and Space pages listing only their own tasks, What's new `2026-10-01-b`.
- Open item: `npm ci` on the VPS reports "1 critical severity vulnerability". Not investigated
  yet; never run `npm audit fix --force` on the server.

## Deployed and verified — 1 Oct 2026 (Claude)

- VPS /srv/coex/app is at 7afa81e, the same as GitHub main. John ran the deployment by hand:
  ff-only pull, npm ci and npm run build (only the four known storage.ts tracing warnings),
  then restarted coex-app and coex-mail with --update-env.
- coex-desk-close was already running, so `pm2 start` added a second copy. The extra copy was
  deleted, the remaining one restarted with --update-env, and pm2 save run again. pm2 now shows
  exactly one each of coex-app, coex-mail and coex-desk-close, all online. The desk-close
  worker logs "starting (office tz Asia/Dubai)". ".env.local not found" in its error log is
  harmless.
- https://coex.digisol.ae/login returns HTTP/1.1 200 OK.
- On future redeploys, run `pm2 restart coex-desk-close --update-env`; never `pm2 start` it again.
- The deployment blocker is cleared. The authorized Mac shutdown may proceed.

## Verified release outcome — 1 Oct 2026

- Release commit bd65e26dabadb97d9537a215512968e1e4f0484d is pushed to GitHub main.
- Exact release CI is green (install, types, lint, formatting, unit tests and production build):
  https://github.com/digisol-ae/COEX/actions/runs/36775161483
- Full isolated QA passed 208 tests; final unit run passed 79, and the final focused desk/status
  database run passed 5. Final source/build/browser checks are recorded below.
- VPS deployment did not happen: the documented SSH key is blocked by macOS privacy access;
  agent authentication failed, Terminal AppleEvents timed out, and Computer Use denied Terminal.
  No server configuration, processes or data were changed. Keep the existing authorized release
  deployment pending until John can resolve native SSH access.
- Mac shutdown was not performed because the requested deployment could not be completed and
  verified. Claude's next step is the deployment procedure below, then the authorized shutdown.
- A documentation-only follow-up records this outcome; use the source release SHA above to
  identify the tested feature bundle. Temporary QA env copy removed; real env files untouched.

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
- Fourth pm2 process `coex-channels` (from M6.1): `pm2 start npm --name coex-channels -- run channels:worker`,
  then `pm2 save`. Sends the WhatsApp outbox in test mode or XVERSE Case A.
- Third pm2 process `coex-desk-close`: `pm2 start npm --name coex-desk-close -- run desk:worker`,
  then `pm2 save`. Set `OFFICE_TZ` (default Asia/Dubai) if the office is elsewhere.
- Second pm2 process `coex-mail`: `pm2 start npm --name coex-mail -- run email:worker`, then
  `pm2 save`. It reads the same /srv/coex/app/.env. Restart it with the app after each redeploy.
- .env needs `COEX_ENCRYPTION_KEY` (openssl rand -base64 32, never change it) and
  `COEX_APP_URL=https://coex.digisol.ae`.
- Mailbox and SMTP details are entered in COEX, Setup, Email, not in .env.

## Redeploy after a git push to main
    cd /srv/coex/app && git pull --ff-only && npm ci && npm run build
    pm2 restart coex-app coex-mail coex-desk-close --update-env && pm2 save

## Watch out for
- 183 pending apt updates; patch during a quiet hour before the test ends.
- Rotate off Raheel's SSH key.
- Run `npm run migrate:spaces` ONLY against a database written before the Spaces change;
  a fresh seed does not need it.


## Cutover to apps/web (12 Oct 2026, revamp Phase 1d)

The Next.js app now lives in `apps/web`. The build lands in `apps/web/.next`, not `/srv/coex/app/.next`,
so a `next start` that was started from the repository root has nothing to serve. `.env` stays at
`/srv/coex/app/.env` (the launcher `apps/web/bin/run-next.mjs` reads it). The workers, `npm run ...`
commands, port and Apache are unchanged. Do this once, outside office hours, and watch the site after.

1. Before the pull, record how `coex-app` is defined: `pm2 describe coex-app` (note "script path",
   "script args", "exec cwd" and any PORT). Take a backup first, in a subshell so the
   settings do not stay in your terminal: `(cd /srv/coex/app && set -a && . ./.env && set +a && bash deploy/backup.sh)`.
2. Pull, install and build. The old root `.next` stays untouched until you delete it, so the running
   site keeps serving while this runs:
       cd /srv/coex/app && git status --short          # must be empty
       git pull --ff-only && npm ci && npm run build
   Run this in a fresh terminal. A terminal that has loaded `.env` has `NODE_ENV=production`, and then
   `npm ci` leaves out the build tools (Tailwind and others) and the build fails with "Cannot find
   module '@tailwindcss/postcss'". If you see that, open a new terminal and run it again.
3. Restart the workers as usual (they run from `apps/api`):
       pm2 restart coex-mail coex-desk-close coex-channels --update-env
4. Recreate the web process. If `pm2 describe` showed the script as `npm` with `start` in its args, a
   plain `pm2 restart coex-app --update-env` is enough (root `npm start -- -p 3001` still forwards the
   flag). In every other case (for example the script is `next` or `node_modules/.bin/next`):
       pm2 delete coex-app
       cd /srv/coex/app && PORT=3001 pm2 start npm --name coex-app -- start
   then `pm2 save` and `pm2 status` (exactly one each of coex-app, coex-mail, coex-desk-close and
   coex-channels).
5. Check: `curl -sI https://coex.digisol.ae/login` returns 200, sign in, open Tickets and Tasks, and
   `pm2 logs coex-app --lines 30 --nostream` shows no errors. After a day, `rm -rf /srv/coex/app/.next`
   (the old build) and tell no one: nothing reads it.

Rollback (about three minutes): `git checkout 9676795` (the last commit before the move), then
`npm ci && npm run build`, and start `coex-app` the way step 1 recorded, then `pm2 save`. Return to
the branch afterwards with `git checkout main`.

### Cutover done (13 Oct 2026)

Carried out by John, with `coex-app` unchanged in pm2: it runs `npm start -- -p 3001` from
`/srv/coex/app` (script `/usr/bin/npm`), and root `npm start` forwards that flag, so a plain
`pm2 restart coex-app --update-env` was enough. Result: login page and stylesheet 200, signed-in pages
200, all four processes online (`coex-app`, `coex-mail`, `coex-desk-close`, `coex-channels`),
`coex-mail` reconnected to the mailbox. The first build failed once because the terminal still had
`NODE_ENV=production` from the backup step (see above); a new terminal fixed it. The old
`/srv/coex/app/.next` can be deleted after a day of stable use.

## Microsoft sign-in switched on — 13 Oct 2026

- Both redirect URIs are registered in the Azure app "COEX by DigiSol": `/api/auth/entra/callback` (web
  app, in use) and `/api/v2/auth/entra/callback` (API, not yet used).
- `/srv/coex/app/.env` now holds `AUTH_MICROSOFT_ENTRA_ID_ID`, `_SECRET`, `_ISSUER`
  (`https://login.microsoftonline.com/<tenant id>/v2.0`) and `AUTH_URL`. The login page shows the
  Microsoft button only when all four are set. John confirmed a Microsoft sign-in works.
- Gotchas: the client secret is the **Value** column in Azure, not the Secret ID (36 characters with
  dashes gives `?entra=failed`). Azure client secrets expire; renew before the date chosen when it was
  created, or Microsoft sign-in stops. A person can sign in only if a COEX user has the same email.
- The API (`coex-api`, port 3002) and its Apache route are still not started.

# Worktello UI improvements candidate — 29 October 2026

## Deployment

- PR [#73](https://github.com/digisol-ae/COEX/pull/73) merged to `main` as `93ec4211da581b99010e9e4ba0ca60b98155b3cb`; feature commit `a517fa8811b210922ba7cf231364c624e0b3e9ba`.
- Candidate process: `coex-app-ui-improvements`, PID 544805, loopback port 3005, `/srv/coex/releases/ui-improvements-20261029`, Node 22.23.4. It is online but not serving production traffic.
- Current production process: `coex-app-feedback`, PID 515255, loopback port 3004. All four Worktello/COEX app vhosts are restored to 3004. Green 3002 and blue 3001 remain online. PM2 saved.
- osTicket and workers 10/11/12 were left unchanged. No database migration, production task/time entry, email, user/account mutation or session expiry occurred.
- Private pre-switch snapshot: `/srv/coex/shared/backups/worktello-ui-improvements-20261029/` (directory mode 0700, snapshot files mode 0600). It contains the PM2 dump and all four canonical app vhost files before switch.
- A temporary switch to 3005 passed the HTTPS monitor below; routing was then restored to 3004 because authenticated agent acceptance was unavailable.

## Candidate scope

- Team Activity has a collapsible Summary table with Agent, Since Last Active and Total Time columns. Clicking column headings changes sort order; the separate totals chips are removed.
- Timesheet Add time uses the supplied time-plus asset. Team Activity Share uses the supplied compact send/share asset.
- Pending buttons show the Worktello W animation, including reduced-motion behavior.
- The candidate's What's New note lists these UI changes under “Improvements.” The drawer opens only when an agent chooses it from the user menu; the unread indicator remains until acknowledged.

## Verification

- PR CI run 40817396640 and merged-main CI run 40817646544 passed types, lint, format, 441 unit tests and production build.
- Local isolated worktree: `npm run typecheck`, repository source ESLint (excluding generated `.next-release-qa` output), Prettier, `git diff --check`, all 441 unit tests and webpack build (83 routes) passed.
- Production server: exact merged-main tar archive SHA-256 `ecce40a198a2cd0bf508d59f77171514af51efb9bd43f0367431d33698efafcf`; `npm ci` and Node 22.23.4 production webpack build passed. Existing server-action key fingerprint matched the previous slot; previous hashed static assets were copied without overwrite. No key value was printed or stored in the release record.
- Candidate loopback smoke: `/login`, Outlook task pane/dialog, both supplied icons and `/time/activity` returned 200; unauthenticated Outlook task API returned 401. Candidate stayed on loopback until checks passed.
- Apache config test returned `Syntax OK`; the temporary switch changed only the four app vhost proxy targets. During that switch, HTTPS monitor passed 20/20 for `/login` 200, Outlook task pane 200, unauthenticated Outlook task API 401 and both icons 200. Routing was restored to 3004 and a further 20/20 monitor passed there. Loopback checks on 3001/3002/3004/3005 returned `/login` 200. PM2 reports the candidate online with zero restarts and Node 22.23.4; workers retained PIDs 396424, 396471 and 396523.
- The authenticated agent smoke requirement remains unfulfilled. The browser origin approval gate denied access to `https://worktello.com`, so the signed-in browser session could not be inspected; do not retry via another browser or workaround. No authenticated production UI workflow or Outlook add-in sideload was performed. The What's New no-auto-open behavior was code-reviewed and covered by CI/build, not verified in an authenticated production browser. Keep candidate on 3005 until authenticated smoke can be completed safely.

## Dependency security follow-up

`npm audit --omit=dev --audit-level=critical` on the existing lock reports 9 production dependency advisories: 6 moderate, 2 high and 1 critical. The critical finding is for the existing `next@16.3.8`; PR #73 did not change dependency versions. Official Next.js advisories identify affected 16.x versions through 16.4.0 for the [Image Optimization API SVG issue](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw), [Server Actions denial-of-service issue](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r), and [typed-array `use cache` issue](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr). This release did not enable `dangerouslyAllowSVG`, and a source search found no `use cache` usage, but exploitability was not fully assessed. npm audit suggested Next.js 16.4.3, outside the current exact pin. Prepare a separate compatibility-tested dependency update and release; do not treat this UI rollout as vulnerability remediation.

## Rollback

1. Verify `http://127.0.0.1:3004/login` returns 200.
2. Restore `worktello.conf.before`, `worktello-le-ssl.conf.before`, `coex.conf.before` and `coex-le-ssl.conf.before` from `/srv/coex/shared/backups/worktello-ui-improvements-20261029/` to `/etc/apache2/sites-available/`.
3. Run `sudo apache2ctl configtest`, then `sudo apache2ctl graceful`.
4. Verify `https://worktello.com/login` and keep the candidate on 3005 while active traffic remains on 3004.

Do not restart workers or modify database/session state for this rollback.

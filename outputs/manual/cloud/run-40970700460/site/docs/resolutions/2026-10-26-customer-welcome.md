# Welcome guidance for customers moving from the previous portal — 26 October 2026

Customer sign-in and email-code entry now show a friendly welcome to their new DigiSol support home. The message explains that customers with an existing registered account can use their email/username and password, with direct links to email-code sign-in and Forgot password for anyone who cannot sign in. It asks for the registered email and offers help. The notice is hidden in the Agent sign-in view. It makes no claim that every source contact had a password and does not change authentication, credentials, permissions or send messages.

Validation: focused formatting/lint and workspace types; CI/build and live browser evidence recorded after deployment. No new test mirrors this presentation-only content change.

## Customer migration welcome live — 26 October 2026

PR61 merged as7831dd68278972d267043f6c2b8cae9587e63a6e; compiled application tree7272806. Active blue coex-app id20/PID385274 on3001 in /srv/coex/releases/customer-welcome-20261026. Both canonical Apache proxies target3001, PM2 saved, Node22.23.4 verified for actual Node descendants. Green coex-app-green id19/PID383390 on3002 remains immediate rollback and retains customer credential/OTP support. Workers10/11/12 retain PIDs303634/303723/303820 and zero restarts. No database, password, account/session or mail mutation is part of this release.

Customer sign-in and email-code pages show a friendly DigiSol welcome, existing registered-account login guidance and direct email-code/reset links. Agent mode omits it through the existing customer conditional. Focused formatting/lint, workspace types,405 CI tests, PR/main CI and server build passed. Anonymous HTTPS login/email-code HTML includes the exact panel and correct recovery links. Separate in-app browser visually verified the email-code welcome panel and reset-link navigation; no credentials submitted and original authenticated user tab preserved. Twenty HTTPS switch samples returned200. Native mobile and the authenticated browser's anonymous Customer/Agent toggle were not exercised; source conditional and anonymous HTML were checked. Screenshot: docs/manual/assets/customer-welcome-20261026.png.

Application rollback: verify3002/email-login healthy, restore http-before.conf/https-before.conf from /srv/coex/shared/backups/customer-welcome-20261026 into canonical Apache vhosts, configtest and graceful reload. Keep data/workers intact. Private PM2/environment snapshot is in that directory and must not be published. Docs/manual-only sync requires no restart.

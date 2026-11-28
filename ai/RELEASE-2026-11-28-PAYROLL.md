# Payroll live — 28 November 2026

Cutover completed at **07:02 PKT**. Owner explicitly requested deployment and no automatic What’s New popup. PR [#106](https://github.com/digisol-ae/COEX/pull/106) merged as `608d3ff9475303d3eadd0c30af061367aa15775a`. Compiled source `c22334e` has the same tracked tree as that merge. Payroll was applied to current main, retaining newer landing changes; unrelated consolidated signing, user-archive and loader work remains on `codex/consolidated-worktello-20261127`.

## Live runtime and rollback

- App: `/srv/coex/releases/payroll-20261128-c22334e`, PM2 `coex-app-payroll-20261128` id38/PID1047684, loopback **3026**, Node22.23.4.
- Website: unchanged source/build `/srv/coex/releases/public-website-20261127-81d3ca0`; new process `worktello-public-website-payroll-20261128` id39/PID1047704, loopback **3027**, fixed `WEBSITE_APP_ORIGIN=http://127.0.0.1:3026`.
- Mail: `coex-mail` id40/PID1048944 now uses the Payroll release. Desk/channels ids28/29 retain PIDs927636/927642 and zero restarts. PM2 saved.
- Warm rollback: previous app3023/id36 and website3025/id37 remain online. No old release or business data was removed.
- Four Worktello/COEX vhosts retain the split website/app routing and existing hardening. Only application3023→3026 and website3025→3027 changed. No DNS, TLS or public listener change.
- Existing server-action encryption key, environments, shared storage and existing hashed app assets were preserved. No credential or session reset.

Private evidence and rollback definitions are in `/srv/coex/shared/backups/payroll-20261128` (0700): before/after proxy files, private PM2 snapshots, committed source archive, scripts, install/build logs, candidate checks and cutover.json. `database.archive.gz` (live database dump) and `storage.tar.gz` passed gzip/archive integrity checks. This is not a new isolated restore test or a claim of a single point-in-time DB/files snapshot.

To roll back, verify app3023/login and website3025 first, restore all four `*.conf.before` files to `/etc/apache2/sites-available/`, run `sudo apache2ctl configtest` then `sudo apache2ctl graceful`, and verify public login, landing and protected APIs. Restore the mail worker using the private `mail-rollback.ecosystem.config.cjs` definition (replace only the `coex-mail` PM2 definition); preserve desk/channels. Save PM2. Keep new slots and all data until rollback is confirmed. Do not restore the database as part of a routine code rollback.

## Verification

- Release-only source: **552 unit + 420 isolated database + 27 API tests = 999 passed**; types, full lint and formatting passed. Tests used only disposable local `coex_test_*` databases on port27029. Earlier 1,009-test evidence refers to the separate consolidated branch containing additional pending features.
- PR CI [46095321867](https://github.com/digisol-ae/COEX/actions/runs/46095321867) and merged-main CI [46095729213](https://github.com/digisol-ae/COEX/actions/runs/46095729213) passed, including production builds. Separate server production install/build passed; runtime dependency audit reports **zero vulnerabilities**.
- Candidate login, policies, registration, Outlook pane and static assets passed; private Payroll template/files/API and website-preview API returned401/no-store. New and old app public website DTOs matched. Nine website assets returned200.
- After cutover, **20/20 HTTPS sample sets** passed: login200, website200, private Payroll API401/no-store. Public application chunk references matched the compiled candidate and all referenced files loaded. App and website have zero restarts and no error-log output at acceptance.
- Read-only stored-role checks resolved the real active platform owner, allowed bootstrap staff selection, and denied ordinary staff salary-list access. Payroll remains off; no role override or employee/salary record was changed.
- Existing signed-in John Ali browser session loaded the live `/payroll` setup page. What’s New stayed closed and no form was submitted. No production payroll calculation, approval, payment, import, bank transfer or test email was performed. Paid-run and PDF workflows remain established by the synthetic local multi-role QA, not a new live salary-data exercise.
- PM2 initially retained the old mail working directory during an in-place restart; the worker was restored immediately, then its recoverable process definition was replaced and verified at the new release. Only mail was restarted; desk/channels remain unchanged.

## What’s New and setup

What’s New retains its manual account-menu trigger for every user. No mount/login auto-open behavior, acknowledgement reset, broadcast or notification was added. The Payroll topic is two short sentences: HR prepares payroll, approvers review and Accounts records payment; when enabled, employees can view paid payslips and request leave, advances or reimbursements. Existing topics and tenant-specific drafts were not bulk rewritten or published. The DigiSol published-content read already includes this fallback topic; no production release-content write was needed.

The platform owner must select HR, approver and Accounts users at [Payroll setup](https://worktello.com/payroll) and enable DigiSol. Accounts is intentionally unselected; no access is guessed. Configure employee links, salary assignments, leave policy, PKR thresholds and approved opening data afterwards. Other tenants stay off. **Zoho account confirmation/journal export remains pending.** Final payslip design/content and stamp/signature review remain the agreed last stage.

All local work remains in the approved folder. Separate midnight manual automation changes and historical/private outputs are preserved and excluded from release commits. Private live screenshots and validation logs remain under `.local-development/payroll-release/`; no production staff screenshot or environment is published.

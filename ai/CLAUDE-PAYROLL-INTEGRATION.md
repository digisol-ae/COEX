# Payroll deployed — 28 November 2026

PR106 / merge `608d3ff` is live: app3026, identical website source on3027 with its app origin updated, mail worker id40 on the same release. PR/main CI, server build, 999 release tests, public health/privacy and existing owner browser setup passed. What’s New opens only manually and the Payroll note is concise. Payroll remains off until the owner selects HR/approver/Accounts at `/payroll`; no salary import, permission grant or real payment was performed. Zoho and final payslip design remain deferred. Previous app3023/site3025 stay warm for rollback. Current evidence: [Payroll release](RELEASE-2026-11-28-PAYROLL.md). Earlier local-only and shutdown statements below are historical.

# Payroll integration: current checkpoint

All work remains in `/Volumes/sd-mac/Developer/DigiSol/worktello`.

On 27–28 November, John approved completing Payroll while leaving Zoho account confirmation pending, then requested QA, commit and computer shutdown. The earlier instruction to discuss implementation has been satisfied for this approved scope. John subsequently authorized the 28 November deployment; it is now live.

The original source under `outputs/payroll/lib/payroll/` was Claude's latest supplied engine at the start. It is now integrated and maintained in `packages/shared/src/payroll/`, including Zod 4 compatibility, safe money arithmetic and the application persistence boundary. Do not overwrite this runtime source with the older original copy.

Application services: `apps/web/src/modules/payroll/`. Screens: `apps/web/src/app/(app)/payroll/`. Private downloads: `app/api/payroll/`; authenticated read-only endpoints: `app/api/v1/payroll/`. Unit and isolated database coverage is under `tests/`.

Start with `outputs/payroll/docs/payroll/PAYROLL-MANUAL.md` and `docs/resolutions/2026-11-28-payroll-integration.md`. Zoho journal export is blocked until accounts are confirmed. Final payslip design/content remains a last-stage owner review, not an approved template. People/Recognition scorecards, statutory country packs, Zoho API integration and exchange-rate conversion remain outside this phase.

The platform owner enables DigiSol Payroll explicitly through `/payroll`; other tenants remain off. No production tenant was enabled or migrated by local development. All business writes during QA used synthetic `coex_test_*` databases on a task-owned local MongoDB replica set. Existing production services, real staff salary records and email delivery were untouched.

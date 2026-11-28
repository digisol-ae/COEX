# Payroll integration: current checkpoint

All work remains in `/Volumes/sd-mac/Developer/DigiSol/worktello`.

On 27–28 November, John approved completing Payroll while leaving Zoho account confirmation pending, then requested QA, commit and computer shutdown. The earlier instruction to discuss implementation has been satisfied for this approved scope. Push and deployment remain with John.

The original source under `outputs/payroll/lib/payroll/` was Claude's latest supplied engine at the start. It is now integrated and maintained in `packages/shared/src/payroll/`, including Zod 4 compatibility, safe money arithmetic and the application persistence boundary. Do not overwrite this runtime source with the older original copy.

Application services: `apps/web/src/modules/payroll/`. Screens: `apps/web/src/app/(app)/payroll/`. Private downloads: `app/api/payroll/`; authenticated read-only endpoints: `app/api/v1/payroll/`. Unit and isolated database coverage is under `tests/`.

Start with `outputs/payroll/docs/payroll/PAYROLL-MANUAL.md` and `docs/resolutions/2026-11-28-payroll-integration.md`. Zoho journal export is blocked until accounts are confirmed. Final payslip design/content remains a last-stage owner review, not an approved template. People/Recognition scorecards, statutory country packs, Zoho API integration and exchange-rate conversion remain outside this phase.

The platform owner enables DigiSol Payroll explicitly through `/payroll`; other tenants remain off. No production tenant was enabled or migrated by local development. All business writes during QA used synthetic `coex_test_*` databases on a task-owned local MongoDB replica set. Existing production services, real staff salary records and email delivery were untouched.

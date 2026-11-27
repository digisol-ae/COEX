# Payroll: current developer handover

Updated 28 November 2026. Work only in `/Volumes/sd-mac/Developer/DigiSol/worktello`.

John approved completing the integration while leaving Zoho account confirmation pending, then requested QA, commit and shutdown. Implementation is local; John retains push/deploy control.

## Runtime map

- Pure engine, schemas, money/persistence boundary and model definitions: `packages/shared/src/payroll/`.
- Tenant/permission guards, transactions, pay runs, requests, receipts, commissions, reports and workbook handling: `apps/web/src/modules/payroll/`.
- Payroll and My pay screens/actions: `apps/web/src/app/(app)/payroll/`.
- Private downloads/template: `apps/web/src/app/api/payroll/`.
- Authenticated read-only session API: `apps/web/src/app/api/v1/payroll/` (employees, runs, run payslips).
- Tests: `tests/unit/payroll-*`, `tests/database/payroll.test.ts` and existing platform suites.
- Reproducible disposable browser fixtures: `scripts/qa/payroll-local.ts`.

The supplied engine in `outputs/payroll/lib/` is retained as original reference. The integrated package is now authoritative; do not overwrite it with the older standalone copy. Nested defaults use Zod 4 prefault behavior; money inputs and arithmetic use safe integer minor units and half-away-from-zero rounding.

## Completed locally

Employees, salary structures and immutable effective assignments; explicit module/role grants; settings; leave, loans, expenses and private files; category/recurring run items; monthly calculation, item/run approvals, reopen/cancel, idempotent atomic payment/lock; contract sales ownership and receipt recording; capped commission accrual/overrides and confirmed clawbacks; bank/register CSV and department/loan/leave reports; native Excel preview/import; own-payslip/request self-service; provisional PDF/month-summary snapshots and paid notification links.

Final QA: 119 files / 1,009 tests passed; full lint, workspace typecheck and production build passed. Multi-role browser workflow and private own-payslip download passed on synthetic local data. Runtime dependency audit: zero vulnerabilities. Detailed results: `outputs/qa/payroll/2026-11-28/QA.md`.

## Deferred and rollout

Zoho account confirmation/import columns remain pending. Journal export stays blocked; no Zoho API push or posting. Final payslip layout/content, brand assets and stamp/signature are the agreed last-stage review after module rollout. Country packs, People/Recognition R2–R4 and implicit currency conversion are not implemented in this phase. Automatic commission requires matching contract/payroll currencies.

Payroll is off by default; initial enabling is an explicit DigiSol platform-owner action through `/payroll`, with real staff selected for HR, approvers and Accounts. Configure PKR approval limits before PKR runs. Review legacy contract owners/signing dates rather than guessing them. No production data was enabled/imported, no real email sent, and no push/deployment performed.

Owner commands and current release references: `ai/PAYROLL-OWNER-COMMANDS.md`. Preserve unrelated midnight manual changes and historical/private outputs. The stopped task-owned test Mongo container retains disposable QA data; the QA web server has been stopped. Latest owner instruction is to shut down after QA and commit, superseding the older cancelled shutdown note.

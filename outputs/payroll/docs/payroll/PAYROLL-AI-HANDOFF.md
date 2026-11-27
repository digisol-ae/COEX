# Payroll: Handoff to the next AI developer (ChatGPT / Codex)

## Local application integration — 28 November 2026

John approved completing Payroll while leaving Zoho account confirmation pending, then requested QA, commit and shutdown. The runtime engine is now `packages/shared/src/payroll/`; the supplied `outputs/payroll/lib/` remains its original reference copy. Zod 4 defaults and safe money rounding are corrected. Models/services, explicit permissions/module enablement, UI, commission receipts/clawbacks, reports, self-service, protected files and native Excel import are implemented locally. See `docs/resolutions/2026-11-28-payroll-integration.md`, `PAYROLL-MANUAL.md` and `outputs/qa/payroll/2026-11-28/QA.md`.

Zoho journal export stays blocked until accounts are confirmed. PDF output is provisional: final layout/content and stamp/signature review remain last, after module rollout, as instructed. No push, production enabling, real email or deployment has been performed. John retains push/deploy control. Earlier “not integrated” and Zod 3-only statements below describe the original handoff.

Written by Claude, 27 Nov 2026 · Owner: John Ali · Repo: `/Volumes/sd-mac/Developer/DigiSol/worktello` (branch `codex/consolidated-worktello-20261127`)

## 1. State (be exact about this)

- **Done:** pure payroll engine + 49 unit tests (Zod 3 in isolation), plans and docs. Location: `outputs/payroll/` → `lib/payroll/*.ts`, `tests/payroll/*.ts`, `docs/payroll/*`, `docs/people/PEOPLE-RECOGNITION-PLAN.md`, `samples/` (draft payslip).
- **Current:** the module is integrated locally. See the 28 November checkpoint above and the current PAYROLL-HANDOVER.md; the original implementation plan below is retained as history.
- The original supplied code remains under `outputs/payroll/`; the integrated runtime under `packages/shared/src/payroll/` is now authoritative.

## 2. Read first

1. `AGENTS.md`, `CLAUDE.md`, `ai/LOCAL-DEVELOPMENT.md`, `ai/CLAUDE-PAYROLL-INTEGRATION.md`
2. `outputs/payroll/docs/payroll/PAYROLL-PLAN.md` (all decisions), `PAYROLL-HANDOVER.md`, `PAYROLL-ZOHO-ACCOUNTS.md`, `PAYROLL-FEEDBACK.md`
3. `outputs/payroll/docs/people/PEOPLE-RECOGNITION-PLAN.md` (later phase)
4. Next.js here is 16.x with breaking changes: read `node_modules/next/dist/docs/` before writing routes.

## 3. Owner rules (John)

- **Discuss before implementing or committing anything.** Propose, get a yes, then build.
- John runs git push and deploy himself. Give him commands; do not run them.
- Work only in the repo folder above. Do not create other checkouts.
- Payslip design/content is finalised **last**, after the full module is deployed.

## 4. Original decision list — approved except Zoho account confirmation

1. Payroll as a new module in `packages/shared/src/core/modules.ts`, **off by default**, enabled for DigiSol only?
2. New permissions (no HR role exists): `payroll.read.own` (everyone), `payroll.read.all`, `payroll.manage` (HR: Umbreen, Mehak), `payroll.approve` (Umbreen, John), `payroll.pay` (Accounts), `payroll.settings`. Not granted to `tenant_admin` by default; given by `permissionGrants`. Add to `permissionModule()` → `payroll`.
3. Commission basis from contracts (`valueMinorUnits` is **per billing period**): (a) value × periods in term, (b) (a) + setup + training fees, (c) other.
4. Add required `salesOwnerId` to Contract (copied from Opportunity `ownerId` on win; backfill existing).
5. Add contract **payments received** (amount, date, reference) entered by Accounts until Zoho API exists; add `cancelledAt` to contracts for clawback.

Still open: Zoho credit account for net salaries (default "Salaries Payable").

## 5. Agreed business rules (already in the engine)

Day basis = actual days · approvers Umbreen or John, **one approval** · package split by %, **Other allowance = balance**, HR sets % (defaults 60/25/7/3/2/1/balance) · insurance component kept for future · pay items catalogue (14 default categories with Zoho accounts) · **only HR adds items** · items **> AED 1,000** need Umbreen or John · note visibility per category · commission on contract value, **earned on payment received, proportional**, capped at rate × value; renewals only with a manual rate · **clawback 90 days** (editable) · advances → "Employee Advance" · salaries → employee's own Zoho account "Salary for <Name>" (see ZOHO doc) · no bank account → no payment journal · pay 2nd–5th of next month, payslips emailed on mark-paid · maker-checker; unapproved items block run approval.

## 6. Integration plan

| Step                      | Where                                            | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Engine                  | `packages/shared/src/payroll/`                   | Copy `lib/payroll/*`. Keep pure (no DB/IO). Tests → `tests/unit/payroll-*.test.ts`                                                                                                                                                                                                                                                                                                                                                           |
| 2 Zod 4 fix               | `schemas.ts`                                     | In Zod 4, `.default({})` does **not** apply inner defaults (2 tests failed: `gl.salaryExpense`, `gl.loanReceivable` undefined). Replace every nested `.default({})` with `.prefault({})` or a full explicit default object. Check `gl`, `payWindow`. Re-run all 49 tests. Do not downgrade Zod.                                                                                                                                              |
| 3 Money units             | services                                         | App stores `*MinorUnits` integers with explicit `currency`. Engine uses major units internally with minor-unit math: convert at the service boundary. Approval limit is per currency (AED 1,000 → add per-currency map).                                                                                                                                                                                                                     |
| 4 Models                  | `packages/shared/src/payroll/models/`            | `PayrollSettings`, `Employee` (link `userId` → User), `SalaryStructure`, `SalaryAssignment` (history), `LeaveType`, `LeaveRequest`, `Loan`, `Reimbursement`, `PayItemCategory`, `PayrollRun` (payslip snapshots, runInputs/items, events, approvals), `CommissionPlan`, `CommissionAccrual` (unique `paymentId`), `ContractPayment`. Every doc: `tenantId`, `deletedAt`, timestamps; follow existing model style (`models.X ?? model(...)`). |
| 5 Permissions/module      | `core/permissions.ts`, `core/modules.ts`, labels | After John answers §4.1–4.2. Server-side salary checks; own-payslip queries also filter by session user.                                                                                                                                                                                                                                                                                                                                     |
| 6 Repository transactions | `apps/web/src/lib/repository.ts`                 | Add optional `session` support (MongoDB transactions; local DB is a replica set). Mark-paid in one transaction: run → paid, `postingEffects` (loan `$inc recovered`, reimbursements paid), commission accruals → paid, clawbacks → clawed_back. Idempotent.                                                                                                                                                                                  |
| 7 Services                | `apps/web/src/modules/payroll/services/`         | createRun, calculate (load data → `calculatePayslip`), add/approve items, approve/reopen/markPaid/lock (`transition`), exports (Zoho journal CSV, bank CSV), commission accrual job, clawback suggestions, month summary (time entries, tasks, tickets → `buildMonthSummary`). Audit every write; payslip email via existing outbox.                                                                                                         |
| 8 UI                      | `apps/web/src/app/(app)/payroll/`                | Match existing UI and 3 themes. Run page: employee rows with **Additions / Deductions "+ Add"** (category drop-down, amount or %×value, link, note, attachment), warnings, approve, pay, exports. Plus Employees, Structures (% editor with Balance), Pay items, Leave, Loans, Reimbursements, Settings, **My pay**.                                                                                                                         |
| 9 CRM link                | contracts/opportunities                          | After §4.3–4.5. Sales owner, payments received, cancelledAt.                                                                                                                                                                                                                                                                                                                                                                                 |
| 10 Payslip PDF            | LAST                                             | Existing PDF code uses **pdf-lib** (`modules/crm/signed-agreement-pdf.ts`); inspect its interfaces. `payslip-html.ts` is only a design reference. Page 1 bank-ready; page 2 month at a glance; Bank copy = page 1 only. Stamp/signature only on approved runs.                                                                                                                                                                               |

## 7. Verify

Unit + isolated DB suites (`npm run test`, `npm run test:db`; never production DB), `npm run typecheck`, `npm run lint`, `npm run build`, browser checks of the run workflow. Report local, CI, deployed and live acceptance separately.

## 8. Keep docs current every session

Update `outputs/payroll/docs/payroll/PAYROLL-PLAN.md`, `PAYROLL-HANDOVER.md`, `PAYROLL-FEEDBACK.md`, `PAYROLL-MANUAL.md` (with screenshots once screens exist), and add a dated record in `docs/resolutions/` like other features.

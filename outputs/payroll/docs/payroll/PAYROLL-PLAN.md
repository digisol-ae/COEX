# Worktello Payroll: Development Plan

## Local application integration — 28 November 2026

John approved completing Payroll while leaving Zoho account confirmation pending, then requested QA, commit and shutdown. The runtime engine is now `packages/shared/src/payroll/`; the supplied `outputs/payroll/lib/` remains its original reference copy. Zod 4 defaults and safe money rounding are corrected. Models/services, explicit permissions/module enablement, UI, commission receipts/clawbacks, reports, self-service, protected files and native Excel import are implemented locally. See `docs/resolutions/2026-11-28-payroll-integration.md`, `PAYROLL-MANUAL.md` and `outputs/qa/payroll/2026-11-28/QA.md`.

Zoho journal export stays blocked until accounts are confirmed. PDF output is provisional: final layout/content and stamp/signature review remain last, after module rollout, as instructed. No push, production enabling, real email or deployment has been performed. John retains push/deploy control. Earlier “not integrated” and Zod 3-only statements below describe the original handoff.

Prepared 27 Nov 2026 · Owner: John Ali · Users: HR and Accounts · Status: **Phase 1 implemented locally; Zoho confirmation and final payslip design pending**

## 1. Decisions (John, 27 Nov)

| Topic                  | Decision                                                                                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jurisdiction           | Generic: earnings/deductions only. No statutory rules (WPS, gratuity, income tax, EOBI) in phase 1; add later as country packs.                                                                                              |
| Scope P1               | Employees, salary structures, monthly run, payslips; attendance & leave; loans/advances & reimbursements; Zoho Books journal export + bank file.                                                                             |
| Delivery               | Plan and build in parallel.                                                                                                                                                                                                  |
| Accounting             | Zoho Books stays system of record; Worktello exports a journal CSV (API push later, when Zoho API access is ready).                                                                                                          |
| Day basis              | Actual days in the month (calendar).                                                                                                                                                                                         |
| Approvers              | Umbreen John or John Ali; **one approval is enough** (`requiredApprovals` = 1; 2 remains available).                                                                                                                         |
| Zoho account           | Salaries post to each employee's own sub-account of **Salaries & Other Benefits** (e.g. "Salary for Rohail"); benefits to their accounts. See `PAYROLL-ZOHO-ACCOUNTS.md`.                                                    |
| Pay day                | Between the 2nd and 5th of the following month; payslips emailed when the run is marked paid.                                                                                                                                |
| Salary breakdown       | HR enters one monthly **package**; structure splits it by % (Basic, Accommodation, Transport, Food, Medical, Internet…); **Other allowance = balance** so parts always equal the package. Medical is a fixed cash allowance. |
| Insurance              | Not used now; component kept, switched off, for the future.                                                                                                                                                                  |
| Additions / deductions | Per employee in each run, chosen from a category drop-down (catalogue). **Only HR** adds items. Items **> AED 1,000** need approval from **Umbreen or John** (either). Note visibility on payslip is a per-category setting. |
| Commission             | Basis = **contract value**; earned when **payment is received**; renewal commission decided manually per contract and editable; **clawback** on; no split credit. Auto-calculated; HR can override with a reason.            |

## 2. Users and roles

| Role                    | Does                                                                        |
| ----------------------- | --------------------------------------------------------------------------- |
| HR                      | Employees, salary assignments, leave types, approve leave, enter run inputs |
| Payroll officer         | Creates and calculates the run (maker)                                      |
| Payroll approver        | Approves or reopens the run (checker, must be a different user)             |
| Accounts                | Marks paid, downloads journal + bank file, locks the run                    |
| Employee (self-service) | Own payslips, leave requests and balances, loan and reimbursement requests  |
| Admin                   | Everything; settings                                                        |

Salary data is visible only to HR, Payroll, Accounts and Admin roles. Employees see only their own.

## 3. Data model (MongoDB, every document has `tenantId`)

| Collection                     | Key fields                                                                                                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payrollSettings`              | baseCurrency, dayBasis (calendar / fixed30 / working), weekend, holidays, hoursPerDay, overtimeMultiplier, minNetPctOfGross, payDay, GL account names                |
| `employees`                    | code, userId (Worktello user link), name, dept, designation, joinDate, exitDate, status (active / on_hold / exited), currency, payment {method, bank, IBAN, account} |
| `salaryStructures`             | name, status (draft / published / archived), components [code, type, calc fixed or % of component, prorate, glAccount]                                               |
| `salaryAssignments`            | employeeId, structureId, effectiveFrom, amounts per fixed component, reason (history kept)                                                                           |
| `leaveTypes` / `leaveRequests` | entitlement, accrual monthly/yearly, carry-forward cap, paid/unpaid · from, to, halfDay, status                                                                      |
| `loans`                        | kind (loan/advance), principal, installments, startPeriod, skippedPeriods, recovered, status                                                                         |
| `reimbursements`               | category, amount, receipt, status (submitted / approved / rejected / paid), payPeriod                                                                                |
| `payrollRuns`                  | period, currency, status, payslips[] (snapshot), runInputs[], events[], calculatedBy/approvedBy/paidBy                                                               |

Indexes: `{tenantId, code}` unique on employees; `{tenantId, period, currency}` unique on non-cancelled runs.

## 4. Calculation rules (implemented in `lib/payroll/engine.ts`)

1. Employment window = join/exit clipped to the month. Not employed → no payslip.
2. **Payable days** = employed days − approved unpaid leave (working days; half day = 0.5). Factor = payable ÷ basis days.
3. Components: fixed amounts from the assignment; % components follow references (circular refs are rejected). Prorated components × factor.
4. Overtime = hours × multiplier × (rate base ÷ basis days ÷ hours per day). Rate base default BASIC.
5. One-off adjustments (bonus, arrears, penalty) per run.
6. Approved reimbursements with `payPeriod` = run period are added (non-salary GL).
7. Loan/advance installments with catch-up; recovery capped so net ≥ `minNetPctOfGross` of gross (default 50%); shortfall rolls forward.
8. All money in integer minor units; rounding half away from zero.
9. Warnings: missing bank details, on hold, capped recovery, negative net (blocks approval).

## 4a. Salary breakdown (package split)

- `salaryAssignments.package` = agreed monthly salary. Components use `% of PACKAGE`; one component (Other allowance) has `calc: balance`.
- Validation: % total ≤ 100; exactly one balance component; balance ≥ 0.
- Percentages per structure (e.g. Staff, Management) with effective dates; history kept. **HR decides all %.**
- Default (common UAE/GCC practice; basic high because end-of-service benefits are based on basic): Basic 60, Accommodation 25, Transport 7, Food 3, Medical 2, Internet 1, Other allowance = balance (2).

## 4b. Pay items catalogue (additions & deductions)

Admin-maintained list; HR picks from it in the run.

| Field        | Options                                                                                                                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Category     | Additions: Commission, Project share, Token of appreciation, Employee of the Month, Annual bonus, Arrears, Settlement of expenses, Other · Deductions: Unpunctual, Behaviour, Advance recovery (manual), Other |
| Calculation  | Fixed · % of component · % of a value · quantity × rate                                                                                                                                                        |
| Frequency    | One-off or recurring (start/end month)                                                                                                                                                                         |
| Link         | Project / Contract / CRM deal / Ticket (optional)                                                                                                                                                              |
| Zoho account | Default per category; override per employee (e.g. "Ashif Commission")                                                                                                                                          |
| Controls     | HR only; approval above AED 1,000 (Umbreen or John); monthly cap; reason required for Other and overrides                                                                                                      |
| Payslip      | Line per item; show note or category name only (setting)                                                                                                                                                       |
| Audit        | Every add/edit/override logged; locked with the run                                                                                                                                                            |

Run page: each employee row has **Additions** and **Deductions** columns with "+ Add" (category, amount, link, note, attachment).

## 4c. Commission (HR ⇄ CRM)

- Link: Employee ⇄ Worktello user ⇄ required **Sales owner** on Lead → Opportunity → Contract (owner carries forward; manager can change).
- HR assigns a **commission plan** per sales employee: rate % or tiers; basis = contract value.
- Trigger = **payment received**, in **proportion to each payment** (rate × amount received), capped at rate × contract value. Until Zoho API is connected, Accounts marks payments received in Worktello.
- Creates a pending **Commission** addition, linked to the contract and payment, in the next run; HR accepts or overrides (reason); > AED 1,000 → approval.
- **Renewals:** commission rate set manually on the renewal contract (can be 0) and editable.
- **Clawback:** if a contract is cancelled/terminated within the clawback window (default **90 days**, editable in settings), a deduction for the commission already paid is suggested in the next run; HR confirms.

## 5. Run workflow

`draft → calculated → approved → paid → locked` (cancel from draft/calculated; reopen from approved with reason).

- Recalculate as often as needed before approval. Payslips are snapshots; later salary edits do not change approved runs.
- Mark paid (Accounts, with payment reference) applies loan recoveries and marks reimbursements paid in one transaction.
- One run per tenant + period + currency (AED and PKR staff run separately).

## 6. Outputs

- **Payslip PDF** based on DigiSol's original layout: logo, employee summary, net pay box, earnings/deductions with Amount + YTD, net calculation, amount in words, stamp + signature (approved runs only). Emailed on payment and available in self-service.
- **Zoho Books journal CSV**: Dr earning GLs, Cr deduction GLs, Cr Salaries Payable; advances to "Employee Advance". No bank payment journal (payment recorded in Zoho).
- **Bank transfer CSV** (generic; bank-specific formats later).
- Reports: payroll register, department cost, loan balances, leave balances.

## 7. Screens

`/payroll` dashboard · Employees (list, profile tabs: Job, Salary history, Bank, Leave, Loans, Payslips) · Salary structures · Runs (list → run page: inputs grid, calculate, warnings, approve, pay, exports) · Leave (calendar, requests, balances) · Loans & advances · Reimbursements · Settings. Self-service under **My pay**.

## 8. API (per API-PLAN)

Read-only `payroll:read` in v1 (`/api/v1/payroll/employees`, `/runs`, `/runs/{id}/payslips`). Writes stay UI-only. Every write logged to the audit log.

## 9. Phases

| Phase | Content                                                                                                                                 | Status                                                           |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| P1a   | Engine, package split, pay-items catalogue, commission + clawback, run state machine, exports, payslip template (draft) + 49 unit tests | **Integrated locally (28 Nov)**                                  |
| P1b   | Mongo repositories, server actions/API routes, permissions                                                                              | Implemented locally                                              |
| P1c   | UI: employees, structures, run page, payslip PDF                                                                                        | Functional UI and provisional PDF implemented; final design last |
| P1d   | Leave, loans, reimbursements screens + self-service                                                                                     | Implemented locally                                              |
| P1e   | Import tool (employees + opening leave/loan balances from Excel)                                                                        | Implemented locally                                              |
| P2    | Country packs (UAE WPS SIF + EOSB gratuity, Pakistan tax/EOBI), Zoho API push, final settlement                                         | Later                                                            |

## 10. Open questions

1. Credit account for net salaries in the Zoho journal (default "Salaries Payable").

## 11. Delivery order (John, 27 Nov)

Build and deploy the **complete Payroll module first**; payslip design and content (page 1, page 2, Bank copy) are reviewed, finalised and deployed **last**.

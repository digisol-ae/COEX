## Live deployment — 28 November 2026

PR106 / merge `608d3ff` is deployed at worktello.com. What’s New remains manual-only. Payroll is off until the platform owner selects HR/approver/Accounts at `/payroll`; no salary import or access grant was guessed. Zoho and final payslip design remain deferred. See `ai/RELEASE-2026-11-28-PAYROLL.md` for the 999-test release QA, CI, live checks and rollback. Earlier local-only statements below describe the original checkpoint.

# Worktello Payroll: local implementation manual

Updated 28 November 2026. Functional module implemented locally. Production rollout is not performed by this task. Zoho account confirmation and final payslip design remain pending.

## Enable and assign access

The platform owner opens `/payroll` in the DigiSol workspace, selects HR, named approvers and Accounts staff, then enables Payroll. Other tenants remain off by default. HR receives payroll management access; approval and payment permissions are separate. Tenant administrators do not automatically receive salary access, and only a platform owner can grant payroll permission overrides. All ordinary staff can access **My pay** only when Payroll is enabled and their account is linked to an employee.

Payroll settings remain separately controlled. Configure a PKR approval threshold before creating PKR runs. The default AED item threshold is 1,000. One of the configured approvers is enough by default; two approvals are supported when configured. The preparer can never approve their own run.

## Set up employee pay

1. Add the employee's code, name, joining/exit dates, currency, linked staff account and payment details.
2. Publish a salary structure. HR sets the percentages; Other allowance is the remaining package balance. Create a new structure version rather than changing a published version.
3. Add an effective salary assignment with the monthly package and a reason. Salary history is immutable.
4. Add paid/unpaid leave types and their entitlement, accrual and carry-forward policy. Initial annual entitlement is zero until HR sets the policy; no statutory entitlement is assumed.
5. Add or approve opening loans and expenses. Create recurring pay items with start/end months when appropriate.

Linked staff identities cannot be reassigned to another person. Currency changes are refused once salary history exists, avoiding implicit conversion of payroll history and outstanding obligations.

## Monthly workflow

1. Review employee dates, salary history, approved leave, loans and expenses.
2. **Runs → Create run:** choose the pay month and currency. AED and PKR runs are separate.
3. Enter overtime, optional unpaid-day override and holds. Inputs autosave; the Save button also saves explicitly. Add additions/deductions from the catalogue, using a fixed amount, percentage or quantity calculation. Related Worktello records and supporting files are optional.
4. **Calculate / recalculate.** Resolve missing assignments, negative net, category caps and pending item approvals. Automatic commissions and recurring items are included without duplication. HR may override automatic items with a reason, including a zero override. Loan recovery respects the configured net-pay floor.
5. A named approver reviews and approves. Over-limit item approval requires recalculation before run approval. Any intervening payroll input mutation requires recalculation before approval. Approved runs cannot be edited; reopening requires a reason.
6. Accounts downloads the register/bank CSV, performs the actual payment separately, then records its reference with **Mark paid**. The app records payment; it does not transfer money. Pay is planned for the 2nd–5th of the following month.
7. **Lock payroll** after reconciliation. Paid and locked runs cannot be recalculated or edited.

Loan recovery, paid expenses, commissions, clawbacks, the run state and payroll audit changes are persisted in a single MongoDB transaction. Repeating Mark paid with the same reference does not duplicate effects. A changed reference is refused. Held payslips are excluded from bank/register exports and payment effects. Held commission reservations are released for the next eligible run; unpaid approved expenses carry forward. Salary arrears for a held month remain an explicit HR adjustment.

## Commission and clawback

Create a commission plan for the linked sales employee. New contracts carry the sales owner from a won opportunity; manual contracts default to their creator. Renewals retain the owner and require an explicit manual commission rate. Existing contracts missing an owner must be reviewed and assigned through the Commissions screen; names are not guessed.

Accounts records receipts with contract, amount, currency, date and unique reference. Commission accrues when a run is calculated, proportional to receipts and capped at the recurring contract value over its term. Setup and training fees are excluded. The signing date comes from completed Worktello signing; legacy agreements can have their actual signing date entered explicitly. Inactive plans do not accrue.

Automatic commission requires matching contract and employee payroll currencies. The app never silently converts AED receipts into PKR pay or invents an exchange rate. Review incompatible plans before calculating that currency's payroll.

Cancellation within the configured window (default 90 days after signing) generates a clawback suggestion. HR must confirm it. Only the commission actually paid, after any HR override, can be clawed back. Holds and retries do not duplicate or strand the deduction.

## My pay and receipts

Employees see only their own paid/locked, non-held payslips and their own requests. They can request leave, loans/advances and reimbursements. HR approves/rejects requests and chooses the expense payment month. Receipt PDFs/images can be attached while an expense is submitted; run supporting files are attached while a run is editable. Files are private, tenant-scoped, forced downloads with no-store headers. Upload limit is 3 MB per file.

## Excel import

Download the native `.xlsx` template from **Import**. It contains Employees, Assignments, Leave balances and Loans sheets. Keep the column headers. Enter identifiers, account numbers and IBANs as text to preserve leading zeros and every digit. Use YYYY-MM-DD dates and YYYY-MM periods. Opening leave days represent carry-forward at the start of the stated year, before that year's accrual and usage.

Preview first. Apply only after the complete workbook validates; no partial import is committed. Repeating the same employee codes, assignment effective dates and opening-loan references does not duplicate data. Conflicting existing employee/assignment details require manual review. Formulas, links, macros, numeric bank identifiers and oversized/over-expanded workbooks are rejected. Limits: 2 MB compressed, 20 MB expanded, 500 rows per sheet and 1,000 rows total.

## Reports, exports and payslips

Reports include a payroll register, paid cost by department/currency, loan balances and paid month-end leave snapshots. Bank CSV includes eligible bank-method employees only; held, zero/negative-net, cash/cheque and missing-account employees are skipped. Review calculation warnings before payment.

The payslip PDF is a **provisional draft layout**, with YTD amounts and an optional second page of month-summary snapshots. Bank copy is page 1 only. The current prototype deliberately carries a draft-layout label. Final branding, stamp/signature, spacing and content review are deferred until the full module's rollout, as instructed. The final payslip template is not claimed approved or bank-accepted.

Paid payroll queues an authenticated payslip link through the existing email outbox when outbound mail is configured. No mail worker was started or real email sent during local QA. Journal export remains blocked while Zoho accounts/import columns are pending; no accounting posting or Zoho API call occurs.

## Local QA evidence

Synthetic data only: [approved run](../../../../outputs/qa/payroll/2026-11-28/approved-run.jpg), [locked run](../../../../outputs/qa/payroll/2026-11-28/locked-run.jpg), [employee self-service](../../../../outputs/qa/payroll/2026-11-28/my-pay-desktop.jpg). Detailed results are in `docs/resolutions/2026-11-28-payroll-integration.md` and the adjacent QA report. Local evidence does not establish CI or production acceptance.

# Payroll: Feedback Log

| Date        | From | Area       | Feedback                                                                                                       | Status         |
| ----------- | ---- | ---------- | -------------------------------------------------------------------------------------------------------------- | -------------- |
| 27 Nov 2026 | John | Scope      | Generic rules first; P1 = core run, leave, loans/reimbursements, Zoho journal export                           | Accepted       |
| 27 Nov 2026 | John | Rules      | Actual days; approvers Umbreen and/or John; Zoho "Salaries & Other Benefits"; pay 2nd–5th, payslips then       | Applied        |
| 27 Nov 2026 | John | Approval   | One approval (Umbreen or John) is enough                                                                       | Applied        |
| 27 Nov 2026 | John | Zoho       | Sent chart: per-employee "Salary for X" accounts + benefit accounts                                            | Applied        |
| 27 Nov 2026 | John | Payslip    | Shared original July 2025 payslip; amended template built (sample in samples/)                                 | For review     |
| 27 Nov 2026 | John | Zoho       | Advances → Employee Advance; no bank account; Khubaib under Salaries & Other Benefits                          | Applied        |
| 27 Nov 2026 | John | Structure  | Package split by %, Other allowance = balance; insurance for future                                            | Planned        |
| 27 Nov 2026 | John | Pay items  | Additions/Deductions drop-down; HR only; > AED 1,000 approval by Umbreen or John; note visibility per category | Planned        |
| 27 Nov 2026 | John | Commission | Contract value; on payment received; renewals manual; clawback                                                 | Planned        |
| 27 Nov 2026 | John | Commission | Proportional to each payment; clawback 90 days default, editable                                               | Built (engine) |
| 27 Nov 2026 | John | Structure  | % configurable by HR, world-standard defaults                                                                  | Built (engine) |
| 27 Nov 2026 | John | Delivery   | Deploy complete project first; payslip design finalised last                                                   | Agreed         |
|             |      |            |                                                                                                                |                |

Add team test results here after each release.

## Implementation follow-up — 28 November 2026

- John approved all proposed integration work except Zoho account confirmation; journal export remains blocked.
- Runtime engine and application workflows implemented in the approved consolidated folder.
- Added Zod 4 defaults, explicit minor-unit storage, half-away-from-zero money rounding, independent approvals, private salary access and retry-safe transactions.
- Native Excel import validates before atomic writes; bank identifiers retain text precision.
- Commission uses recurring term value, excludes setup/training, and refuses implicit FX conversion. Actual paid amounts drive confirmed clawbacks.
- Final payslip styling/content and stamp/signature remain the agreed last review stage.
- Owner requested final QA, local commit and shutdown. Evidence/results: outputs/qa/payroll/2026-11-28/QA.md.

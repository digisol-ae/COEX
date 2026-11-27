# Payroll integration — 28 November 2026

## Result and scope

The existing pure Payroll engine is integrated into the consolidated Worktello checkout. John approved the implementation except Zoho account confirmation, and requested QA, commit and shutdown afterwards. The working folder is `/Volumes/sd-mac/Developer/DigiSol/worktello`; no new worktree was created.

The module includes employee profiles, versioned salary structures/effective assignments, settings, leave, loans, reimbursements and private receipts, catalogue and recurring additions/deductions, monthly calculation, independent approval, reopening, payment recording, locking, payroll/bank exports, employee self-service, month summaries, draft PDFs and native Excel opening-data import. Contracts retain sales attribution; Accounts can record receipts; commission accrues proportionally against recurring term value, with explicit HR overrides and confirmed clawbacks.

Payroll is off by default. Its permissions are separate from ordinary user/tenant/task access. Existing tenant administrators receive no blanket salary access. The platform owner enables the initial DigiSol rollout and assigns HR/approver/Accounts grants. Ordinary staff queries additionally filter by the linked employee and return only their own paid/locked payslip projection. Tenant checks and current permission checks run in services as well as UI guards.

## Persistence and payment controls

Separate tenant-scoped collections use schema-validated payloads, timestamps, soft deletion, unique keys and optimistic record versions. Money is stored under explicit MinorUnits keys and converted at the engine boundary. Decimal half-cents round away from zero; unsafe arithmetic is rejected. The shared repository now supports optional Mongo sessions without changing its default query behavior.

A payroll settings mutex serializes writes. Calculation stores the input revision; intervening payroll changes require recalculation before approval. Maker/checker separation applies even to platform administrators. Payment effects, reimbursements, commission consumption, clawback status, state transitions and audit writes use one transaction. Identical payment retries are idempotent; changed references fail. General audit records exclude salary/bank snapshots; detailed before/after changes remain in private Payroll records.

Approved payment/employee information is snapshotted, so later bank/profile edits cannot reroute an approved export. Holds exclude payment effects; commission reservations and unpaid approved expenses carry forward. Actual overridden commission paid is tracked so clawback cannot recover an unpaid amount. Automatic commission refuses implicit cross-currency conversion. Actual signing dates come from completed signing or explicit legacy entry, not guessed start dates.

## Verification

Final command results and browser evidence are recorded in `outputs/qa/payroll/2026-11-28/QA.md`.

The local browser exercise used separate synthetic HR, approver, Accounts and employee accounts: calculate → approve → mark paid → lock; own payslip download; selected advance subtype preserved; employee salary-list URL rejected. The downloaded two-page draft PDF was rendered and inspected. No production business write, bank transfer, real email, push, deployment or live acceptance was performed.

Adding a default-off module exposed a legacy generic mention-mail pause check that treated any disabled module as a reason to pause; it now considers the existing task/ticket/CRM modules, while payroll mail has its own explicit source. Existing menu/module tests were extended for the new default. Excel identifiers are text-preserving and ZIP expansion is bounded before parsing. ExcelJS is scoped to import/template generation; its UUID dependency is patched, and Mongoose was updated within major version 9. The runtime dependency audit reports no vulnerabilities.

## Deliberately deferred

- Zoho account confirmation and import columns: journal export remains blocked; no API push/posting.
- Final payslip layout/content, branding and stamp/signature review: provisional output remains labelled draft; finalise last after full-module rollout, per owner instruction.
- Statutory country packs, final settlement, People/Recognition scorecards and automatic currency conversion are later scope.

## Owner release steps

Review `ai/PAYROLL-OWNER-COMMANDS.md`, create/review the PR and follow the current deployment runbook. No production enabling or salary-data import should happen before the owner's normal backup/release process. Use `/payroll` for explicit DigiSol setup after deployment; choose actual staff accounts rather than hardcoded names or IDs.

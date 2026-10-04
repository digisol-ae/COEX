# COEX Phase 2 plan (draft for John, 4 Oct 2026)

Status: draft. Nothing here is decided until John confirms it. No Phase 2 scope document exists
in the repository; this is built from the original priority list and CLAUDE.md.

## Starting point

Phase 1 is live except hardening and the suspended Channels work (M6.3 to M6.6, suspended 4 Oct
2026). Phase 2 attaches Contracts, Payroll and full CRM to the existing platform. Zoho Books stays
the accounting system; COEX integrates with it and never replaces it.

## Proposed order

| Order | Module | Why here |
|---|---|---|
| 1 | Contracts / AMC | Builds directly on customers and products from M2. Renewals feed tickets and revenue visibility. Lowest new risk. |
| 2 | Full CRM | Leads, opportunities, pipeline, activity history. Reuses customers, contacts, tasks. |
| 3 | Payroll | Highest sensitivity (salary data, UAE rules). Needs its own permission model and John's policy input, so it goes last. |
| Alongside | Zoho Books integration | Invoice and payment status read into contracts; start read-only. |

Payroll before CRM is possible if the business need is more urgent: tell me.

## 1. Contracts / AMC (first)

- Contract per customer: type (AMC, project, subscription), term, renewal date, value in integer
  minor units with currency, covered products or assets, SLA tier.
- Lifecycle: draft, active, expiring, expired, renewed, cancelled. Nothing deletes (archive only).
- Renewal reminders through the existing email outbox and dashboard; renewal creates a task.
- Tickets link to the customer's active contract; an SLA tier can drive the ticket SLA clock.
- Documents stay in Microsoft 365: the contract stores links, not files (decision 5).
- Open questions for John: what AMC variants exist; is billing handled entirely in Zoho; should
  support time count against contract hours?

## 2. Full CRM

- Leads and opportunities with configurable pipeline stages (same idea as Space workflows).
- Activity timeline per customer and contact: tickets, tasks, calls, notes, emails.
- Quotes stay in Zoho unless John says otherwise.
- WhatsApp conversations (M6.5) wait for the suspended Channels work.

## 3. Payroll

- Employee records, salary structure, allowances, deductions, leave, attendance feed from time
  tracking, monthly pay run, payslips.
- Own permission (`payroll.*`), audit on every read of salary data, no role holds it by default.
- Needs from John first: UAE specifics (WPS file format, end of service gratuity, leave rules),
  headcount and whether payroll is for DigiSol only or for client tenants too.

## Cross-cutting rules

- Same module pattern, tenant scoping, minor-unit money, audit log, release notes.
- Each module ships in small milestones, each accepted by John before the next.
- Estimates: not given until John confirms scope and order.

## Decisions needed from John

1. Confirm the order (Contracts, CRM, Payroll) or change it.
2. Answer the open questions under Contracts so the first milestone can be specified.
3. Whether to start Contracts after M8 hardening closes or in parallel.

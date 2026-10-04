# P2.1 Contracts / AMC specification (draft for John)

Built on John's answers of 4 Oct 2026. Billing lives entirely in Zoho Books; COEX tracks the
contract and never issues invoices.

## Model: `Contract` (module `contracts`, tenant scoped)

| Field               | Notes                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| number              | Generated, tenant prefix (like tickets), e.g. DGS-C-0001                                                                       |
| organisationId      | The customer (existing CRM organisation)                                                                                       |
| title, type         | type: `amc`, `project`, `subscription`                                                                                         |
| status              | `draft`, `active`, `expiring`, `expired`, `renewed`, `cancelled`. `expiring` is derived from the reminder window, not typed in |
| startDate, endDate  | AMC term defaults to one year; stored as local calendar dates, never sliced from UTC                                           |
| billingFrequency    | `monthly`, `bimonthly`, `quarterly`, `yearly`                                                                                  |
| value               | Integer minor units per billing period, plus `currency` (AED, USD, PKR, any ISO code)                                          |
| coveredProducts     | Links to existing CRM products, optional notes                                                                                 |
| documentUrl         | Link to the signed contract in Microsoft 365 (decision 5: links, never files)                                                  |
| zohoReference       | Free text now (customer or subscription id); used by the later read-only sync                                                  |
| renewalReminderDays | Default 60 and 30, editable per contract                                                                                       |
| supportHours        | Optional. Off by default; when on, `includedHoursPerPeriod`                                                                    |
| renewedFromId       | Chain to the previous contract; renewing creates a new contract, never edits history                                           |
| archivedAt          | Nothing deletes                                                                                                                |

## Behaviour

- Renewal: one action copies a contract into a new draft starting the day after the old one ends.
  The old contract becomes `renewed` when the new one is activated.
- Reminders: the existing outbox and email worker send a staff alert at each reminder day and a
  task is raised for the contract owner. New staff alert kind `contract_renewal`, switchable in
  Setup, Email.
- Billing schedule: shown as a list of due periods derived from start, end and frequency. It is a
  reminder for finance, not an invoice. Marking "invoiced in Zoho" is a manual tick until the
  read-only Zoho sync exists.
- Tickets: a ticket for an organisation shows its active contract, or a "no active contract"
  notice. Nothing is blocked automatically.
- Support hours (optional contracts only): time logged on tickets of that organisation counts
  against the period's included hours; a contract page shows used and remaining. Exceeding hours
  warns, never blocks.
- Permissions: `contract.read`, `contract.write`; managers and administrators by default.
  Contract value is hidden from anyone without `contract.read`.
- Menu: a Contracts group in navigation.ts; list, detail and renewals-due views.
- Every change is audited. A release-notes entry ships with it.

## Milestones

1. P2.1a Contract model, CRUD, list and detail, organisation page tab, permissions, audit.
2. P2.1b Renewal action, reminders, task creation, Renewals due dashboard card.
3. P2.1c Billing schedule and manual invoiced tick; ticket contract notice; optional support
   hours.
4. P2.1d Read-only Zoho Books link (needs Zoho API access from John).

## John's answers, 4 Oct 2026

1. Covered products: pick from the CRM product list; if a product is not listed, it can be added
   directly from the same drop-down (creates a CRM product, so nothing is typed twice).
2. Renewal owner: the organisation's owner (`Organisation.ownerId`). No per-contract owner.
3. Expiry warnings: start when the contract has fewer than 30 days left, configurable per
   customer (`expiryWarningDays` on the organisation, default 30). From then until renewal, and
   after expiry, the warning shows to agents on the contract and on that organisation's tickets,
   and the customer's contract contact is emailed (Standard sender, sent through the outbox,
   once at the threshold and again at expiry, never to automatic mail). Contract contacts are
   chosen on the contract from the organisation's contacts. This replaces the single reminder
   list in the Behaviour section: staff reminders stay on the owner, customer warnings are new.
4. SLA tiers: not decided, see "SLA tiers explained" below. Default for now: later.

## SLA tiers explained

Today every ticket gets its reply and resolution deadlines from its queue. A contract could add a
service level, for example Gold (reply within 1 hour), Silver (4 hours), Standard (next business
day), and a ticket from that customer would then use the contract's deadlines instead of the
queue's. It affects the Missed and Delayed counts and the dashboard. It is a separate, sizeable
piece of work, so my recommendation is to build contracts without it and add it as P2.1e if you
want customers treated differently. Reply "later" or "include" and I will record it.

## Open

- Confirm the customer warning goes to the contract contact(s) chosen on the contract (my reading
  of "the customer who created the contract").
- SLA tiers: later or include.

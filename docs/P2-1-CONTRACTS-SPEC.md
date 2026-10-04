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

## Open questions for John

1. Should a contract list its covered products from the CRM product list, or just free text?
2. Who owns a renewal: the account manager on the organisation, or chosen per contract?
3. Should an `expired` contract with open tickets show a warning to agents?
4. Are there SLA tiers per contract that should change ticket response targets, or is that
   later?

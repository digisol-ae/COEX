# P2.2 Full CRM specification (draft for John)

Status: draft, 4 Oct 2026. P2.2a (Leads) built 9 Oct 2026, see "Built: P2.2a" at the end. Nothing here is decided until John confirms it. Contracts (P2.1) is
built; this is the next module in the agreed order. Quotes and invoicing stay in Zoho Books, and
WhatsApp conversations wait for the suspended Channels work (M6.5).

## What exists today

Customers (organisations) with a `prospect` / `client` kind, contacts, locations, custom fields, a
single activity timeline per customer, products, contracts, an organisation `ownerId`, tickets and
tasks linked to customers. The CRM foundation was built so that this module is mostly new screens
and two new records, not a second data model.

## Goal

Let DigiSol track a sale from first interest to a signed contract, with a clear owner and next step
at every point, and have the won deal flow into the customer and contract records that already
exist. No quotation builder, no marketing automation, no forecasting engine (decision 7 keeps
automations out).

## Records

### Lead

A possible customer who has not yet been qualified.

| Field                        | Notes                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| number                       | Generated, tenant prefix, e.g. DGS-L-12                                                             |
| name, company, email, mobile | Mobile in E.164 with the country picker (existing convention)                                       |
| source                       | Referral, website, event, phone call, email, WhatsApp (later), other. The list is editable in Setup |
| ownerId                      | The salesperson responsible                                                                         |
| status                       | `new`, `working`, `converted`, `disqualified`                                                       |
| disqualifiedReason           | Required when disqualified; the lead is kept, never deleted                                         |
| notes, customFields          | Existing custom field mechanism, a new entity type `lead`                                           |
| convertedTo                  | Organisation, contact and opportunity ids, once converted                                           |

Converting a lead creates (or links to an existing) customer of kind `prospect`, a contact, and
optionally an opportunity, in one step, and copies the lead's activity onto the customer's
timeline. Duplicate warning on email, mobile or company name before creating a lead.

### Opportunity

A potential sale to a customer.

| Field                     | Notes                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| number                    | Generated, e.g. DGS-O-31                                                                                         |
| organisationId, contactId | Always a customer; a lead converts first                                                                         |
| title                     | e.g. "R4+ rollout, three clinics"                                                                                |
| stageId                   | A pipeline stage (below)                                                                                         |
| ownerId                   | Defaults to the customer's owner                                                                                 |
| value                     | Integer minor units with currency (AED, USD, PKR and others), expected one-off and recurring parts kept separate |
| expectedCloseDate         | Calendar day text, like contract dates                                                                           |
| probability               | Taken from the stage, adjustable per opportunity                                                                 |
| productIds                | From the CRM product list, addable from the form (same pattern as contracts)                                     |
| status                    | `open`, `won`, `lost`                                                                                            |
| lostReason                | Required when lost; picked from an editable list plus free text                                                  |
| nextStep, nextStepDate    | One line each; an opportunity with no next step is flagged                                                       |
| archivedAt                | Nothing deletes                                                                                                  |

### Pipeline stages

Per tenant, editable in Setup, same rules as Space workflows: stages have an order, a default
probability, and exactly one stage marks `won` and one `lost`. A stage cannot be renamed away or
removed while opportunities sit in it. Starting set: Qualified, Needs analysis, Proposal sent,
Negotiation, Won, Lost. One pipeline per tenant for now.

### Activities

The existing timeline gains two kinds, `stage_changed` and `next_step_set`, and leads and
opportunities write to it automatically. Calls, meetings and notes are logged from the lead or
opportunity page and show on the customer timeline too. Nothing is edited or deleted after the
fact except a note's text, as today.

## Screens

- **Sales** menu group (new) under CRM: Leads, Opportunities, Pipeline.
- **Leads**: table with owner, source and status filters, search, convert and disqualify actions.
- **Opportunities**: table, plus a **Pipeline board** (columns are stages, cards show customer,
  value and next step date). Dragging a card changes stage; keyboard and phone users change the
  stage from the card's menu, because nothing may work only by drag.
- **Opportunity page**: details, activity timeline, linked tickets and tasks of the customer,
  contracts of the customer, and the next step.
- **Customer page** gains an Opportunities panel and keeps its Contracts and Tickets panels.
- **Dashboard card** for people with `opportunity.read`: my open opportunities by stage and the
  ones with a next step overdue or none.

## Rules

- Winning an opportunity prompts, but never forces, "Create a contract" prefilled with the
  customer, products and value. The contract stays a separate record that a manager activates
  (Contracts spec). Winning also turns a `prospect` customer into a `client`.
- Value totals are shown per currency and never added across currencies; no conversion rates.
- Stage changes record who and when on the timeline. A won or lost opportunity can be reopened by
  a manager, with a reason, and the reopening is audited.
- Reminders: the owner is emailed when a next step date arrives and when an open opportunity has
  had no activity for a configurable number of days (default 14). New staff alert kinds
  `next_step_due` and `opportunity_stale`, switchable in Setup, Email, sent by the existing email
  worker like contract reminders.
- Visibility: salespeople see leads and opportunities they own; managers and administrators see
  all. Value is hidden from anyone without the permission to read opportunities.

## Permissions

`lead.read`, `lead.manage`, `opportunity.read`, `opportunity.manage`, `pipeline.manage` (stages and
lists). Tenant administrators and managers hold all; agents hold none by default and are granted
per person in Users and roles, like `timesheet.read.all`.

## Integrations

- **Zoho Books**: nothing here talks to Zoho. A won opportunity's contract carries the Zoho
  reference as in Contracts. Quotes are made in Zoho and the number is stored on the opportunity
  as a plain reference (`quoteReference`).
- **Microsoft 365**: proposal documents are links, never files (decision 5).
- **WhatsApp / XVERSE**: leads from WhatsApp arrive with M6.5 and need nothing built now except
  the lead `source` value.

## Milestones

1. **P2.2a** Leads: model, numbering, sources, list, create and edit, duplicate warning,
   disqualify, custom fields, permissions, audit.
2. **P2.2b** Pipeline and opportunities: stages in Setup, opportunity model, list, opportunity page,
   next step, won and lost with reasons.
3. **P2.2c** Lead conversion and the pipeline board, customer page panel, win to contract
   shortcut.
4. **P2.2d** Reminders (next step due, stale), dashboard card, activity kinds on the timeline.

Each milestone ships with release notes, tests and docs and is accepted by John before the next.

## Not included (stated so nobody assumes them)

Quotation builder, price lists beyond the product list, email sequences and campaigns, lead
scoring, web forms, sales forecasting and targets, multiple pipelines, currency conversion,
territories. Any of these is a later decision.

## Open questions for John

1. Who sells at DigiSol: a few named salespeople, or does everyone on the team own leads? This
   decides the default permissions.
2. One pipeline is proposed. Does DigiSol sell different things (for example new R4+ clinics versus
   upgrades and extra modules) that need different stages?
3. Are the proposed stages right, and what are the real lost reasons you hear (price, competitor,
   timing, no budget, no reply)?
4. Should opportunity value separate one-off (licence, setup) from recurring (AMC, subscription)
   as proposed, or is a single amount enough?
5. Where do leads come from today, so the first source list matches reality?
6. Are the reminder defaults right: owner emailed on the next step date, and after 14 days without
   activity?

## John's answers, 5 Oct 2026 (these override anything above that disagrees)

1. Everyone sells: all staff roles hold the lead and opportunity permissions by default and see
   their own records. Seeing everyone's is a separate permission, `sales.read.all`: managers and
   tenant administrators have it by default; an agent only when John grants it per person in Users
   and roles (confirmed 5 Oct 2026).
2. Several pipelines, each with its own stages. A `Pipeline` record (name, order, stages) replaces
   the single pipeline; an opportunity stores its `pipelineId` and `stageId`. Pipelines and stages
   are managed in Setup (`pipeline.manage`).
3. No Negotiation. Stages are customizable (add, rename, reorder, set default probability); each
   pipeline has exactly one Won and one Lost stage, and a stage in use cannot be removed. Default
   set: Qualified, Needs analysis, Proposal sent, Won, Lost.
4. Lost reasons: Price and No reply to start, plus free text; a customizable list in Setup.
5. Value is two amounts: one-off and recurring, each with its own currency.
6. Lead sources: Referral, Website, Event, Phone call, Email, WhatsApp, Other to start; a
   customizable list in Setup.

Milestone effect: P2.2b now includes Setup for pipelines, stages, sources and lost reasons.

## Built: P2.2a Leads (9 Oct 2026, Claude)

Built ahead of John's answers to the open questions above, using the spec's proposals; changing any
of them later is a small edit. Where the build departs from or adds to the spec:

- Permissions: `lead.read`, `lead.read.all` (new) and `lead.manage`. The spec's visibility rule
  (salespeople see their own leads, managers see all) needs a separate "all" permission, as tasks
  and tickets have. `lead.manage` implies `lead.read`, `lead.read.all` implies `lead.read`. Held by
  tenant administrators and managers; an agent is granted per person. `pipeline.manage` waits for
  P2.2b.
- Sources are a list on the tenant (`leadSources`, Setup, Tenant settings) rather than a table.
  A lead keeps its source as text, so removing a source never changes existing leads. Prefix is
  `numbering.leadPrefix` (default `L`, so L-12).
- Duplicate warning checks leads (any owner's), customers (email, company) and contacts (email,
  mobile); company names compare without case, punctuation or legal suffix (LLC, Ltd, FZE...).
  It warns and never blocks: a tick box saves the lead anyway.
- Custom fields: new entity type `lead`. Leads have no activity timeline yet (the shared timeline
  needs a customer); the notes field covers P2.2a and conversion (P2.2c) will carry it across.
- Not in P2.2a: conversion, opportunities, pipeline, reminders.

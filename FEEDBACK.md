# FEEDBACK

Running backlog. Newest at the top. Each item is numbered, has a state and a short note.

## Open

1. Entra app registration on the DigiSol Microsoft 365 tenant. Needed for single sign on and for
   Graph document titles and permissions. Password sign on covers the gap. State: awaiting John.
2. Backups. Atlas free tier has none. The decision is needed before M7 loads osTicket history:
   paid tier with continuous backups, or a scheduled mongodump to object storage. State: awaiting
   John.
3. Figma design. John may share a file to adopt. Tokens live in one place, so adopting it is mostly
   rewriting globals.css and the component library rather than touching screens. State: awaiting
   John.

## Done

1. M4 Time tracking built on 17 Sep 2026: timer on the task, running timer in the header, weekly
   timesheet, week locking with an audited unlock reason, time report by person, project and
   customer, CSV export. Awaiting John's acceptance.
2. Continuous integration on GitHub: types, lint, formatting, unit tests and build on every push.
   The suite is split so pure functions run in CI and database tests run locally.
3. Navigation reworked: collapsible groups for Tasks and planning, CRM, Security and Setup, a phone
   drawer sharing one implementation with the sidebar, and sign out reduced to an icon.
4. M3 Tasks and dashboard built: portfolios, projects, board and list views, steps, Microsoft 365
   document links, filters in the address bar, and the dashboard as the screen after login.
5. M2 CRM foundation built: customers, contacts with a country picker for mobiles, sites, the single
   timeline, the product catalogue and per tenant custom fields.
6. M1 Foundation accepted by John: tenancy, password sign on, revocable sessions, roles with per
   user overrides, audit log, tenant settings, user administration and tenant creation.
7. Product name COEX, repository digisol-ae/COEX, terminology Portfolio, Project, Task, Step, team
   size ten, port 3100, Node 22 LTS.

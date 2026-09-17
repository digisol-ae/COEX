# FEEDBACK

Running backlog. Newest at the top. Each item is numbered, has a state and a short note.

## Open

0. Next work, agreed with John on 17 Sep 2026. Tasks and Tickets are the focus, because he will use
   both daily in a live environment.
   a. Start and end date with time on a task, so planned hours can be calculated and compared with
   logged time.
   b. Drag and drop a task between columns on the board, and reorder or move it in the list view.
   c. Projects in the menu as an expandable tree: project, then its tasks, then their subtasks.
   d. A Gantt view per project.
   e. An overall progress percentage per project, shown as a bar.
   Note: once John works live, the deferred backup decision stops being optional, because the data
   stops being disposable.

1. Entra app registration. Deferred by John on 17 Sep 2026. Password sign on covers the gap.
   Revisit before the team starts signing in daily, since it also unlocks Graph document titles.
2. Backups. Deferred by John on 17 Sep 2026. Atlas free tier has none. This stops being optional at
   M7, when real osTicket history lands in the database: either a paid tier with continuous backups
   or a scheduled mongodump to object storage, decided before the dry run.
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

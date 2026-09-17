# FEEDBACK

Running backlog. Newest at the top. Each item is numbered, has a state and a short note.

## Open

0. Awaiting John's look at the project screen, rebuilt on 17 Sep 2026 against his ClickUp
   walkthrough: view tabs, a filter toolbar, a grouped list table, editing in place on cards and
   rows, subtasks opening inside a row, Gantt zoom, and a breadcrumb.
   Not built yet from that walkthrough, in the order I would take them:
   a. A slide over panel for a task, so opening one does not leave the board.
   b. An inline add row at the foot of each list group and board column, instead of the shared form.
   c. Counts beside the items in the icon rail.
   d. Exporting a Gantt as an image or PDF.
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

1. The five task features John asked for on 17 Sep 2026, all built: start and end with time driving
   planned hours; drag and drop across columns and within the list; projects as an expandable tree
   in the menu down to subtasks; a Gantt per project, now with Week, Month, Quarter and Fit zoom;
   and a progress percentage per project. Editing in place followed, because a plan that needs a
   full form per change does not get kept up to date.
2. M4 Time tracking built on 17 Sep 2026: timer on the task, running timer in the header, weekly
   timesheet, week locking with an audited unlock reason, time report by person, project and
   customer, CSV export. Awaiting John's acceptance.
3. Continuous integration on GitHub: types, lint, formatting, unit tests and build on every push.
   The suite is split so pure functions run in CI and database tests run locally.
4. Navigation reworked: collapsible groups for Tasks and planning, CRM, Security and Setup, a phone
   drawer sharing one implementation with the sidebar, and sign out reduced to an icon.
5. M3 Tasks and dashboard built: portfolios, projects, board and list views, steps, Microsoft 365
   document links, filters in the address bar, and the dashboard as the screen after login.
6. M2 CRM foundation built: customers, contacts with a country picker for mobiles, sites, the single
   timeline, the product catalogue and per tenant custom fields.
7. M1 Foundation accepted by John: tenancy, password sign on, revocable sessions, roles with per
   user overrides, audit log, tenant settings, user administration and tenant creation.
8. Product name COEX, repository digisol-ae/COEX, terminology Portfolio, Project, Task, Step, team
   size ten, port 3100, Node 22 LTS.

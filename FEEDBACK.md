# FEEDBACK

Running backlog. Newest at the top. Each item is numbered, has a state and a short note.

## Open

0. Awaiting John's look at the project screen, rebuilt on 17 Sep 2026 against his ClickUp
   walkthrough: view tabs, a filter toolbar, a grouped list table, editing in place on cards and
   rows, subtasks opening inside a row, Gantt zoom, and a breadcrumb.
   Since then, also built on 18 Sep 2026: the slide over task panel, the add line at the foot of
   every column and group, and badges on the rail for my own open tasks and tickets.
   Not built yet from that walkthrough:
   a. Exporting a Gantt as an image or PDF.
   b. The same treatment for My tasks, which still uses the older list.
   Note: once John works live, the deferred backup decision stops being optional, because the data
   stops being disposable.

0b. Ticket attachments, the one piece of M5 not built. It needs object storage before it needs
   code: a small adapter with a local disk implementation for development and an S3 compatible one
   for the cloud, then image compression with sharp on upload. PDF downsampling needs Ghostscript
   on the server and is worth deferring until we know whether customers actually send large PDFs.
   This also decides where osTicket's existing attachments land at M7.

1. Entra app registration. Deferred by John on 17 Sep 2026. Password sign on covers the gap.
   Revisit before the team starts signing in daily, since it also unlocks Graph document titles.
2. Backups. Deferred by John on 17 Sep 2026. Atlas free tier has none. This stops being optional at
   M7, when real osTicket history lands in the database: either a paid tier with continuous backups
   or a scheduled mongodump to object storage, decided before the dry run.
3. Figma design. John may share a file to adopt. Tokens live in one place, so adopting it is mostly
   rewriting globals.css and the component library rather than touching screens. State: awaiting
   John.

## Done

1. Board and list finished on 18 Sep 2026: a task opens in a panel over the board rather than on
   its own page, a task is added from a line at the foot of the column it belongs in, and the rail
   carries a badge for my own open tasks and tickets. Awaiting John's acceptance.
2. M5 Support desk built on 18 Sep 2026: queues with per priority working hour targets, the ticket
   list with both service level clocks and five scopes, the ticket screen with public replies and
   internal notes rendered as clearly different objects, saved replies with placeholders, status,
   owner, priority and queue editable in place, merging, linking, escalation to a task, the desk
   report on medians, and a support block on the dashboard. A new tenant is created with a queue.
   Attachments are the one piece still missing, listed above. Awaiting John's acceptance.
3. The five task features John asked for on 17 Sep 2026, all built: start and end with time driving
   planned hours; drag and drop across columns and within the list; projects as an expandable tree
   in the menu down to subtasks; a Gantt per project, now with Week, Month, Quarter and Fit zoom;
   and a progress percentage per project. Editing in place followed, because a plan that needs a
   full form per change does not get kept up to date.
4. M4 Time tracking built on 17 Sep 2026: timer on the task, running timer in the header, weekly
   timesheet, week locking with an audited unlock reason, time report by person, project and
   customer, CSV export. Awaiting John's acceptance.
5. Continuous integration on GitHub: types, lint, formatting, unit tests and build on every push.
   The suite is split so pure functions run in CI and database tests run locally.
6. Navigation reworked: collapsible groups for Tasks and planning, CRM, Security and Setup, a phone
   drawer sharing one implementation with the sidebar, and sign out reduced to an icon.
7. M3 Tasks and dashboard built: portfolios, projects, board and list views, steps, Microsoft 365
   document links, filters in the address bar, and the dashboard as the screen after login.
8. M2 CRM foundation built: customers, contacts with a country picker for mobiles, sites, the single
   timeline, the product catalogue and per tenant custom fields.
9. M1 Foundation accepted by John: tenancy, password sign on, revocable sessions, roles with per
   user overrides, audit log, tenant settings, user administration and tenant creation.
10. Product name COEX, repository digisol-ae/COEX, terminology Portfolio, Project, Task, Step, team
   size ten, port 3100, Node 22 LTS.

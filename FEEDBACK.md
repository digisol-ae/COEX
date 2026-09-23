# FEEDBACK

Running backlog. Newest at the top. Each item is numbered, has a state and a short note.

## Open

0. Awaiting John's look at the project screen, rebuilt on 17 Sep 2026 against his ClickUp
   walkthrough: view tabs, a filter toolbar, a grouped list table, editing in place on cards and
   rows, subtasks opening inside a row, Gantt zoom, and a breadcrumb.
   Since then, also built on 18 Sep 2026: the slide over task panel, the add line at the foot of
   every column and group, badges on the rail, and My tasks rebuilt as a personal list grouped by
   deadline with the same editing.
   Not built yet from that walkthrough:
   a. Exporting a Gantt as an image or PDF.
   John is unsure whether this review and the Gantt export are already complete; verify the
   repository and deployed product before changing this item's status.

0b. Production attachment storage decision: use DigiSol's own cloud server. Attachments are built
   and working on local disk behind a one-file adapter. Verify the production configuration before
   M7, when osTicket's existing attachments land there. PDF downsampling stays deferred: it needs
   Ghostscript on the server and we do not yet know whether customers send large PDFs at all.

0c. Four levels landed on 18 Sep 2026: Space, Folder, Task, Subtask, with folder level visibility.
   John is unsure whether `npm run migrate:spaces` has been run for databases written before this
   change. Verify migration history before marking this complete.

1. Batch C — Entra app registration. Password sign-on covers the gap. Revisit when Batch C is
   scheduled; it also unlocks Graph document titles.
2. Figma design. Defer to the next version, approximately 3–8 Oct 2026. Tokens live in one place,
   so adoption is mostly rewriting globals.css and the component library rather than touching
   screens.

## Done

0. Backups are already implemented by John's team. No COEX backup implementation work is required
   at present; verify operational ownership and recovery testing before the M7 import.

1. Timesheet entries are correctable in place on 18 Sep 2026, with the history of each entry on its
   own row: number, day, task, note and billable. Only an administrator may correct somebody
   else's, and the audit records whose it was. Fixed a real defect found while testing: every work
   date written as text went through toISOString, so Friday's work in Karachi or Dubai was reported
   as Thursday's in the CSV a client is invoiced from.
2. Ticket attachments on 18 Sep 2026: a one file storage adapter, images resized and re-encoded on
   upload with the original size kept beside the new one, everything else stored byte for byte, and
   downloads checked per ticket per person. Completes M5.
3. Board and list finished on 18 Sep 2026: a task opens in a panel over the board rather than on
   its own page, a task is added from a line at the foot of the column it belongs in, and the rail
   carries a badge for my own open tasks and tickets. Awaiting John's acceptance.
4. M5 Support desk built on 18 Sep 2026: queues with per priority working hour targets, the ticket
   list with both service level clocks and five scopes, the ticket screen with public replies and
   internal notes rendered as clearly different objects, saved replies with placeholders, status,
   owner, priority and queue editable in place, merging, linking, escalation to a task, the desk
   report on medians, and a support block on the dashboard. A new tenant is created with a queue.
   Attachments are the one piece still missing, listed above. Awaiting John's acceptance.
5. The five task features John asked for on 17 Sep 2026, all built: start and end with time driving
   planned hours; drag and drop across columns and within the list; projects as an expandable tree
   in the menu down to subtasks; a Gantt per project, now with Week, Month, Quarter and Fit zoom;
   and a progress percentage per project. Editing in place followed, because a plan that needs a
   full form per change does not get kept up to date.
6. M4 Time tracking built on 17 Sep 2026: timer on the task, running timer in the header, weekly
   timesheet, week locking with an audited unlock reason, time report by person, project and
   customer, CSV export. Awaiting John's acceptance.
7. Continuous integration on GitHub: types, lint, formatting, unit tests and build on every push.
   The suite is split so pure functions run in CI and database tests run locally.
8. Navigation reworked: collapsible groups for Tasks and planning, CRM, Security and Setup, a phone
   drawer sharing one implementation with the sidebar, and sign out reduced to an icon.
9. M3 Tasks and dashboard built: portfolios, projects, board and list views, steps, Microsoft 365
   document links, filters in the address bar, and the dashboard as the screen after login.
10. M2 CRM foundation built: customers, contacts with a country picker for mobiles, sites, the single
   timeline, the product catalogue and per tenant custom fields.
11. M1 Foundation accepted by John: tenancy, password sign on, revocable sessions, roles with per
   user overrides, audit log, tenant settings, user administration and tenant creation.
12. Product name COEX, repository digisol-ae/COEX, terminology Portfolio, Project, Task, Step, team
   size ten, port 3100, Node 22 LTS.

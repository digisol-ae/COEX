# FEEDBACK

Running backlog. Newest at the top. Each item is numbered, has a state and a short note.

## Decisions from John, 24 Sep 2026

- Accepted: the September support baseline (permissions screen, task and ticket timers,
  attachment previews and limits, ticket controls, phone ticket cards); the project screen
  rebuild, slide over task panel, My tasks, board and list; M4 Time tracking; M5 Support desk;
  and the 24 Sep QA fixes.
- Batch A was redeployed to coex.digisol.ae on 22 Sep 2026 and accepted by John in testing.
- Approved: commit, push to GitHub and deploy to coex.digisol.ae.
- Tasks and Tickets stay directly connected (escalation, work updates, completion notes). This is
  a deliberate exception to the module boundary rule, recorded in CLAUDE.md.
- Assignees: a task may only go to members of its private Space (and private Folder); a subtask
  may only go to the task's own assignees. Built 24 Sep, awaiting deploy.
- Mobile menu logo corrected to 148x50, the logo's own proportions. Built 24 Sep.
- Gantt export: low priority, handed to ChatGPT if picked up.
- Attachments are stored on the Contabo VPS (100 GB). Archive older attachments once usage
  reaches 50 GB.
- Backups: DigiSol owns them and the DigiSol team operates and restore-tests them.
- Figma design adoption: removed from the plan.
- M7: migrate only open osTicket tickets, and only if it proves straightforward; otherwise agents
  start fresh in COEX. No full history import.
- M8 cutover: the team starts using COEX in place of ClickUp and osTicket from 25 Sep 2026.
- Next after cutover: notify members and agents about tasks and tickets assigned to them.
- Entra single sign on is already registered by John; Claude to list what it needs.

## Open

0. Local phone QA: menu drawer, timer tray, sign out and ticket Status/Priority. Accepted by
   John on 24 Sep 2026.
   24 Sep QA fixes, retested and accepted by John on 24 Sep ("looks ok"): the phone menu drawer is now portalled to
   the page body, because the header's backdrop blur was confining it to the header strip; and
   escalating a ticket now records the ticket on the new task, so Task work updates and completion
   reach the ticket as internal notes. Older escalated tasks fall back to the ticket's own link.

0a. Before production email intake is enabled, decide the mailbox polling frequency and configure
    a separate app-server UID baseline. Historic unread mail must not become tickets by accident.

0d. Attachment archival: triggered by volume, not age. Archive older attachments once stored
    attachments reach 50 GB of the VPS's 100 GB. Not built yet.

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

0b. Production attachment storage: decided 24 Sep, the Contabo VPS (100 GB) at
   /srv/coex/shared/storage. Attachments are built
   and working on local disk behind a one-file adapter. Verify the production configuration before
   M7, when osTicket's existing attachments land there. PDF downsampling stays deferred: it needs
   Ghostscript on the server and we do not yet know whether customers send large PDFs at all.

0c. Four levels landed on 18 Sep 2026: Space, Folder, Task, Subtask, with folder level visibility.
   John is unsure whether `npm run migrate:spaces` has been run for databases written before this
   change. Verify migration history before marking this complete.

1. Batch C — Entra app registration. Password sign-on covers the gap. Revisit when Batch C is
   scheduled; it also unlocks Graph document titles.

## Done

0. September local support improvements built, awaiting John's acceptance: per-user permission
   management UI; task and ticket timers with a shared timer tray; ticket attachment previews and
   upload improvements; 3 MB per file / 10 MB total attachment cap; ticket Status, Priority and
   Agent controls; task work comments mirrored privately to their source ticket; and responsive
   mobile ticket cards. Inbound IMAP email intake is implemented but not scheduled for production.

0. Backups are already implemented by John's team. No COEX backup implementation work is required
   at present; verify operational ownership and recovery testing before the M7 import.

1. Timesheet entries are correctable in place on 18 Sep 2026, with the history of each entry on its
   own row: number, day, task, note and billable. Only an administrator may correct somebody
   else's, and the audit records whose it was. Fixed a real defect found while testing: every work
   date written as text went through toISOString, so Friday's work in Karachi or Dubai was reported
   as Thursday's in the CSV a client is invoiced from.
2. Ticket attachments on 18 Sep 2026: a one file storage adapter, images resized and re-encoded on
   upload with the original size kept beside the new one, everything else stored byte for byte, and
   downloads checked per ticket per person. September improvements add previews and the 3 MB per
   file / 10 MB per message limit. Completes M5.
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

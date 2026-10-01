# FEEDBACK

## John, 1 Oct 2026 — team Performance history (live at dd037e6)
5. Managers and above want to see everyone's My Desk Performance history. John chose: chosen
   people only (new permission `desk.read.all`, granted per person, in no role by default), and
   both views (team table by day with date range, and a person's full history). Built: Team
   history tab on My Desk; no score shown. Tests 216/216; browser checked. Not announced in
   What's new, by John's choice; documented here, in CLAUDE.md and in ai/.

## John feedback, 1 Oct 2026 (after deployment) — accepted and live at 126767a
1. Tooltips near a corner or edge went off screen. Built: every tooltip (title, data-tooltip,
   icon-only aria-label) is drawn by GlobalTooltip, measured and kept inside the window: above
   the control if it fits, else below, slid sideways near an edge. The CSS `::after` tooltip on
   `.has-tooltip` is gone. It sits in the top layer (popover), so it also shows over dialogs.
2. A Back button to the previous screen, across the whole program. Built: a back arrow in the
   header on every screen. It returns along the screens visited in this tab; a page opened
   directly (email link, bookmark) goes to the dashboard instead, so Back never leaves COEX.
   The trail is kept per tab, so Back still works after a refresh.
3. Change a task's status from the full task page. Built: the status at the top right is a
   picker of the Space's workflow for anyone with task.manage, using the same service as the
   board (refusals shown as a message). Read-only users still see the badge.
4. Personal showed every task, not only personal ones (John, 1 Oct 2026). Cause: `listTasks`
   spread the space visibility filter (`spaceId: {$in: visible}`) over the requested
   `spaceId`, replacing it. Every Space page and the Spaces tree had the same fault since
   `0352459`; no task leaked beyond what the person may see. Fixed by joining the conditions
   with `$and`; two database tests cover it. Live at 126767a.


## Feedback implemented — 1 Oct 2026
- Saved today's snapshot: button becomes Update today’s summary.
- John chose one task status with configurable statuses per Space, shared by board/list views.
  Status editor and safeguards implemented; "Incomplete" cannot be archived by name matching.
- Table headings sort both ways; weekly All Timesheets includes all seven daily totals.
- My Desk uses a meaningful desk icon, tooltip and checked selection, available wherever eligible
  tasks appear. My Available Tasks opens a preview popup with an Open task icon.
- QA green (208 full-suite tests, 79 final unit tests, 5 focused desk tests, build/types/lint/
  formatting and local browser behavior). User approved commit, GitHub push, app-server deploy
  and shutdown after verification. Release bd65e26 pushed with green GitHub CI. Deployment and shutdown are blocked by
  native SSH access; see ai/HANDOFF.md.

Running backlog. Newest at the top. Each item is numbered, has a state and a short note.

## My Desk — local follow-up, 1 Oct 2026

- Archival/carryover remains implemented locally, awaiting local regression acceptance.
- Automatic close now targets 23:59:59 office time; failed users are reported and retried
  after 30 seconds with the original office date retained across midnight.
- Local validation: lint clean, 69 unit tests, TypeScript and production build pass.
- No deployment performed.

## My Desk — 29 Sep 2026 (John feedback, pending implementation)

- When the user confirms **I am done**, completed tasks must disappear from My Desk and be
  included in that day's Performance History snapshot.
- If the user selects more tasks and confirms **I am done** again on the same day, those completed
  tasks must be accumulated into the same day's history rather than replacing the earlier record.
- At 23:59:59, the system must automatically close that office day and create/update the user's
  daily performance snapshot. Incomplete tasks remain on My Desk for the next day, while the
  previous day's history records their incomplete/overdue state.

## Decisions from John, 26 Sep 2026

- Entra preparation, 29 Sep: John has registered a URL in Entra. COEX's local integration is
  ready but is deliberately inactive until the exact production callback, Client ID, Directory
  (tenant) ID and client-secret value are configured on the VPS. SSO signs in existing active
  COEX users only; it never provisions accounts.

- Cutover happened on 25 Sep: the team works in COEX. Email intake (`coex-mail`, IMAP IDLE) and
  outbound email are live on coex.digisol.ae.
- Deployed and verified live on 26 Sep (`6fa0730`): unread marks on tickets and the Support icon,
  ticket list and ticket page refreshing every 30 seconds, one Outlook thread per ticket (the
  acknowledgement uses the reply subject), black phone menu drawer with red lettering, the phone
  timer tray, Status/Priority widths, and the 3 MB warning on ticket forms.
- Attachment limit stays 3 MB per file, 10 MB per message. (John's message said "limit should be
  MB" with the number missing; the documented 3 MB was kept. Confirm if another figure was meant.)
- Tasks and Tickets read each other's data directly, in both directions, by design (CLAUDE.md
  decision 13). No longer an open refactoring item.
- Server operating system updates (187 pending on 26 Sep, 123 security) are Nabeel's
  responsibility, not COEX development work.
- Interface, 26 Sep: a timesheet entry's history, edit and remove open as popups; all popups use
  frosted glass ("Apple vibe"); secondary action buttons became small icons with tooltips. See
  CLAUDE.md, Interface conventions.
- Visual, 27 Sep: menu headings bold and standing out; the current page highlighted; three
  themes, Dark, Light and Sunset (the original), chosen from the header and kept per person.
- Profile menu, 27 Sep: the avatar at the top right opens a menu with Edit profile, Arrange my
  menu and Sign out; the header shows only the workspace name, not the role. The new profile page
  edits name and job title and changes the person's own password (there was no way to before).
- Passwords, 27 Sep: changing a password now works only through a link sent to the registered
  email (from the profile, and "Forgot your password?" on the sign-in page), with rules following
  the NIST SP 800-63B standard: 12+ characters, common and personal passwords refused, a strength
  meter while typing. Still open: accounts marked "must change password" are not yet forced to.
- Email senders, 28 Sep: three sending addresses, Standard (helpdesk@digisolteam.com, all customer
  mail), Alert (staff alerts, including a new "new ticket" alert to administrators only, the whole
  desk, or nobody) and Admin (account mail). Resetting someone's password has a "notify them"
  box that emails them from Admin with a link to choose their own password. John still has to
  enter the Alert and Admin addresses in Setup, Email; until then everything sends as before.
- Templates, 28 Sep: a signature editor per queue (several lines, the replying agent's name and
  title, a live preview, "sign every customer email automatically"), the reply box shows the
  signature that will be added, and Preview buttons show the acknowledgement, saved replies and a
  signed reply exactly as the customer receives them. Plain text; HTML email is not built.
- Archive a Space, 28 Sep: Space settings, "Archive space…", shows how many folders and tasks go
  with it, then archives them all (subtasks included); Spaces, Archived spaces restores them.
  Nothing is deleted and logged time stays. Archiving is refused while a timer runs in the space.
- Timer window, 28 Sep: the running timer and today's timers moved into a small floating window
  of pastel glass that can be dragged, folds to a clock pill, and keeps its place across pages.
- Bug, 28 Sep: tickets could not be closed. Closing needed Resolved first and the list hid the
  refusal. Now any open ticket can be closed (recording its resolution if it had none), the list
  says why a change was refused, and impossible statuses are greyed out in both menus.
- ChatGPT will take over at a later stage: every session keeps CLAUDE.md, FEEDBACK.md and the
  `ai/` files current so the hand-over needs no chat history.

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
- Email (built 24 Sep, awaiting John's test and deploy): Setup, Email screen for the support
  mailbox, the sending account, customer acknowledgement and public reply emails, and staff alerts
  (ticket assigned, customer replied, task assigned). IMAP IDLE worker `coex-mail` for push intake.

## Open

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

1. Batch C (added by John, 26 Sep 2026). Built, tested and pushed on 26 Sep (up to 7c36801);
   reviewed by John on the local build and accepted ("all good"). Deployment to coex.digisol.ae
   is John's to run (CLAUDE.md decision 18). John's answers, 26 Sep:
   comments are one shared internal conversation between a ticket and its task, visible and
   answerable from both, never emailed to the customer; the dashboard gets one "My work" list of my
   open tickets and tasks sorted by what is due first, with a filter for tickets only, tasks only or
   both; agents adjust only their own hours and administrators anyone's, always with a required
   reason shown in the entry's history.
- Connect Tickes and Tasks in the manner that an agent can see by clicking on the link from tasks.
- Comment sections is required for ticket when assigned to an agent and Agent from tasks can also reply to the same comments. Comment should be able to mention target agent name by typing @(agent name should come automatically) and then agent will be notified by an email.
- there should be a mixed dashboard for an agent who have access to tickets and tasks module so he can see consolidated ticket and tasks.
- Accumulated hour can be adjusted by an agent with comments (why is he changing it)
- Every user can handle menu list position, for example i want to keep Tickets module on the top while another agent want CRM module on the top
   What exists already (checked 26 Sep): the ticket page links to its task, but the task page has
   no link back to its ticket; task comments are mirrored onto the ticket as internal notes, but
   ticket notes do not reach the task and there are no @mentions or mention emails; the dashboard
   has task tiles and a separate support block, not one consolidated list; time entries can be
   corrected and every correction is audited, but no reason is asked for.
   Menu order (added 26 Sep): today every person sees the groups in the one order defined in
   src/components/navigation/navigation.ts; only collapsed groups are remembered, per browser.
   A personal order should be saved on the user record, not the browser, so it follows the person
   to their phone, and it must only reorder the links the person may already see.
   Built, 26 Sep: (a) the task page and board panel link to the ticket; (b) one shared internal
   conversation with @mentions that email the person picked; (c) "My work" on the dashboard with
   the Both / Tickets only / Tasks only filter; (d) a required reason on every change or removal
   of logged time, shown in the entry's history; (e) "Arrange my menu" at the foot of the menu.
   Found and fixed while testing: correcting a time entry moved it back a day for anyone east of
   UTC (the edit form read the stored UTC date). Still open, older: time logged on a ticket shows
   "Unknown task" in the timesheet's edit form (harmless, the server keeps it on the ticket).

— Entra app registration. Password sign-on covers the gap. Revisit when Batch C is
   scheduled; it also unlocks Graph document titles.

## Done

0. 26 Sep 2026: post-cutover QA passed and deployed (`6fa0730`). Escalation → Task work update →
   Task completion posts two internal notes on the ticket and emails no customer. Phone menu,
   timer tray (start, tray, stop, "1m logged") and sign-out work; Status/Priority show on phone
   cards and the desktop table. Fixed during QA: phone timer tray ran off the left edge, "Normal"
   clipped on macOS, long subjects widened the tickets table, forms warned at 25MB instead of 3MB.

0. Email intake live since 25 Sep: IMAP IDLE worker `coex-mail` with a UID baseline, so historic
   mail never became tickets (supersedes the old open item on polling frequency).

0. Local phone QA of 24 Sep accepted by John: phone menu drawer portalled to the page body, and
   escalated tasks record their ticket so work updates and completion reach it.

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

# FEEDBACK

## Release completed and verified — 21 October 2026

- Application release: PR #24 merged as `ad6b8a6c5bd70df876e90709e2f33d96036ca851`; feature commits `c8b7422` and `0ed801d`. GitHub CI passed: https://github.com/digisol-ae/COEX/actions/runs/39652933754.
- Local validation: workspace types/lint, 37 unit files / 227 tests, formatting, diff checks and production Webpack build passed. Server native Turbopack production build passed, generating 64 pages. Scoped browser QA evidence remains in docs/qa/QA-2026-10-21-TASK-IMAGES.md. Full database suite was not rerun.
- Server `/srv/coex/app`: clean `main` at the application release SHA, verified after deployment. Exactly one each `coex-app`, `coex-mail`, `coex-desk-close`, `coex-channels` online, restarted once and PM2 saved. Public HTTPS login returns 200 and contains the new customer/agent entry; public Home icon SHA256 matches the server asset. No duplicate workers or unrelated server changes.
- Backup completed before pull: `/srv/coex/shared/backups/coex-2026-10-21-2228.archive.gz` and `files-2026-10-21-2228.tar.gz` (server timestamp). SSH uses existing `~/.ssh/contabo.pem` as digisol. App listens on port 3001; deployment ran `COEX_HEALTH_URL=http://127.0.0.1:3001/login bash deploy/release.sh`.
- `npm ci` reported 6 high findings across all dependencies; `npm audit --omit=dev` reported **0 production vulnerabilities**. No forced dependency updates made.
- Separate `projects/done-coex-integration` documentation remains untracked locally and was not uploaded. No real customer/test records migrated, no draft tutorial published. Existing QA findings and tiny-image 0 KB label remain documented.
- This outcome supersedes earlier pending/local-only/approval-blocked entries. A documentation-only follow-up records the release; pulling that follow-up does not require rebuilding unchanged application code.

## Release resumed — 21 October 2026

John explicitly confirmed full access and requested completion after reviewing the proposed mixed COEX bundle. Proceed with the proposed COEX application/docs/tests/assets, excluding separate projects/done-coex-integration files. This supersedes the earlier scope-approval pause. Preserve the existing remote handoff commit, verify GitHub CI, then deploy and verify the server.

## Release preparation — 21 October 2026

John requested Markdown updates, commit, GitHub upload and app-server pull. Full workspace typecheck/lint, 37 unit files / 227 tests, production Webpack build (64 pages), formatting and diff checks passed. Scoped task-image browser QA passed; older full-QA findings and small-image 0 KB display remain documented. No full DB suite rerun.

GitHub PR #24 is open. Remote feature branch contains one earlier handoff commit to preserve. Server preflight verified clean main at 9703f432fd8053c0fff6ac7dd138867b8fbaf9af, exactly one of each four COEX PM2 services online, and SSH works with ~/.ssh/contabo.pem as digisol.

Automatic approval review rejected the proposed broad mixed-worktree commit as insufficiently scoped (portal, CRM, project and docs changes beyond the reviewed agent candidate). No files staged, no commit/push/merge or deployment. Exact proposed COEX bundle and excluded separate dOne project files: ai/COMMIT-SCOPE-2026-10-21.md. Await explicit scope approval before the broad commit.

## Handoff consolidation —21 Oct2026

Latest decisions and pending QA boundaries consolidated in [compact context](ai/CONTEXT-2026-10-21.md). User requested a fresh start; preserve the decisions below. Tickets filter Anyone is now All agents; no role-filtering fix is implied.


## Setup tabs — 21 Oct 2026

John requested Setup to open a popup with Queues, Tutorials, Email and other Setup submenus as tabs. Implemented locally; [guide and QA](docs/SETUP-WORKSPACE.md). Security remains separate.

## Consistent compact application UI — 21 Oct 2026

John requested Support styling across COEX, smaller filters, a + menu beside timer for Task/Ticket/Lead, settings drawers, mobile optimisation and a collapsible sidebar. Implemented shared foundation and named settings flows; [UI standards and acceptance](docs/UI-STANDARDS.md). Preserve semantic labels/tooltips and existing coloured workload controls.


## Contractual and subscription services — 21 Oct 2026

John confirmed two service models: contractual IT services and annual percentage support for perpetual R4; subscriptions for R4 licensing, server hardware, dOne modules and Xverse. Subscription setup/training upfront, recurring monthly/quarterly/yearly. A customer may hold both models. Keep commitment dates separate from billing cycle. Implemented local CRM extension: [guide and validation](docs/CRM-SERVICE-MODELS.md). No real customer records changed.


## QA findings — 20 Oct 2026

QA-only: [complete evidence](docs/qa/QA-2026-10-20.md). Fixes pending: ticket customer/contact popup displays stale selections after a successful save; customer portal users appear in staff ticket assignee choices; team activity omits manual time on Asia/Karachi due to inconsistent date boundaries. Full regression 468 passed / 4 failed, including two stale test expectations. No feature fixes, push or deployment in this run.


## Customer page layout — 19 Oct 2026

John requested Opportunities, Contacts and Sites as customer-specific drawer features. Main timeline stays compact: first and last entry, Show more to see the complete history, Show less to collapse. Implemented locally.

## John — CRM/support/email feedback — 19 Oct 2026

- Customer page: edit existing contacts, not only add/remove.
- Existing tickets: link/change customer and contact, including newly created records.
- Faster page updates or push/manual refresh. Implement 15-second visible/non-typing refresh plus manual refresh control first.
- Contract email: choose configured From identity, add/remove To and CC recipients, offer team agents and relevant customer contacts. John confirmed Ali (`ali@digisol.ae`) as default CC. Sender identities are added/removed in Setup → Email; no arbitrary From spoofing.

## dOne support integration project — 18 Oct 2026

Dedicated planning and AI continuity: [dOne ↔ COEX project](projects/done-coex-integration/README.md). Separate web application; Bilal frontend, Uzair backend, beginner deployment teammate. Waiting for dOne local setup/access; documentation base only, no integration implemented or deployment authorised.

## Customer portal T6 — 18 Oct 2026 (Codex, local)

- John explicitly resumed T6 and confirmed **own tickets only**, not all company tickets. Built same-site `/portal`, customer password sign-in routing, own ticket search/filter/pagination, Raise ticket, public conversation/reply, safe image/file attachments and pre-send previews. Default queue and authenticated contact/company are server-selected. Internal notes/attachments, engineering and staff time are excluded.
- Administrative account provisioning is on Customer → Contacts (`user.manage`), using existing Contact.userId/User.organisationId. Fresh client accounts only; no staff account conversion, no automatic invite email. Suspension/contact archival revokes access. Staff pages/actions and both API surfaces reject client-contact sessions even with permission overrides.
- Verified: production build and workspace typecheck; portal DB suite **10/10** and tutorial DB regressions **3/3** in separate coex_test databases. Portal HTTP boundary unit tests **2/2**. Browser synthetic QA verified login, own list, create with image, attachment preview, customer reply and refresh persistence, foreign direct URL 404, staff dashboard redirect, public reply visibility and hidden internal note. No real customer account or ticket created. Final full unit run: **31 files / 195 tests passed**; focused ESLint, formatting and diff checks passed.
- Isolated UI QA at 127.0.0.1:3101 used `coex_test_pui_1018`, separate cookies and storage. Stopped after verification, temporary launcher removed; localhost:3100 remains running. No push/merge/deploy. Mailbox delivery and real-device/theme acceptance remain unverified.
- Implementation, setup and security notes: `docs/CUSTOMER-PORTAL.md`. T9 subtask-assignee changes and T10 XVERSE remain on hold. Leads API pilot remains paused.

## John — final UI/tutorial decisions, consolidated 18 Oct 2026 (Codex)

- COEX and Worktello refer to the same product; keep COEX for now, rename may happen later.
- Use transparent compact control areas, meaningful icon + name badges, minimal spacing; same function must have matching label, tooltip, icon and button style throughout COEX. Every module page clearly identifies its context.
- Tickets: sender email + raised time immediately below subject; customer line also carries SLA and ticket-history icon. History is a popup with who/when; system events stay out of messages. Owner name and priority name remain beside their icons; queue has icon + name. Timer/engineering/related actions share a row with separators.
- Paste images directly into create/reply forms, show thumbnails and full preview before sending; saved image thumbnails show filename and current size only, without original-size text.
- Tasks: make Assigned to explicit, allow manual Add time without running a timer, show each agent's time and a visually prominent Total time at the end. History opens records immediately without a second expand click. Existing permission boundaries remain.
- Brief tutorials float while users work; administrator controls preview/publish/stop/repeat. Upload or supported streaming/direct-video link. No voiceover for current 20-second Ticket tours. Current Create ticket video is an illustrated demo draft, not a screen recording and not published.
- Implemented locally; shared standards recorded in CLAUDE.md. Current status, checks, limitations and Claude's incoming PR #24 handover: ai/RELEASE-2026-10-18.md. Broad all-screen visual acceptance remains pending; no blanket production acceptance is claimed.

## Create ticket tutorial — 18 Oct 2026 (Codex, draft)

- Created docs/tutorials/create-ticket-20s.mp4: exactly 20 seconds, 1280x720 H.264, no audio, caption-only illustrated walkthrough with labelled demo data. Source: docs/tutorials/create-ticket/render.py.
- Verified against the current Raise ticket form: open Tickets, whose words/subject/body, queue/priority/customer/contact, optional Cc and attachments with image preview, review and Raise ticket. No ticket created.
- Uploaded through local Setup → Tutorials as the current draft, replacing the previous style-tour draft; previous video artifact remains in docs/tutorials. Expanded floating preview plays successfully (browser duration=20, playing=true). Not published to users; no push/deploy.

## Tutorial video links — 17 Oct 2026 (Codex, local)

- Setup → Tutorials now supports upload OR saving a video link as a draft. YouTube watch/share/shorts/live links and Vimeo links normalize to trusted embed origins with autoplay off; direct HTTPS MP4/WebM links use the native player. Other arbitrary streaming pages/iframe code are rejected with clear guidance. Vimeo unlisted hashes are preserved. No server downloads of external media.
- Link drafts share the existing publish/stop/per-user display flow. Embedded playback unloads when minimized/closed; Replay reloads the provider player. Existing uploaded draft preserved; no all-user publication.
- Local dev server restarted on 3100 to load model changes. Typecheck, lint and 25 unit tests passed; isolated linked-draft database verification added. Live provider playback remains dependent on the video's embedding/privacy settings.

## Floating tutorial system — 17 Oct 2026 (Codex, local)

- John requested a 20-second silent tour of the new Ticket style, first building the floating tutorial window. Built Setup → Tutorials (tenant.manage): MP4/WebM upload up to 30 MB, draft preview, publish to all users in the current tenant, stop, and republish as a new display round. Nothing published during development.
- Shared floating player on signed-in pages: drag, expand/restore, minimize, close, replay and native video controls. Starts only on Play; retains time when minimized. Positioned bottom-left above navigation, away from existing timer; constrained to viewport. Polls every 30 seconds; one automatic display per user per publication with server-side seen tracking; Watch again remains available while published.
- Video route requires sign-in, scopes to tenant, hides drafts except from administrators, supports seek byte ranges, and does not expose file keys. Upload stream bounded before parsing; file signatures checked; admin changes audited. No external video host required.
- Created docs/tutorials/ticket-style-preview-20s.mp4: silent captioned illustrative feature tour with demo content (not a screen recording). Four scenes: compact ticket controls, manual time, history with actor/date, paste/preview images. Uploaded as a draft through the local UI.
- Browser verified preview playback (~20s, 1280x720), expand, minimize and restore. Isolated coex_test_tutorials_1017 tests passed; further access/range checks recorded in final response. No push/deploy or all-user publication.

## Clear module identity — 17 Oct 2026 (Codex, local)

- Shared ModuleContext in the app layout identifies every current signed-in module/list and record page, including Task, Ticket, Customer, Product, Lead, Contract, Opportunity, Space, Time, Setup and Security screens. It remains visible without the sidebar on mobile and updates on navigation.
- Standing rule added to CLAUDE.md. No records changed or deployment.

## Uniform UI wording — 17 Oct 2026 (Codex, local)

- John requires matching labels, tooltips and buttons for matching functionality throughout COEX. Standing rule in CLAUDE.md; common action vocabulary centralized in components/ui/labels.ts.
- Normalized common task/ticket/time controls, Assigned to terminology, Time history, Close, Save/Saving and Add time/Adding, edit tooltip pattern across customer/contract/task/queue/saved reply controls. Timer accessible labels now agree with their tooltip. Shared Button/IconButton remain the visual controls. Distinct archive/delete and domain-specific CRM ownership are preserved.
- No records changed, push or deploy.

## Shared compact COEX standard — 17 Oct 2026 (Codex, local)

- John: apply the refined Ticket standard to Tasks and throughout COEX. Standing rules updated in CLAUDE.md. Shared DetailPopup supports one-click history/edit views, and FactBadge sizing is now compact across consumers.
- Task page: transparent facts, compact named assignees/priority/dates, edit form in popup, tighter spacing, controls moved below title, time history popup with every person's entries visible. Creation/assignment popup uses shared component. Task panel updates history opens in a popup.
- Ticket-linked system events are separated from task work updates; history shows actor names from tenant-scoped user IDs. Ordinary notes keep their existing edit/delete controls. No records changed.
- Customer/Contract/Opportunity detail facts use transparent panels and tighter spacing; Opportunity history opens directly in shared popup with actor names. Other list/board/setup workflows retain their current structure; the standard is recorded for applicable future work.
- Browser verified task edit popup and system-history names. No save, archive, push or deploy. Existing untracked docs/handover preserved. CRM detail visual acceptance and full responsive/theme review remain pending.

## Image previews and compact badges — 17 Oct 2026 (Codex, local)

- Follow-up: selected/pasted images have thumbnails and a full preview before sending. Owner and priority names restored with smaller badges. Existing image attachments show clickable thumbnails; unavailable local images have a fallback.
- Browser verified clipboard thumbnail/full preview and recent saved image loading. Older Tahoe images could not load locally; no stored files changed. Temporary test attachment removed without sending.

## Ticket detail refinement — 17 Oct 2026 (Codex, local only)

- John requested sender email and raised time below the subject, less header spacing, icon-only owner/priority controls, an escalation icon, queue icon plus name, and separated timer/engineering/related groups on one wrapping row. Implemented.
- System messages moved out of the conversation into a history icon popup; customer messages have a wider, consistent conversation surface.
- Reply attachment picker accepts pasted clipboard images from the reply form, using the existing file limits and submission path. Browser paste verified with a temporary image, then removed without sending. History popup verified with the 29 Sep and 3 Oct entries.
- No push or deploy. Existing untracked docs/handover preserved.

## John, 9 Oct 2026 — feedback batch Q1 to Q5 (built, answers confirmed, acceptance pending)

John paused CRM work on 9 Oct 2026 for feedback and improvements, then said to start. Built together
with the Leads branch (P2.2a) and shown in one What's new entry (2026-10-09).

Q1. Tasks, Spaces: archive or delete a Folder. BUILT. Folder settings (gear beside the active folder)
    has "Archive or remove this folder…" with two choices: archive the folder and keep its tasks in
    the space (the existing service rule), or archive the folder with its tasks and subtasks
    (`archivedWithFolder` on the task). Nothing is hard deleted, in line with "nothing deletes";
    logged time stays; a running timer on one of its tasks refuses the archive. Audited.
    Not built: a screen to restore an archived folder (data is kept, flagged for restore later).

Q2. Support, Tickets: eye icon removed from the list and the ticket page. The subject opens the
    quick preview on a plain click (`TicketSubjectLink`); a modified click still opens the ticket
    in a new tab. The preview's open icon is now a full screen (expand) icon to the whole ticket.

Q3. Support, Tickets: drag to reorder. BUILT as a personal order (assumption, John to confirm):
    stored on the user (`ticketOrder`), tickets named in it first, the rest in the usual latest
    activity order; a filtered view saves only what it shows and keeps earlier positions; "Reset my
    order" clears it. Column sorting pauses dragging. Desktop table only; phone cards have no drag.
    Pure rules in `tickets/ticket-order.ts`.

Q4. Time: the Time section of a task now lists "Time entries" person by person (date, minutes,
    note), with each person's total. People with `timesheet.read.all` see everyone; others see
    their own entries only, under the unchanged total (assumption, John to confirm).
    `listTaskTimeByPerson` in the time service.

Q5. Tasks, Spaces: "All work" showing every space's tasks. NOT REPRODUCED. A Space's All work tab
    shows only that space's tasks in the current code (checked in a browser with two spaces, and by
    the existing database test "returns only the tasks of the space asked for"). The same fault
    was fixed on 1 Oct (item 4 below; `$and` in listTasks, live at 126767a), so a server that has
    not pulled that or a later release would still show it. The All tasks page, by design, lists
    every space. Asked John to confirm after deploying whether it still happens and on which
    screen.

John's answers (9 Oct 2026), all matching what was built: the ticket order is personal; people
without `timesheet.read.all` see only their own time entries; archiving is enough for folder
"delete" for now. Q5 still waits on a retest after deploying.

Verified in a scratch copy: tsc, eslint with no warnings, project Prettier, 143 unit tests,
database tests for the folder archive and per-person time on FerretDB, and a Chromium walk-through
of Q1 to Q4. NOT run on real MongoDB.

## John, 9 Oct 2026 — Team activity page and billable default (built, acceptance pending)

1. Team activity (`/time/activity`, under Time, permission `timesheet.read.all`): one row per person
   and task or ticket, with the item's current stage or status, time in the chosen days, a
   "working now" mark and last worked. Filters: from/to date (default today), stage or status,
   person. Built from recorded time only, so people who never start a timer or log time do not show
   (stated on the page). `time/services/activity.service.ts`.
   Follow-up the same day: people are picked with the same multi-person picker as Tasks and Spaces;
   Tasks and Tickets checkboxes (one or both); a Today button beside the dates; task and ticket
   titles open the same preview popups as Tasks and Support; Share sends the filtered page as a
   PDF by email (outbox kind `activity_report`, Alert sender, PDF stored then attached) or
   downloads it (`/time/activity/pdf`). PDF built with `pdf-lib` (new dependency, pure JS;
   Latin letters only in the PDF, other scripts print as "?"). Filters live in the address
   (`time/activity-filter.ts`).
   Totals on screen (John, 9 Oct 2026): the page showed no total while the PDF did. A Total chip
   and one chip per person, for the rows and filters on screen, now sit above the table.
2. Billable is unchecked by default for every new timer and manual entry, tasks and tickets
   (model default, service default, timesheet form). Existing entries keep their value; no
   migration. Edit forms still show each entry's stored value.

## John, 9 Oct 2026 — All tasks screen (built, acceptance pending)

1. Spaces filter: pick one, several or all (empty means all). Space chosen in the address as
   repeated `space=` values.
2. Assignees filter: one, several or all, for people who can see every task; choosing people
   replaces the "Mine" chip. Repeated `assignee=` values. Everyone else stays on their own tasks.
3. Add task now opens a popup (`new-task-popup.tsx`): Personal or any Space, folder, assignees,
   priority, start, due, description. Personal tasks are for the signed-in person. A failed save
   keeps what was typed. Personal page keeps its own quick panel. Personal space is not in the
   Spaces filter (it is created on first use).

## John, 10 Oct 2026 — time on a shared task (built, acceptance pending)

When several assignees ran timers on one task, task screens showed everyone's hours added together.
Now every task and ticket screen shows the viewer's own time only: the All tasks and Spaces lists
(column "My time"), the task page ("Your time"), task panel and preview, ticket page and preview.
`loggedMinutesForTask/Ticket` and `listTasks` take the signed-in person's entries; timesheets
already held only their owner's entries and are unchanged. People with `timesheet.read.all` still
see each person's hours separately in Time entries on the task page. No grand total of everyone is
shown on a task any more (assumption: John's wording said accumulated hours must not appear). The
"over estimate" badge now compares the viewer's own time. The Time report and All timesheets still
total everyone, by person.

## John, 10 Oct 2026 — daily performance email (built, acceptance pending)

At 9:00 Gulf time every morning the email worker (`coex-mail`) reports on the previous day. Everyone
active on the staff gets their own note, managers and administrators included: thanks when they
logged at least the target hours, a polite reminder and encouragement to log honestly when below it
or at zero. A day off (Saturday, Sunday, outside the tenant working days) is skipped, except that
anyone who did log time that day still gets their thanks (John's answer, 10 Oct); nobody is reminded
about a day off. The combined summary goes ONLY to the addresses entered in Setup, Email, "Daily
performance email" (one or more, default empty, so enter ali@digisol.ae and umbreen@digisol.ae
there); the same screen has the on/off switch and the target hours (default 6). OFF until switched
on. Each day is claimed once (`dailyReport.lastSentFor`), so restarts never repeat it. Wording is in
`time/daily-report.ts`; sent from the Alert sender, outbox kind `daily_report`. Turning it on after
9:00 reports on the previous day straight away. There is no leave calendar: someone on leave gets
the gentle reminder.

Also (John, 10 Oct): managers and others with `timesheet.read.all` now see "All people" on the
task page's Time entries, the total of everyone's time on that task, beside each person's own.

## 3 October 2026 — To do task color

To do tasks must be yellow; In progress remains blue. Applied to dots, pills and task status selector across themes.

## 3 October 2026 — In-progress task color

In-progress tasks must show blue. Shared task dots now match the existing blue status pills.

## John, 3 Oct 2026 — ticket analytics counts (local, acceptance pending)

- Replace scope filters with colored Opened/Delayed/Missed counts, clickable to show tickets.
  Implementation defines Opened as active, Delayed as SLA due within an hour excluding breached,
  and Missed as breached reply/resolution SLA. Agent permissions and other filters retained.
- Counts are not truncated at 200. Added to today's release; visual acceptance pending.

## John, 3 Oct 2026 — Tasks badge and creator (built locally)

- The Tasks badge needs a clear destination. It counts visible open tasks assigned to the
  signed-in person; tooltip explains it and the Tasks icon opens that exact list.
- John clarified: creator is fixed; reassignment is allowed. Creator model field made
  immutable and the editable Owner label changed to Assignees to distinguish them.
- Added to today's cumulative release. Types/lint/formatting and 107 unit tests passed;
  new DB regressions and browser acceptance pending. No push/deploy.

## John, 3 Oct 2026 — cumulative release notes

- Keep all changes since the last live pull together under today's date (3 October 2026).
  Consolidated What's new; full inventory in ai/RELEASE-2026-10-03.md. Baseline is last
  documented live SHA dd037e6; actual current VPS revision remains unverified.

## John, 3 Oct 2026 — compact ticket preview (built locally)

- Preview occupied too much space. Use compact icon-and-value chips with tooltips and
  accessible labels, hide empty customer/contact fields, reduce spacing, and shorten the
  brief/latest-message display. Open full ticket retains the complete information.
- Types, lint and formatting passed; local visual acceptance pending. No push/deploy.

## John, 3 Oct 2026 — ticket preview, timer clock and sender (built locally)

- Every ticket offers an eye-icon preview with quick information, without changing screens;
  the preview can open the full ticket. Available on desktop rows, phone cards and ticket detail.
- Running ticket timer shows HH:MM:SS beside Stop timer.
- Reply to customer may use a configured sending address; current Standard remains default.
  Alternatives use existing Alert/Admin configuration. Internal notes stay private.
- TypeScript/lint/formatting and 107 unit tests passed; browser/DB/live-send QA pending.
  No push or deployment.

## John, 3 Oct 2026 — customer creation and CC collaborators (local, acceptance pending)

- Create customer in the ticket dropdown requires Customer name and email, selects the saved
  customer and keeps the draft. Remaining details may be edited later in Customers.
- Ticket agents (`ticket.manage`) may use this limited customer creation without general
  customer management access. General CRM editing retains its existing permission.
- Agents may add multiple CC collaborators from current-tenant team, customer or branch
  contacts, or by email. Existing ticket changes use Save CC collaborators before replying.
- Public reply emails include saved CC collaborators; internal notes remain private.
- Types, lint and 101 unit tests passed; database/browser QA pending. No push/deploy.

## John, 3 Oct 2026 — ticket attachments (built locally, acceptance pending)

- Adding files individually must keep earlier selections. Ticket replies/internal notes and new
  tickets now have a click/drop area with selected-file icons, names, sizes and removal.
- Types/lint/formatting passed. Interactive browser QA is blocked by browser URL policy.
  Pending: local acceptance and sending on a disposable ticket. No push or deployment.

## John, 1 Oct 2026 — who created and assigned a task (live after deploy)
6. "I don't know who created and assigned the task to me." The creator was stored but never shown;
   the assigner was never recorded, not even in the audit log. Built: tasks record who assigned
   each person and when; the task page, preview and side panel show "Created by" and "Assigned to
   you by"; assignee changes are audited. Earlier assignments cannot be recovered and show only
   the creator. John gave Claude authority to finish and merge; John runs the server deploy.

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

### John, 18 Oct 2026 — compact everywhere (ticket and task screens built; rest of the app to follow)

- Ticket: one card; Status, Owner, Priority, Queue as badges that are also the controls; clocks, timer, Add
  time, time logged, Escalate and Related as badges and buttons in the second row; escalate, link and
  merge as popups; Cc inside the reply box.
- Task page: origin as one line with history, Time as badges, details in columns, small description.
- Convention recorded in CLAUDE.md. Also applied (18 Oct): customer page (badges row, details form in a popup),
  contract page (terms and support hours as badges), opportunity page (deal as badges, history folded).
  Shared `FactBadge`, `FactRow`, `FactGlyph` in components/ui/fact-badge.tsx. Still to apply: the Leads
  list and panel, Spaces, and the settings screens.

### John, 18 Oct 2026 — ticket page layout (built on the branch, acceptance pending)

- Ticket properties (Status, Owner, Priority, Queue), Engineering and Related tickets moved to a row
  across the top so the conversation and the reply box get the full width. The timer and time entries
  sit beside the CC collaborators panel.
- A conversation of more than three messages shows the first and the latest with a fold button for the
  messages between. Long unbroken text (addresses, mailto links) now wraps inside the message box.

### John, 18 Oct 2026 — task side panel (built on the branch, acceptance pending)

- Compact origin: one line ("Created by X, date · N assignments") with a history icon opening the full
  list in a popup. Self-assignments are no longer listed (display only; stored data unchanged).
- Assignees, dates, priority, folder and time in one wrapping row of icons (names in tooltips); tags below.
- Description starts at two lines and grows on hover or focus.
- Updates section in the panel: add an update at once, latest shown, history opens with an icon.

### John, 17 Oct 2026 — time entries layout (built on the branch, acceptance pending)

- The Time entries list on a task looked ugly with every entry shown. Now one consolidated line per
  person (name, number of entries, total) with a history icon that expands that person's entries and
  closes them again. Same on the ticket page. Shared component `TimeEntriesByPerson`.

### Team feedback, 17 Oct 2026 (John, from his team) — built on the branch, acceptance pending

U1. Task work updates can be edited and deleted. Built: the author edits their own update (it then
    shows "edited"; the old text is kept in the audit record; mentions are not emailed again). The
    author or an administrator deletes a task's own update (hidden, kept in the database and the audit
    record, with a confirm step). On a task raised from a ticket the update is the ticket's internal
    note: it can be edited but never deleted, because a ticket's record is not erased. ? John to
    confirm; deleting ticket notes would be a separate decision. Public replies are never editable.
U2. A task created in Personal can be moved to a Space and a Folder, always into the Space's first
    column. Built: a move icon on each Personal row; assignees must be allowed in a private Space or
    Folder (same rule as creating there); logged time follows the task; audited. Only the owner moves
    their Personal tasks; tasks already in a Space move by drag and drop as before.
U3. Add time by hand on a ticket, for an agent who forgot the timer. Built: an "Add time" button beside
    Start timer on the ticket (day, time as 1.5, 1:30 or 90m, note, billable); the same rules as the
    timesheet (a locked week refuses it); it shows in the ticket's time entries and on the timesheet.

### Team feedback, 15 Oct 2026 (John, from his team) — T1 to T5, T7, T8, T11, T12 built 15 Oct 2026 on the branch (acceptance pending, not deployed); T6, T9, T10 on hold by John

Written in English from John's list. "Understanding" is mine; anything marked ? needs John's answer
before building. Nothing here is deployed. John wants all of it built, then reviewed on his own
system before production.

T1. Tickets list: a filter to view the tickets assigned to a specific person (a person picker, like
    the Tasks screen's assignee filter). Understanding: kept in the address bar, agents with
    `ticket.read.all` can pick anyone; an agent without it only ever sees their own.
T2. Marking a ticket Resolved must stop that person's running timer on it. Today the timer keeps
    running and is stopped by hand. Understanding: stop the timer when the status becomes Resolved
    (and Closed), whoever's timer it is on that ticket; logged time is kept.
T3. Start and due times shift by one hour: a start of 9:00 is saved as 10:00 and a due time of 10:00
    as 11:00. Understanding: a timezone or daylight saving mistake between the browser's local time,
    UTC and the office timezone (Asia/Dubai); reproduce first, then fix once, in one place. See also
    CLAUDE.md "calendar date keys must not come from slicing UTC timestamps".
T4. (Built: opt-in, in-browser, customer reply and task assigned; see ai/CURRENT_TASK.md.) Browser notifications (new, scope needed). ? Which events: new ticket, assigned to me, customer
    replied, task assigned, @mention (the staff alert kinds already in Setup, Email)? Understanding:
    web push with a service worker, opt in per person and per browser, same switches as email alerts.
T5. Estimated time versus Planned hours. Understanding: remove the Planned hours field, which is
    calculated from the number of days between start and end, and make Estimated time the one
    primary field. This reverses "start and end with time driving planned hours" (17 Sep 2026) and
    touches the board, the table, Gantt, the dashboard and reports. ? Should planned hours that
    already exist be copied into Estimated time where that is empty?
T6. A ticket portal landing page for customers (new, scope needed). ? What it contains: raise a
    ticket, see my tickets and replies, sign in with the contact's password (decision 2)? Own
    address or part of coex.digisol.ae?
T7. Spaces: a task moved to Done disappears from the board; it should stay visible in the Done column
    (all completed tasks remain in the Done status), not only on a Done tab. Understanding: boards
    show every status column including the closed one; "Include done" keeps its meaning on the All
    tasks list.
T8. Tasks: a filter for tasks I created ("Created by me"), so a person can review them and send
    reminders when nobody answered. Understanding: `createdById` is already stored; a reminder is a
    nudge to the assignees. ? Is a Remind button wanted now (an email or notification to the
    assignees), or only the filter first? Distinct from "Assigned by me" (built 13 Oct).
T9. Subtask assignees: a task with two assignees offers only those two when adding a subtask, but the
    team wants everyone, so a part of the work can go to someone else. This reverses part of
    decision 14 (a subtask goes only to the task's own assignees). ? John to decide: any person who
    can see the task's Space and Folder (respecting private Spaces and Folders), which keeps the
    privacy rule and drops the narrowing. Proposed: yes.
T10. XVERSE: one click on a WhatsApp message to create a task in COEX. ? This sits on Channels (M6),
    suspended 4 Oct 2026 until the XVERSE team is free, and needs the Support and CRM numbers' inbound
    messages. Understanding: possible once M6.3 onward resumes (a "Create task" action on a message);
    not buildable before then. John to say whether Channels resumes.
T11. Timesheet: a ticket or task does not appear until someone starts a timer on it. Understanding: the
    weekly timesheet lists only items with entries; people want to pick any assigned task or ticket
    and add time without starting a timer ("add row"), and assigned open work shown with zero hours.
T12. (Task page already listed each person's entries since 9 Oct; ticket pages now do too.) Time entries on a task show the total of all users' time. Understanding: each person's entries
    should be listed separately, with their name, date, minutes and reason; the task shows the
    signed-in person's own total (10 Oct 2026 decision) and, for those who may, a per person
    breakdown.

0f. John, 13 Oct 2026: the Dark theme does not look good. His example is the "Assign agent" popup on
    the Tickets list in Dark (dropdown with a red outline, a bright white Save button that looks
    disabled, text and controls blending into the dark glass). First pass built 13 Oct 2026 (acceptance pending): Assign agent Save was ink on ink (white on
    white), initials on person colours, white hover and border in What's new and Raise ticket, and a
    darker backdrop; see ai/CURRENT_TASK.md. Needs a pass over every
    popup and form control in Dark, using colour tokens only (no literal colours, per CLAUDE.md), and
    John's look at which screens bother him most. Open point for John: send the other screens that look
    wrong in Dark, or let Claude review all of them against the Light theme.

0e. John, 13 Oct 2026: add an "Assigned by me" filter on the All tasks screen
    (https://coex.digisol.ae/tasks), listing the tasks the signed in person assigned to others.
    Built 13 Oct 2026 on the proposals below (acceptance pending). Starting point: each task's `assignments` records `assignedById`
    (task origin, 1 Oct 2026), so the filter can use it; assignments made before 1 Oct 2026 were
    never recorded and will not appear. Open points for John: whether tasks the person created
    but assigned only to themselves count (proposed: no), and whether it stays in the address like
    the other filters (proposed: yes, `?assignedByMe=1`).

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

## Ticket conversation as a chat — trial (John, 18 Oct 2026)
- "All the conversation in ticket should be something like WhatsApp style." Built as a trial for John
  to judge before it goes further: customer messages left, staff replies right (green), internal
  notes right but dashed and warm with an "Internal note" tag, day labels in office time, time on
  each bubble, long messages cut with "Read more". Not yet in What's new until John accepts it.

- 18 Oct 2026: John requested CAPTCHA on the customer portal. Turnstile integration prepared for login/create/reply; activation awaits Cloudflare account and widget keys.

- 18 Oct 2026: Prominent Create Support Ticket heading on signed-out entry; opt-in Remember me on this PC for at least 60 days, avoiding repeated login on trusted PCs.

- 18 Oct 2026: Login entry uses prominent Customer / Agent toggle above the heading, default Customer with Create / View Your Support Ticket. Actual account role continues to control access.

- 18 Oct 2026: Customer portal conversation should use the same WhatsApp bubble standard as agents, with refined spacing, own messages right, support left, dates/times and attachment previews.

- 18 Oct 2026: Clarified chat colour standard: agent/support replies green, customer messages light yellow, both with restrained neon accents adjusted for Dark, Light and Sunset. Applies on customer and agent conversation views.

- 18 Oct 2026: Customer header follows agent account-menu standard: profile, reset password, browser notifications and future tutorials in one place. Customer tutorials later; prepare base only, no publication/display now.

- 18 Oct 2026: Browser notification should remain until customer dismisses it. Request persistent interaction from browser; OS/browser notification behaviour remains subject to system settings.

- 19 Oct 2026: Customer kind badge (e.g. Partner) belongs beside the customer heading; Customer details drawer trigger sits at the far-right header edge. Implemented and browser checked.

## Transparent ticket bubbles — 21 October 2026

Ticket communication bubbles now have transparent backgrounds in staff and customer portal views. Existing green/yellow neon borders, glow and sender colours are preserved; internal notes keep their dashed warm border and label with transparent fill. Continues the conversation-style trial, so no What’s new entry. Local only; focused ESLint and diff checks passed, browser/theme acceptance pending.

## Bubble design refinement — 21 October 2026

Supersedes the yellow customer/dashed note styling above: transparent rounded chat bubbles with small bottom tails; customer purple neon, agent green neon, internal notes orange dotted. Shared public styles cover staff and portal. Focused ESLint and diff checks passed; current staff ticket visually verified in Dark with all three types. Other themes and portal not separately browser rechecked. Local only; conversation trial remains outside What’s new.

Bubble-tail correction (21 Oct): replaced separate pseudo-element curves with a continuous SVG nine-slice outline, creating a small curved dialogue tail integrated into the bottom corner. Transparent fill and purple/green/orange colour roles preserved. Focused diff check passed; Light staff view visually checked.

Bubble glow refinement (21 Oct): softened outline to 1px at 55% opacity; green/purple neon shadows expand by 2px in blur and spread outside the transparent bubble. Orange dotted outline also softened. Diff check passed; local only.

Bubble outlines removed (21 Oct, user accepted glow): removed purple/green/orange border artwork and tails. Transparent rounded bubbles retain soft external neon glow in their role colour, including orange internal notes. Sender colours and internal-note label preserved. Diff check passed; local only.

Internal-note colour (21 Oct): changed internal-note glow, sender and label from orange to red; transparent fill and borderless styling preserved. Diff check passed. Local only.

## Conversation ordering and composer — 21 October 2026

Added Message order: Ascending (oldest first, default) / Descending (newest first), stored in the ticket URL as messageOrder. Messages and office-day separators follow the selected chronological order, with existing middle-message folding retained. Moved the complete staff ReplyBox above the conversation, retaining attachments, saved replies, CC, sender, signature and internal-note mode. Browser verified composer precedes conversation and descending reverses endpoints; focused ESLint, web typecheck and diff checks passed. Local only; no messages sent.

## Main task conversation styling — 21 October 2026

Applied ticket-style transparent rounded red-glow internal-note bubbles, explicit Internal note badges, long-text Read more, middle-message folding and ascending/descending ordering to the full task page. Complete existing update composer now precedes the conversation; mentions/edit/delete permissions retained. Task toolbar uses compact filter styling and task tags render individually as #tag badges. Task comments remain private internal notes; no customer reply mode added. Browser verified composer position, internal tags and order reversal on DGS-T-6; ESLint, web typecheck and diff checks passed. No comment submitted; local only.

## Subtask assignment email — 21 October 2026

Subtask assignee changes now queue the existing task_assigned staff alert, including subtask title, parent task and link. Respects email settings and existing self-assignment suppression. Unchanged selection and unassignment do not queue alerts; existing assignment access rules retained. Notification failure does not undo the saved assignment, matching main task behaviour. Regression test passed (1 passed, 47 skipped) against isolated coex_test_tasks after network-enabled retry; lint, web typecheck and diff checks passed. Test spies on the mail queue entry point; no real email delivery claimed. Added What’s new entry. Local only, no push/deploy.

## My subtask done — 21 October 2026

User-approved personal completion uses exact label My subtask done, with Resume my work. Persisted per-assignee IDs; only the current assigned user may mark their own work, with private Space/Folder checks and an atomic guard rejecting unfinished own subtasks. Does not close shared task/remove assignee. Mine defaults Active; filter supports My subtask done/All my work and preserves existing filters. Personal active task lists/My work, Tasks badge, My Desk and available desk tasks exclude completed personal work; team/Space views remain unchanged. Assignee completion badge on full task page. Newly assigned or reopened own subtasks reset personal completion; removing parent assignees drops stale markers. Existing desk selection stays stored so resume can restore its visibility. No real records migrated.

Verification: focused DB regressions 2 passed/47 skipped in isolated coex_test_tasks (assignment-alert regression plus personal completion, independent users, invalid actor, unfinished guard, resume and reactivation). Web typecheck, focused ESLint and diff checks passed. Browser read-only verified button on assigned task and three Mine filter choices; no live completion clicked. What’s new updated. Local only; no push/deploy.

## Subtask missing-field crash and error handling — 21 October 2026

Fixed user-reported Cannot read properties of undefined (reading filter): personal completion arrays now safely default empty in subtask reopen/assignment. Next development model cache is upgraded and recompiled for the newly added path, so hot reload cannot retain the old schema. Subtask completion/assignment/add actions now return friendly expected errors, log unexpected details only server-side and display generic retry messages. Board/list optimistic updates handle returned failures; full-page subtask forms show inline Notice and assignment errors are no longer ignored. Personal-completion errors use the same safe mapping.

Verified: database regressions 3 passed/47 skipped (legacy undefined field, personal completion, assignment alerts); action error unit tests 2/2 passed (raw TypeError masked and expected validation preserved). Web typecheck, focused ESLint and diff checks passed. No real subtask changed during verification. Local only.

Home navigation icon (21 Oct): replaced the rail Home glyph with user-supplied transparent house asset at public/brand/home-icon.png, rendered as a currentColor mask at 18px. Shared desktop/mobile RailLinks retains active/theme colours and Home label/destination. Focused ESLint and diff checks passed; local only.

Tasks navigation icon (21 Oct): replaced Tasks rail glyph with user-supplied transparent tasks-icon.png, using the shared 18px currentColor mask for desktop/mobile. Label, destination, counts and active colours preserved. Focused ESLint and diff checks passed. Local only.

Folder/Spaces navigation icon (21 Oct): replaced the folder glyph in the Spaces rail entry with the supplied transparent spaces-icon.png. Shared 18px currentColor mask applies on desktop/mobile; Spaces label and route preserved. Focused ESLint and diff checks passed. Local only.

Time navigation icon (21 Oct): replaced Time rail clock with the user-supplied transparent time-icon.png, rendered through the shared theme-aware 18px mask on desktop/mobile. Label and route retained. Focused ESLint and diff checks passed. Local only.

CRM navigation icon (21 Oct): replaced CRM rail glyph with the supplied transparent customers-icon.png. Shared 18px currentColor mask covers desktop/mobile and preserves CRM label, route, active colours and renewal badge. Focused ESLint and diff checks passed. Local only.

Support navigation icon (21 Oct): replaced Support rail glyph with supplied support-icon.png using shared 18px theme-aware mask on desktop/mobile. Support route, label and unread count retained. Focused ESLint and diff checks passed; local only.

Setup navigation icon (21 Oct): replaced Setup gear with supplied settings-icon.png using shared 18px currentColor mask. Desktop/mobile retain Setup popup routing, permissions and active colours. Removed unused legacy SVG fallback after all non-desk rail icons moved to supplied assets. Focused ESLint and diff checks passed. Local only.

Second navigation selection (21 Oct): shared navigation-active now uses a soft rainbow neon gradient blended with the theme surface and 1px coloured shadows. Applies to selected secondary sidebar links, Spaces, folders and task-tree items on desktop/mobile; current label contrast and red marker preserved. Diff check passed. Local only.

Navigation selection hierarchy (21 Oct): active main section headings (e.g. Timesheet), plus standalone Dashboard/My desk/Setup, use the rainbow background. Active submenu/tree entries use transparent fill, continuous 1px rainbow border and 1px colour shadow; old red marker removed. Active group detection retains current route matching. Focused ESLint/diff checks passed; local only.

Navigation submenu shadow (21 Oct): increased selected submenu rainbow shadow from 1px to 2px; transparent fill and 1px rainbow border retained. Diff check passed. Local only.

Task half drawer (21 Oct): removed Documents section and document add/remove controls from the quick panel only; full task document management retained. Updates now render inline newest-first, initially 3 threads, Show more reveals 5 more at a time and Show less collapses. Full text/Read more, author/time, edited flag and Internal note/Activity tagging included; composer stays above. Focused ESLint, web typecheck and diff checks passed; local only.

## Images in task updates — 21 October 2026

Main task page and half drawer reuse the ticket attachment picker for image paste/drop/upload with pre-send thumbnails; saved update images use existing preview/download UI. Image-only posts supported. PNG/JPEG/WebP, 3MB/file and 10MB/update enforced before buffering and in service, decoded/processed using ticket image pipeline. Native task comments store private attachment metadata; ticket-linked updates store attachments directly on shared internal TicketMessage, without customer email. New authenticated task-image route enforces staff role, task permissions, assignee/read-all and Space/Folder/tenant visibility; only internal ticket-note attachments are reachable through task links. Deleted task updates no longer serve images. Failed storage/comment creation cleans uploaded files. Unexpected posting errors use friendly retry copy.

Verification: isolated coex_test_tasks regressions 3 passed/48 skipped (image persistence/download, invalid images/SVG rejection, wrong-task/cross-tenant denial, ticket-note privacy, prior personal-completion regressions). Unit tests 5/5 across image-route access/headers and subtask error regressions. Web typecheck and focused ESLint passed. Browser read-only verified image composer on task page; actual clipboard and saved-thumbnail browser end-to-end acceptance remains pending. No real update posted. What’s new updated; local only.

## Agent release summary and upload review — 21 October 2026

User requested 17-to-today agent-related information only. Consolidated 17–21 Oct What’s new into one current agent summary covering tasks/subtasks, update images, support, time and navigation. Removed duplicate date-range entries and admin/contract/portal administration copy; older pre-17-Oct release history retained. Upload candidate, dependencies, mixed-worktree boundaries and remaining verification recorded in ai/RELEASE-2026-10-21.md. Release-note lint/diff checks passed. Review only; no staging/commit/push/deploy.

## Top task documents/attachments drawer — 21 October 2026

Moved main task Documents section into a compact Documents & attachments button in the top action bar, with a combined count. Drawer lists all current update attachments as a thumbnail grid (deduplicated by attachment ID, with author labels) and existing document links/add/remove controls. Uses protected task attachment URLs, keeps comment thumbnails in context, includes shared internal-note attachments on ticket-linked tasks, excludes deleted updates through existing comment service. Reuses native SettingsDrawer for Escape/focus and responsive width. Half drawer Documents remains removed. Focused ESLint, web typecheck and diff checks passed; browser acceptance pending. Local only.

Drawer visibility refinement (21 Oct): moved Documents & attachments trigger from the action strip to the full task title header; made it a prominent labelled button with count. Added the same drawer at the top of the task half panel. Update composer upload controls now explicitly say Upload attachment or paste an image on both surfaces (PNG/JPEG/WebP image support retained). Browser opened the current task drawer and verified heading, empty state and document-link form; composer label also verified. Focused ESLint, web typecheck and diff checks passed. No data posted.

## Task image browser QA — 21 October 2026

Scoped end-to-end browser QA completed on isolated 127.0.0.1:3102 and coex_test_tasks with clearly labelled synthetic task/user. Main-page clipboard paste, image-only post, reload persistence, half-drawer file upload/text+image post/newest-first display, central gallery, preview and verified 320×180 download passed. Ordinary agent role also pasted/posted successfully; final gallery count 3. Minor display finding: tiny/compressed images round to 0 KB; no code fix during QA. Atlas collection limit affected isolated login/dashboard setup, resolved enough for task flow by dropping eight verified-empty collections only in disposable test DB. Report: docs/qa/QA-2026-10-21-TASK-IMAGES.md. Temporary server stopped and scripts removed; no main-site data changed, push/deploy or external email. Prior image clipboard/browser acceptance pending notes are superseded only for these tested task paths.

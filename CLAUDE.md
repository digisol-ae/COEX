# COEX

Standing context for every Claude session on this project. Read this first, then FEEDBACK.md.

## What this is

COEX, short for Co-existence, is DigiSol's own multi tenant business platform. It replaces ClickUp and osTicket,
adds a CRM foundation, and is built so that Contracts, full CRM and Payroll attach to it later.
Zoho Books stays as the accounting system and is integrated with, never replaced.

Confirmed product name. The repository is COEX.

## Owner and team

- John (Syed Muhammad Jan Ali), CEO of DigiSol, is the product owner and the only reviewer for now.
- Claude is the core developer through Phase 1.
- A designer, a frontend developer and a backend developer join later. Readability and documentation
  are acceptance criteria on every milestone, not afterthoughts.

## Where we are

M1 Foundation is accepted. M2 CRM foundation, M3 Tasks and dashboard, M4 Time tracking and M5
Support are built and accepted by John (24 Sep 2026). The team cuts over from ClickUp and
osTicket to COEX on 25 Sep 2026 (M8), and did. Batch C (decision 18) was built on 26 Sep 2026
and accepted; themes, the profile menu, email password links, three senders, signatures, space
archiving, the floating timer and What's new followed on 27 and 28 Sep. Handed to ChatGPT on
28 Sep 2026 and shared since: see ai/HANDOFF.md (START HERE). Next: M8 hardening, then Phase 2 planning (John, 4 Oct 2026).
Channels (M6) is suspended until further notice.

What's new: every user-visible change gets an entry at the top of
src/modules/core/release-notes.ts, in plain words for users. That makes the What's new drawer open
once more for everyone until they tick "I understand". Exception: John can keep a change out of What's
new (Team history, 1 Oct 2026); it is then documented in CLAUDE.md, FEEDBACK.md and ai/ only.

Conventions worth knowing before changing CRM code:

- Mobile numbers are stored in E.164 and entered with a country picker, because XVERSE matches
  inbound WhatsApp by number.
- Money is stored as integer minor units with an explicit currency.
- Nothing deletes: customers and contacts archive, products retire, custom fields hide.
- Custom field keys are generated from the label once and then frozen; renaming a key would orphan
  every value stored against it.

## Phase 1 scope

M1 Foundation, M2 CRM foundation, M3 Tasks and dashboard, M4 Time tracking, M5 Tickets,
M6 Channels, M7 osTicket migration, M8 Hardening and cutover. Fourteen weeks.

The full scope document lives in the Claude project "ECHO System Development" as
"COEX Phase 1 Scope".

## Decisions already made

1. Stack: Next.js 16 App Router, TypeScript strict, MongoDB with Mongoose, Tailwind, shadcn ui.
2. Authentication: Microsoft Entra single sign on for DigiSol staff, password fallback for client
   contacts. Auth.js with database sessions.
3. Job queue: MongoDB backed, no Redis. Wrapped in a thin service so BullMQ can replace it later.
4. Multi tenant from day one. Every document carries tenantId, enforced in the data access layer.
5. Documents live in Microsoft 365. Tasks store links, never files. Ticket attachments are the one
   exception and are compressed automatically on upload. DigiSol's own cloud server is the planned
   production store; application limits are 3 MB per file and 10 MB per ticket message.
6. No ClickUp data migration. osTicket migrates in full.
7. No knowledge base, no automations builder, no whiteboards, no goals.
8. Task structure is four levels: Space, Folder, Task, Subtask. Set by John's team on 18 Sep 2026,
   replacing the three level structure agreed the day before. A Space or Folder without named
   members is open to the tenant; naming members makes it private to exactly those members, a
   tenant administrator excepted. Work in a private Space or Folder can only be assigned to its
   members, and making one private while it strands an assignee is refused. Phases were removed: a
   folder does everything a phase did and adds visibility, so keeping both would give the team two
   ways to group the same work. Portfolios were removed earlier. scripts/migrate-spaces.ts carries
   an older database across.
   Archiving a Space (28 Sep 2026) takes its folders, tasks and their subtasks with it, marked
   `archivedWithSpace`, so restoring brings back exactly those and nothing archived before. It is
   refused while a timer runs inside it; logged time is kept. Settings (gear on the Space) has a
   two-step "Archive space…", and Spaces lists archived spaces with Restore.
9. XVERSE integration: COEX writes events to an outbox, a connector sends them. Both sides are ours.
10. Client tenants will be billed eventually. The model is undecided, so tenant settings carry an
    inert commercial block and nothing more.
11. Ticket-linked Task work updates are internal support notes. They may update the linked ticket,
    but must never notify the customer automatically.
12. Email is configured per tenant in Setup, Email, not in .env. A separate worker process
    (scripts/email-worker.ts, pm2 `coex-mail`) holds an IMAP IDLE connection to the support mailbox
    (push, with a 5 minute safety sweep) and sends queued mail. Progress is tracked by mailbox UID;
    the first run records the current highest UID, so mail already in the inbox never becomes a
    ticket. Requests never send mail: they write to the email outbox and the worker delivers with
    retries. Passwords are sealed with COEX_ENCRYPTION_KEY. Automatic acknowledgements are never
    sent to automatic mail and at most once an hour per sender. Internal notes are never emailed.
    Every customer email on a ticket, the acknowledgement included, uses the subject
    `Re: [TICKET] <original subject>`: Outlook groups conversations by subject and ignores reply
    headers, so a custom acknowledgement subject split the customer's thread in two (25 Sep 2026).
    Three senders (28 Sep 2026), each chosen by the kind of mail (`SENDER_FOR` in email.service):
    Standard (helpdesk@digisolteam.com) by default for customer mail; public replies may choose
    another configured sender (John, 3 Oct 2026); Alert for staff alerts
    (new ticket, assigned, customer replied, task assigned, @mention); Admin for account mail
    (password links, "an administrator reset your password"). Alert and Admin are optional: blank
    sends from Standard. Each either reuses Standard's SMTP connection with its own From (needs
    "Send As" in Microsoft 365) or signs in with its own account. The new-ticket alert goes to
    administrators only (default), everyone with ticket.read.all, or nobody. An administrator's
    password reset can email the person (Admin sender) with a 24-hour link to choose their own
    password; the temporary password is never emailed.
    Signatures and previews (28 Sep 2026): each queue has a multi-line signature with
    {{agent}}, {{agent_title}} and {{queue}}; a line whose placeholder is empty is dropped. With
    "sign automatically" (default on) the server adds it to every customer email from the queue,
    replies and the acknowledgement (which has no agent), and a saved reply's {{signature}} then
    inserts nothing. All customer-email text is built by tickets/email-text.ts, which the Preview
    buttons (queue signature, saved replies, acknowledgement) also use, so a preview is what goes
    out.
13. Tasks and Tickets are natural partners and stay directly connected: escalation creates a task
    carrying sourceTicketId, and task work updates and completion post internal notes on the
    ticket. This is John's deliberate exception to the rule that modules never import siblings
    (24 Sep 2026); no other module pair gets it without his say. Confirmed 26 Sep 2026: Tasks and
    Tickets read each other's data directly, in both directions, especially where a ticket is
    linked to a task. This is intended design, not a boundary violation to be refactored away.
14. Assignment follows visibility: a task can only go to members of its private Space and private
    Folder; a subtask can only go to the task's own assignees (anyone the task could go to when the
    task is unassigned). Pickers show only these people; the service refuses anyone else.
15. osTicket migration (M7) covers open tickets only, and only if straightforward. No full import.
16. Attachments live on the Contabo VPS (100 GB); archival starts at 50 GB used. DigiSol owns and
    operates backups. Figma adoption is dropped.
17. Unread marks (25 Sep 2026): a ticket is unread for a person when the customer has written (a
    new email ticket or a reply) since that person last opened it. Staff activity never marks
    anything. Marks go to the assignee, and on unassigned tickets to everyone with
    ticket.read.all. The Support badge on the rail counts unread tickets, not open ones, and polls
    every 30 seconds so it moves on any page. Read state is per person (ticket-read model).
18. Batch C (John, 26 Sep 2026):
    - One conversation per escalated ticket: a task raised from a ticket shows that ticket's
      internal notes as its work updates and posts there; nothing is stored twice. Tasks without a
      ticket keep their own notes. Never emailed to a customer.
    - @mentions in internal notes and task updates: the picker sends the chosen people's ids, and
      only those whose "@Full Name" is still in the text are emailed (staff alert kind
      `mentioned`, switchable in Setup, Email). Replies to customers never carry mentions.
    - The dashboard's "My work" lists my open tickets and tasks together, soonest due first (a
      ticket's reply target until answered, then resolution; a task's end date), with a Tickets
      only / Tasks only / Both filter kept in the address.
    - Agents change only their own logged hours, administrators anyone's, and every correction or
      removal needs a written reason, stored in the audit record and shown in the entry's history.
    - Each person orders the menu groups for themselves ("Arrange my menu"); the order is stored on
      the user (`navigationOrder`) so it follows them across devices, the rail follows it with
      Home first, and it only reorders what they may already see.

## Code standards

1. TypeScript strict, no `any`. Types derive from the Mongoose schemas, never typed twice.
2. Identical folder pattern in every module: models, services, components, actions, tests.
3. Business logic lives in services. Components render, services decide.
4. Full descriptive names in English. No invented abbreviations.
5. Comments explain why, never what.
6. Prettier and ESLint enforced. Formatting is never a review topic.
7. Conventional commits, small pull requests.
8. Documentation updated in the same commit as the code.

## Navigation

One file defines the menu: src/components/navigation/navigation.ts. Groups are named after the
part of the business they serve, not after the module implementing them. A new module adds a group
there and nothing else, because the sidebar, the permission filtering and the collapse state all
read from that list. Permissions are applied on the server, so a link a person may not open is
never sent to their browser.

## Interface conventions (John, 26 Sep 2026)

- Secondary actions (edit, remove, history, archive, previous and next, download, open) are small
  icon buttons with a tooltip saying what they do: `IconButton` and `IconLink` in
  src/components/ui/icon-button.tsx. The tooltip is also the accessible name. Primary actions
  (Save, Raise ticket, Add time) and consequential ones (Suspend) keep their words.
- Popups use frosted glass: `popup-backdrop` on the overlay and `popup-glass` on the panel, both in
  globals.css. Forms that would otherwise open inside a table open as popups instead, so the page
  never jumps. Exceptions: the image preview stays dark, the phone menu drawer stays brand black.
  Larger forms (Raise ticket so far) use the lighter variant, `popup-backdrop-light` and
  `popup-glass-gradient`: bright frosted glass behind, and a panel of glass tinted with the
  sidebar's pastels (28 Sep 2026).
- A phone has no hover, so nothing may be reachable only on hover.
- Tooltips (1 Oct 2026): one component, `GlobalTooltip`, draws every tooltip (`title`,
  `data-tooltip`, or an icon-only control's `aria-label`) and keeps it inside the window. Never
  add a CSS pseudo-element tooltip; it cannot avoid the screen edge.
- Back (1 Oct 2026): the header's back arrow (`BackButton`) returns to the previous screen on
  every page, and to the dashboard when the page was opened directly.
- Timers live in a floating window of pastel glass (`FloatingTimer`, 28 Sep 2026): the running
  clock with stop, and today's timers with stop and resume. Three sizes (28 Sep 2026): Open, the
  full window; Clock, a floating digital clock only; Minimized, a small bubble with a dot while a
  timer runs. All three drag on a desktop (a drag never counts as a click), and the place and size
  are remembered per browser. The header's timer button switches between Open and Minimized and
  shows a dot while a timer runs; the old header clock is gone.
- Three themes (27 Sep 2026): Sunset (the original warm tokens in `@theme`), Light and Dark
  (overrides on `html[data-theme=...]` in globals.css). Components use only colour tokens, never
  literal colours, so a theme is only a set of values. The choice is stored on the user (`theme`)
  and set on `<html>` by the root layout on the server, so pages never flash the wrong theme; the
  switch is the theme button in the header.
- The avatar at the top right opens the person's own menu: name and email, Edit profile
  (`/profile`: name, job title, own password), Arrange my menu, and Sign out. Beside the avatar
  only the workspace name shows, never the role (27 Sep 2026).
- Passwords change only through a link emailed to the account's registered address, from the
  profile or from "Forgot your password?" on the sign-in page. Links work once, for 30 minutes,
  three per account per hour; only a hash is stored; using one signs out every device. The
  forgot page answers the same whether or not an address has an account. Password rules follow
  NIST SP 800-63B (src/modules/core/password-policy.ts): at least 12 characters, up to 128, no
  forced symbols or capitals, and common passwords, simple patterns and the person's own name or
  email are refused. The `password_reset` email kind cannot be switched off.
- The selected item on the dark icon rail glows (`rail-glow` in globals.css, 28 Sep 2026): a light
  pastel tile, cloud white with sunset and rainbow tints, a soft halo, drifting slowly; still for
  reduced motion. The whole desktop sidebar behind the menu carries a paler, still version of the
  same mix (`sidebar-glow`), with deep tints in the Dark theme.
- Menu headings are bold in full ink (`navigation-heading`); the current page carries a red bar
  and red tint (`navigation-active`), in the sidebar, the phone drawer and the Spaces tree.

## Where things live

- `src/modules/<module>/` one folder per module, never importing from a sibling module (Tasks and
  Tickets excepted, decision 13)
- `src/modules/core/` tenancy, users, audit log, outbox, shared primitives
- `src/lib/` framework level helpers: database connection, tenant context, utilities
- `src/components/ui/` the shared component library
- `docs/` architecture, data model, onboarding
- `scripts/` migration and maintenance scripts

Cross module needs go through core services or the outbox. This rule is what keeps a modular
monolith from becoming a tangle.

## How the work runs

- A fresh Claude session per working day.
- Feedback raised in chat as numbered items, then written into FEEDBACK.md.
- Anything decided in conversation is written into CLAUDE.md or FEEDBACK.md, never left in chat.
- John runs the commands himself and pastes the output back. Standing permission for Claude to
  drive the Mac was granted 17 Sep 2026 and turned off again on 19 Sep 2026 because it spent credits
  too fast, so Claude proposes the exact command and John runs it. Installs still happen natively on
  macOS, never from the Linux sandbox, or the binaries come out wrong.
- Claude still hands over the command when the point is for John to see it run, and always says what
  it ran and what came back.
- Pushing works only from macOS: the GitHub credentials live in the Mac keychain, and the sandbox
  cannot read them. Use the Terminal bridge for git push.
- Two things stay with John: anything that costs money, and anything needing his Microsoft or
  GitHub account.
- Replies on this project in English only, whatever language the question is asked in.

## AI collaboration

Claude and ChatGPT share project context through the files in `ai/`.

Before significant work:
1. Read `ai/PROJECT_STATE.md`.
2. Read `ai/CURRENT_TASK.md`.
3. Read `ai/HANDOFF.md`.
4. Follow `CLAUDE.md` as the permanent project authority.
5. Read `FEEDBACK.md` when product history or acceptance status is relevant.
6. Inspect the actual code before making assumptions.

During work:
- Treat the repository and shared AI files as the source of truth, not another AI's conversation history.
- Do not assume that work mentioned in chat was completed; verify it in the repository.
- Do not overwrite or discard another AI's uncommitted work without John's direction.

After significant work:
1. Update `ai/PROJECT_STATE.md` with the new project state.
2. Update `ai/CURRENT_TASK.md` if the active task changed.
3. Update `ai/HANDOFF.md` when work is being handed to another AI.
4. Record permanent architectural or product decisions in `CLAUDE.md` or `FEEDBACK.md`, as appropriate.
5. State what was changed, what was tested, and what remains.

When handing work to ChatGPT:
- Write a concise handoff in `ai/HANDOFF.md`.
- Identify changed files, tests run, unresolved issues, and the recommended next step.

When continuing work started by ChatGPT:
- Read the shared AI files first.
- Verify ChatGPT's reported work against the repository before continuing.

When handing work to Claude:
- ChatGPT will update `ai/HANDOFF.md` with the current state and recommended next step.

## Environment

COEX runs on port 3100, not 3000, because the CIBO accounts program already uses 3000 on John's
Mac. Both can run at once. Cookies ignore the port, so the session cookie is named coex_session to
keep it distinct from anything CIBO sets on localhost.

Node 22 LTS, pinned in .nvmrc and in the engines field. Node 23 is an odd numbered release, never
became LTS and is already end of life; it also ships the npm build that throws
"Cannot read properties of null (reading 'edgesOut')" during install. Mongoose 9 renamed
FilterQuery to QueryFilter, so older examples found online will not compile here.

## Environment rule that bit us once

Dependencies are installed on John's Mac, by John, with `npm install` in Terminal. Claude must
never run `npm install` from its Linux sandbox into this folder: packages such as lightningcss,
@tailwindcss/oxide and @node-rs/argon2 ship compiled binaries per platform, so a Linux install
leaves node_modules unusable on macOS and the build fails with "Cannot find module
'../lightningcss.darwin-arm64.node'". The cure is `rm -rf node_modules package-lock.json` followed
by `npm install` on the Mac.

## Product and release decisions — 1 Oct 2026
- Task creator is immutable (John, 3 Oct 2026); reassignment stays allowed. The editable
  people field is labelled Assignees, distinct from read-only Created by.
- A task has one status. Each Space configures its workflow; boards and other views share it.
  Exactly one configured stage marks completion. Never infer completion from the status name.
  Prevent renaming/removing used stages or changing their completion flag until tasks move.
- Table column headings toggle ascending/descending order. Use real numeric/date sort values;
  keep task/subtask groups together and retain row editor state. Reset sort restores manual order.
- All Timesheets includes Monday–Sunday hours for the chosen week. Calendar date keys must not
  come from slicing UTC timestamps when the value represents a local week/day.
- My Desk's secondary task action is a desk icon with an accessible tooltip and selection mark.
  Only the signed-in user's eligible tasks can be added; idempotent selection never toggles an
  already-added task off accidentally. Available-task titles preview in a popup without navigation.
- After a same-day snapshot exists, the primary label is Update today’s summary.
- Team history (John, 1 Oct 2026): everyone's My Desk Performance history is visible only to
  people granted `desk.read.all` per person in Users and roles; no role has it by default
  (platform administrators hold every permission). My Desk shows a Team history tab: a table by
  day for a date range, and a person's full history. Same counts as a person's own history, no
  score. `listTeamDeskHistory` checks the permission itself.
  It is deliberately not in What's new (John, 1 Oct 2026): it is for the few people granted the
  permission, so it is announced to them directly, not to everyone.
- Senior agent (John, 2 Oct 2026): a role above agent (`senior_agent`, permissions.ts). Still an
  agent, but sees every ticket and task (`ticket.read.all`, `task.read.all`) and so can assign any
  of them to anyone, directly and at once; the assignee gets the usual alert and the audit log and
  task origin record who did it. It is not a request that needs accepting. Private Space and
  Folder member limits (decision 14) still apply. No user, tenant or audit administration. Everyone's
  timesheets and the Time report are a separate permission, `timesheet.read.all` (2 Oct 2026; held
  by tenant administrators and managers, granted to a senior agent only per person in Users and
  roles), so John decides who sees hours. `read.all` still opens Spaces and counts the person in
  unread marks for unassigned tickets. Deliberately not in What's new:
  administrators assign it in Users and roles.
- Task origin (John, 1 Oct 2026): every task shows who created it (`createdById`) and who
  assigned each current assignee (`assignments`: userId, assignedById, assignedAt, kept in step
  with assigneeIds by createTask, updateTask and patchTask). The viewer reads "Assigned to you
  by". Assignee changes are also in the audit log. Assignments before 1 Oct were never recorded
  and are not guessed. Shown on the task page, the preview and the side panel (`TaskOriginLines`).
- John authorized this release's commit/push/deploy and subsequent Mac shutdown. This is scoped
  release authorization, not standing permission for unrelated server work. Deployment remains
  blocked by SSH-key access; preserve the running Mac until deployment can be verified.
- Keep communication short and commands-first; no screenshots. Read the newest ai/HANDOFF.md
  section before continuing. Follow actual pm2/Apache deployment status, not the original design.

## Phase 2 decisions — 4 Oct 2026 (John)
- Order: Contracts / AMC, then full CRM, then Payroll. Billing is entirely in Zoho Books; COEX never
  invoices. AMC is yearly, billed monthly, bimonthly, quarterly or yearly. Support hours against a
  contract are optional per contract. All customers are treated the same: no SLA tiers.
- Contracts live in the CRM module. Covered products come from the CRM product list, addable from
  the contract form. Renewal owner is the organisation's owner. From `expiryWarningDays` (default
  30, per customer) before the end date, and after it, agents see a warning and the contact who
  raises a ticket is warned in the acknowledgement. Payroll will support AED, USD and PKR.
  Details: docs/PHASE-2-PLAN.md, docs/P2-1-CONTRACTS-SPEC.md.

## M6 Channels decisions — 1 Oct 2026 (John)
- SUSPENDED 4 Oct 2026 (John): the XVERSE team is busy on another project, so M6.3 to M6.6 wait
  until further notice. M6.1 and M6.2 stay in the code as merged; do not extend them. Next work is
  M8 hardening, then Phase 2 planning (docs/PHASE-2-PLAN.md).
- Two WhatsApp numbers: Support (tickets) and CRM (contact conversations). See docs/M6-CHANNELS-SPEC.md.
- Unknown senders open a ticket automatically (Support) or an Unidentified contact (CRM).
- Ticket received is sent automatically on WhatsApp; every other notification is optional.
- Whether XVERSE already has an inbound webhook and send API is unconfirmed: build the canonical
  Channel API and a Mock provider first, so the connector can live in COEX or in XVERSE.

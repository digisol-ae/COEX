# COEX — AI Handoff

## Tabbed Setup popup — 21 Oct 2026 (Codex, local)

Setup navigation now opens a native popup over the current page with permission-filtered Queues/Tutorials/Email/Pipeline/WhatsApp/Saved replies/Tenant settings/Custom fields/Tenants tabs. Intercepted routes preserve work context; direct/reload URLs use the same workspace. Sidebar Setup children replaced by one entry; settings forms render inline within tabs. Preview-only tutorial player prevents native-modal inertness and duplicate playback. Typecheck/lint/build and browser open/tab/close/direct/mobile/preview checks passed; no settings saves or publication. [Implementation and QA](../docs/SETUP-WORKSPACE.md). No push/deploy.


- Customer list follow-up (21 Oct): search/type filters now use a compact responsive two-column grid (desktop176px/112px), replacing full-width controls. Long company-history description moved to heading info tooltip; browser verified dimensions and keyboard tooltip text. Focused ESLint and diff checks passed.

## Shared compact UI — 21 Oct 2026 (Codex, local)

Support-based shared spacing/controls and compact filter strips applied; header + quick-create reuses protected Task/Ticket/Lead forms; collapsible desktop sidebar persists per browser. Shared native settings drawers now cover Workspace/Email/Pipeline, Product add/edit, Space/Folder settings. Mobile header/filter wrapping and touch targets retained. Browser checked all quick-create form openings, sidebar persistence, Product/Pipeline drawers and320/390px layouts; no business/settings saves. Ticket default-open portal hydration issue found/fixed. Typecheck/lint/Webpack build pass; individual screen/device acceptance boundaries: [UI standard and QA](../docs/UI-STANDARDS.md). No push/deploy; earlier QA findings remain open.


## Contractual and subscription CRM — 21 Oct 2026 (Codex, local)

Implemented product availability by service model and parent-linked modules; opportunity model selection and won-deal prefill; agreement fixed/annual licence-percentage pricing, product/module quantities and cycle rates, separate upfront setup/training and hardware ownership/return terms. Customer Services shows both models together; agreement list has model/customer filters. Existing date-based commitment/renewal and Zoho billing stay in place. Renewal copies recurring terms/contacts but clears upfront charges. Existing rows default compatibly; no shared customer data migration.

Validation: typecheck/lint and Webpack build pass; 26 existing contract/CRM tests pass, 5 new service tests pass, focused opportunity save/update 1 pass /16 skipped. Browser restored after reload: form modes, live2×300=600 total, catalogue model/parent controls and customer Services→prefilled customer verified. No real draft saved; populated browser persistence/renewal still pending. Product edit button corrected to Save product (focused lint passed). Previous QA findings remain open. No push/deploy. Details and operating guide: [CRM service models](../docs/CRM-SERVICE-MODELS.md).


## QA restart — 20 Oct 2026 (Codex, QA only)

Browser acceptance on isolated coex_test_ui1020 passed customer own-ticket privacy, create/reply with upload and pasted-image previews, public/internal separation, relink persistence + revoked old-contact access, contact drawer edits, populated timeline expand/collapse, 7m manual time and contract sender/recipient queue metadata. Two product UI findings remain: stale customer/contact selects after successful relink; portal customers offered as staff ticket assignees. Typecheck/lint/diff checks pass. Full regression: **49 files passed / 2 failed; 468 tests passed / 4 failed**. Failures comprise two stale expectations (origin401 vs404, default non-billable0 vs60) and two team-activity empty-row assertions explained by local-midnight write versus +04:00 query boundaries on Asia/Karachi. Three product findings total; no fixes made. Normal Webpack production build passes, 54 routes; normal Turbopack rebuild blocked by local worker-port permissions. Detailed evidence and final counts: [20 October QA report](../docs/qa/QA-2026-10-20.md). No feature edits/push/deploy. Existing implementation status below is preserved.


- 19 Oct 2026 customer header refinement: kind badge moved beside customer name; Customer details is last action aligned right. Browser structure verified; focused ESLint passed.

## Customer drawer and compact timeline — 19 Oct 2026 (Codex, local)

- Moved Opportunities, Contacts and Sites into right-side Customer details drawer with counts; main page keeps compact summary and full-width activity timeline. Existing edit/add/portal-access controls remain inside drawer. Native modal handles focus and Escape, backdrop closes outside, mobile uses full available width.
- Timeline defaults to first and last entry in existing newest-first order; Show more reveals all entries between, Show less collapses. Customer page loads full activity history rather than old 50-entry cap so endpoints represent real first/last. Empty/one/two-entry cases render normally.
- TypeScript/focused ESLint/diff checks passed. Browser inspected drawer contents/layout, empty timeline and Escape close. Current customer has zero timeline entries; populated expand/collapse not exercised in browser. No data mutation or deployment in this change.

## Browser acceptance follow-up — 19 Oct 2026 (Codex)

- Browser access restored after John reloaded. Customer UI: created labelled QA TEST contact under DigiSol LLC, edited job title, saved, reloaded and confirmed persistence; then soft-archived it. Contact list returned to zero.
- Existing ticket customer/contact popup loaded current identity and enabled Save after fetching contacts. Did not change the real ticket’s customer/access; reassignment save/privacy remains covered by database tests.
- Created one labelled QA TEST draft contract (C-1, 1 AED purely synthetic, never activated), checked editable To/CC, removable Ali default CC, team suggestions and first-recipient preview, closed without sending, then archived draft. Active contract list returned to zero. No mailbox/email or billing action occurred.
- Local sender list is empty because outbound sending/configuration is off; added explicit notice directing to Setup → Email. Did not enable email or change sending credentials. Live mailbox sending remains unverified.

## CRM/support/email feedback — 19 Oct 2026 (Codex, local)

- Contact editing added; existing ticket customer/contact relinking with validation, portal-scope change and actor/history; 15-second plus manual refresh; contract From/To/CC editing with active team/customer suggestions and removable Ali default CC. Configured senders managed in Setup → Email.
- Final production build passed (54 routes). Database QA **38/38** across three isolated suites; final targeted refinements **2/2**. Workspace typecheck/focused ESLint/diff checks pass. No real emails, push/merge/deploy. Browser visual/save acceptance pending URL-policy failed-page state; John asked to reload.
- Full detail and interrupted prior portal QA boundaries: [19 October release notes](RELEASE-2026-10-19.md). dOne work remains waiting for local setup/access.

## dOne support integration project — 18 Oct 2026

Dedicated planning and AI continuity: [dOne ↔ COEX project](../projects/done-coex-integration/README.md). Separate web application; Bilal frontend, Uzair backend, beginner deployment teammate. Waiting for dOne local setup/access; documentation base only, no integration implemented or deployment authorised.

## Notification persistence — 18 Oct 2026 (Codex, local)

- John confirmed desktop test popup arrived after enabling OS notifications. Automatic background reply delivery remains separately unverified.
- Requested notifications stay until customer dismisses: set requireInteraction on shared live and test desktop notifications (staff/customer). Browser/OS may override; macOS alert style should be Alerts for persistent display. No repeated-alert loop or unread-state change.

## Browser notification testing — 18 Oct 2026 (Codex, local)

- Customer browser notification switch verified On. Added explicit permission/error feedback and a Test notification action to shared account menu; test uses a distinct tag each time. Constructor accepted requests but this does NOT confirm OS display. John reported no popup even after disabling Focus; final distinct-tag test sent, desktop delivery still unconfirmed. Only in-app browser automation available. Check host app OS notification permission or repeat in Chrome/Edge.
- Created one labelled [Notification test] public reply on existing customer ticket 6ab4f6e18f176d75b7411462 without sending email; audited and verified scoped portal event feed returned exactly the test event. No other ticket/message mutations. Browser settings, actual background polling-to-OS delivery and notification click-through not yet proven.
- TypeScript/focused ESLint passed; HTTP boundary tests 3/3. No push/deploy.

## Customer header/account menu — 18 Oct 2026 (Codex, local)

- Customer header reuses staff avatar/account menu with Edit profile, Reset password, Browser notifications, disabled Tutorials (Coming soon), Sign out. Added protected customer-only profile page/action for own name/job title; staff profile actions remain restricted.
- Browser notifications poll separate authenticated customer endpoint for public outbound non-system replies on contact's own tickets, using existing portal identity checks. Generic notification text avoids message-content disclosure; opt-in/cursor stored per customer/browser. No closed-browser push. Customer tutorial publishing/player not enabled; menu placeholder only.
- Browser checked shared menu and profile navigation. TypeScript/focused ESLint passed; portal database regressions **11/11** including own-reply/privacy/revocation test in isolated coex_test_portal_1018. Real OS notification delivery and profile save not exercised. No push/deploy.

## Neon conversation colours — 18 Oct 2026 (Codex, local)

- John clarified **agent/support green, customer light yellow**. Applied shared theme-aware neon fill/border/glow to public messages in both staff conversation and customer portal. Internal note styling stays distinct.
- Visually reviewed customer conversation in Dark, Light and Sunset; restored preview account to original Sunset. Sender contrast ratios exceed 6.8:1 across palette. TypeScript, focused ESLint and diff check passed; staff uses shared classes but separate staff browser visual acceptance not repeated. No deployment.

## Customer conversation bubbles — 18 Oct 2026 (Codex, local)

- Customer ticket conversation now uses refined WhatsApp-style bubbles: own messages right/soft green, support left/surface, sender names, centred day separators and compact bottom timestamps. Reuses agent BubbleText read-more handling and existing protected attachment thumbnails/previews. No message or visibility/access changes.
- Browser checked actual customer ticket alignment and attachments; old Tahoe previews remain unavailable as before. TypeScript and focused ESLint passed. No deployment.

## Local test credential reset — 18 Oct 2026 (Codex)

- At John’s explicit request reset existing customer s.john.ali@gmail.com and staff ali@digisol.ae (platform_admin) through audited resetPassword service on the configured local app database. Old sessions revoked, no email sent, credentials returned once in chat only. Roles unchanged; staff account is admin, not a restricted support_agent.

## Login Customer / Agent toggle — 18 Oct 2026 (Codex, local)

- Prominent Customer / Agent toggle above login heading; Customer default shows Create / View Your Support Ticket and support explanation, Agent shows Sign in to COEX and workspace explanation. Toggle preserves the shared form and does not grant/change role or access. Microsoft entry appears in Agent view. CAPTCHA and 60-day remember remain.
- Browser checked both toggle states and left Customer selected. TypeScript/focused ESLint passed. No deployment.

## CAPTCHA local configuration verified — 18 Oct 2026 (Codex)

- John replaced local Turnstile placeholders with actual keys and confirmed localhost added in Cloudflare. Checked presence/non-placeholder values without exposing credentials; restored localhost to local hostname allowlist after edit and restarted only local Next dev process.
- Browser login widget now visibly shows Cloudflare **Success!** alongside Create Support Ticket and 60-day remember checkbox. Automatic browser verification required no challenge interaction. Server-side live token acceptance/form submission still not exercised in this check; production environment/build/deployment remains pending. Secrets remain only in ignored local environment.

## Portal login refinements — 18 Oct 2026 (Codex, local)

- Login and guest portal heading now prominently says Create Support Ticket. Password login has opt-in Remember me on this PC for 60 days; selected cookie and database session expire together after 60 days, unchecked login uses a browser-session cookie with existing 30-day server cap. Password reset/signout revocation remains. Microsoft SSO unchanged.
- Browser verified heading/checkbox. Turnstile reported 400020 (invalid sitekey); environment inspection found a site-key placeholder, without exposing keys. John asked to replace actual site/secret values in local environment. CAPTCHA acceptance remains pending correction/restart and human verification.

## Customer CAPTCHA — 18 Oct 2026 (Codex, local)

- Requested CAPTCHA implemented with Cloudflare Turnstile for shared password login and customer ticket/reply actions, server verification before mutations, action/hostname matching, timeout and single-use widget refresh. Partial configuration fails closed; both keys absent leaves integration inactive. Staff password login shares the same widget; Microsoft SSO unchanged.
- Verified: CAPTCHA unit tests **7/7**, workspace TypeScript and focused ESLint passed. Live widget/challenge verification awaits keys.
- **Activation pending:** John has no Cloudflare account yet. Account/widget keys, hostname configuration, rebuild/restart and real challenge acceptance remain required; no production activation or deployment claimed. Setup in `docs/CUSTOMER-PORTAL.md`. No secrets saved in documentation.

## Staff login recovery — 18 Oct 2026 (Codex)

- John requested agent email lookup and password reset. Only active staff identity in the local tenant was Ali (`ali@digisol.ae`, platform_admin); reset via existing audited service, revoked old sessions, required password change, and sent no email. Temporary credential shared in chat only. No role or permission change.

## Portal preview account — 18 Oct 2026 (Codex)

- At John’s explicit request, created `s.john.ali@gmail.com` as a `client_contact` portal account. Existing inbound email author confirmed the raiser. Created an individual customer/contact under that email (company unspecified), linked existing ticket `6ab4f6e18f176d75b7411462`, and verified portal service returns exactly **1 own ticket**. Mutations audited. No invitation/email sent; temporary password shared once in chat and not stored in documentation. This supersedes the earlier no-real-account QA statement below.

## Customer portal T6 — 18 Oct 2026 (Codex, local)

- John explicitly resumed T6 and confirmed **own tickets only**, not all company tickets. Built same-site `/portal`, customer password sign-in routing, own ticket search/filter/pagination, Raise ticket, public conversation/reply, safe image/file attachments and pre-send previews. Default queue and authenticated contact/company are server-selected. Internal notes/attachments, engineering and staff time are excluded.
- Administrative account provisioning is on Customer → Contacts (`user.manage`), using existing Contact.userId/User.organisationId. Fresh client accounts only; no staff account conversion, no automatic invite email. Suspension/contact archival revokes access. Staff pages/actions and both API surfaces reject client-contact sessions even with permission overrides.
- Verified: production build and workspace typecheck; portal DB suite **10/10** and tutorial DB regressions **3/3** in separate coex_test databases. Portal HTTP boundary unit tests **2/2**. Browser synthetic QA verified login, own list, create with image, attachment preview, customer reply and refresh persistence, foreign direct URL 404, staff dashboard redirect, public reply visibility and hidden internal note. No real customer account or ticket created. Final full unit run: **31 files / 195 tests passed**; focused ESLint, formatting and diff checks passed.
- Isolated UI QA at 127.0.0.1:3101 used `coex_test_pui_1018`, separate cookies and storage. Stopped after verification, temporary launcher removed; localhost:3100 remains running. No push/merge/deploy. Mailbox delivery and real-device/theme acceptance remain unverified.
- Implementation, setup and security notes: `docs/CUSTOMER-PORTAL.md`. T9 subtask-assignee changes and T10 XVERSE remain on hold. Leads API pilot remains paused.

## Current handover — 18 Oct 2026 (Codex)

- **Branch / PR:** `claude/gallant-faraday-r1u4g8`; local committed HEAD `6c5f572`. Refreshed GitHub: branch/PR head `b0db354` (Claude's documentation-only handover), PR [#24](https://github.com/digisol-ae/COEX/pull/24) **OPEN**, main `9703f43` (PR #23). Claude's new handover is recorded in `ai/RELEASE-2026-10-18.md`; no pull/merge/reset was performed over local work.
- **Codex changes remain local and uncommitted.** They are not in PR #24 until separately committed/pushed. No merge, deployment or tutorial publication performed. Claude reports production through PR #23; the deployment file previously confirmed only PR #21, and VPS SHA/PM2 have NOT been independently rechecked.
- **Built after Claude:** refined Ticket header/control layout, history popups with actor/date, image paste plus thumbnail/full preview; Task details/edit/history popups, clear Assigned to, manual Add time, per-agent times and highlighted Total time at row end; compact Customer/Contract/Opportunity detail styling; shared wording and visible module identity; floating tutorial system with upload and supported video links.
- **Product conventions:** COEX remains the current name (Worktello is the same product; rename is future). Transparent compact control sections, small icon + name badges, matching labels/tooltips/buttons for equivalent actions, module identity on each page, one-click history with actor/date and time entries already expanded. `CLAUDE.md` holds standing rules; `FEEDBACK.md` holds John's product requests and final refinements.
- **Tutorials:** `/setup/tutorials` requires `tenant.manage`. Upload MP4/WebM or add YouTube/Vimeo/direct HTTPS MP4/WebM link; preview draft, publish to current tenant, stop, republish. Drag/minimize/expand/close/replay player; no autoplay. One display per user/publication, 30s poll. Current draft: **Create a ticket in 20 seconds**, exactly 20s, silent illustrated demo (not a recording). Both MP4 artifacts remain under `docs/tutorials/`. Do not publish merely to test.
- **Verified in this chat:** full workspace typecheck and focused ESLint/format/diff checks; 25 tutorial unit tests + 3 isolated database tests passed (`coex_test_tutorials_1017`). Browser checked Ticket/Task history, clipboard image preview, module label, Task edit and manual-time form, floating video play/drag/expand/minimize/restore, and exact 20s create-ticket playback. No ticket, time entry or customer message was created by these checks; tutorial drafts were saved through the local UI.
- **Still required:** full current regression suite and production build/CI; actual manual-time save/reopen; multi-user publish/seen/stop browser journey on isolated QA; live YouTube/Vimeo playback; CRM detail/theme/mobile visual acceptance. Claude's prior task/ticket database regressions are not proven by the tutorial-only database suite. Older Tahoe attachments failed to load locally; no stored attachment changed.
- **Held / external:** T6 customer portal is now built locally (see newest section); T9 subtask assignees and T10 XVERSE remain on hold. Leads API pilot remains paused/off in production per Claude; planned-to-estimate migration unconfirmed; QA Space export and deploy evidence updates remain open. Broader Leads/Spaces/Settings compact-layout review has not been completed.
- **Next:** John reviews local UI at `http://localhost:3100`; resolve acceptance issues, run required release checks, then await his explicit commit/push/PR/merge/deploy instructions. Preserve unrelated `docs/handover/` and generated `apps/web/AGENTS.md` / `apps/web/CLAUDE.md` files; inspect before staging. No new PR or merge without John's instruction.
- **Detailed inventory / incoming Claude note:** `ai/RELEASE-2026-10-18.md`.

## Historical handover — 15 Oct 2026 (Claude)

- Team feedback T1 to T5, T7, T8, T11, T12 are built on `claude/gallant-faraday-r1u4g8` and NOT deployed
  (John wants all feedback finished and reviewed on his own system first). Held by John: T6 ticket
  portal, T9 subtask assignees, T10 XVERSE task. Details: FEEDBACK.md and ai/CURRENT_TASK.md.
- No database or browser was available in the cloud sandbox: database tests are written but UNRUN.
  First thing on the Mac: `git pull`, `npm install`, `npm test`, then run the app and walk each item.
- Not done: the read-only QA Space access token (blocked by the sandbox safety check; John chose between
  that and running scripts/export-space-tasks.ts on the server and pasting the output).

## State at 13 Oct 2026 (Claude)

- The sections below dated 3 Oct 2026 (Codex) are history. Their push and VPS pull steps are done or
  overtaken: Phase 1 of the architecture revamp is merged and live (web app in `apps/web`, workers in
  `apps/api`, four pm2 processes online). Read `ai/CURRENT_TASK.md` and `ai/PROJECT_STATE.md` for detail.
- Built: Contracts P2.1a to c, full CRM P2.2a to d, Express API skeleton (health, /me, read-only
  /leads, auth routes). Not built: P2.1d Zoho link (needs Zoho API access from John), Payroll (needs
  John's answers on headcount, leave rules, client tenants), revamp Phase 2 (modules to the API).
- Waiting on John: start `coex-api` on port 3002 plus Apache rule; Entra redirect URI in Azure;
  check `/time/report` on real MongoDB; 3 Oct database regressions and browser acceptance.
- Done 13 Oct: Leads write routes on the API (unrun tests, see ai/CURRENT_TASK.md). Leads pages now behind `COEX_API_MODULES=leads` (see ai/CURRENT_TASK.md). Recommended next: pilot Leads, then Contracts; revamp Phase 2, Leads and Contracts first (Express routes and zod schemas,
  supertest tests, web pages behind a flag), per docs/ARCHITECTURE-REVAMP.md. Needs John's go.
- Pushing and deploying stay with John (Mac keychain, SSH). Work goes on `claude/gallant-faraday-r1u4g8`.

## Committed release for Claude — 3 Oct 2026 (Codex)

- Feature commit: `955ea3f` (44 files), branch `claude/dreamy-carson-86yxhh`.
  Includes today's customer creation, CC, attachments, previews, timer/sender, ticket analytics,
  task badge/creator and colors. To do = yellow; In progress = blue. Full inventory:
  `ai/RELEASE-2026-10-03.md`. Earlier Claude channel commits remain on this branch.
- Verified at commit: 18 unit files / 109 tests, TypeScript, full ESLint, full source/test
  formatting and diff checks passed. Production build blocked twice by sandbox worker-port
  permissions. New database regressions and browser acceptance have NOT been verified.
- John authorized commit/push and proceeding to app-server pull. Feature commit exists locally;
  no push, CI result or deployment is confirmed. GitHub/Microsoft account actions stay with John.
- John was given this Mac sequence: `npm run build`, then
  `npx vitest run tests/database/ticket-collaborators.test.ts tests/database/tasks.test.ts`,
  then (only on success) `git push origin HEAD:main`. Test databases are forced to
  `coex_test_ticket_cc_1003` and `coex_test_tasks`; never clear shared databases.
- Next: obtain command output, verify remote exact SHA and main CI. If push is rejected because
  main advanced, reconcile safely; never force-push or discard another AI's work.
- Then verify VPS /srv/coex/app has clean status, record actual HEAD/PM2, pull --ff-only,
  npm ci/build and restart coex-app/coex-mail/coex-desk-close with --update-env, pm2 save.
  Inspect coex-channels before restarting/creating it; avoid duplicate workers. Verify deployed
  SHA, processes and HTTPS. Follow deploy/DEPLOYMENT-STATUS.md; keep Apache/Zabbix intact.
- Last documented live baseline: dd037e6; actual current server revision remains unverified.
- This handover is a documentation-only follow-up commit. No code changes after feature commit.

## Release commit preparation — 3 Oct 2026 (Codex)

- John authorized committing today's bundle, pushing and proceeding to app-server pull.
- Includes today's ticket/customer/CC/attachments/preview/timer/sender/analytics and task
  badge/creator/colors changes. Existing branch also contains Claude's M6.1/M6.2 channel work.
- Verified: 18 unit files / 109 tests, TypeScript, full ESLint and source/test formatting pass.
- Production build blocked twice by sandbox local-port permission (Turbopack CSS worker).
  Database and browser acceptance still pending. Run native Mac build and focused DB tests
  before push. No push or server change performed; GitHub credentials stay with John.
- Next: native checks, fast-forward push HEAD to main, confirm CI, then clean ff-only VPS pull,
  npm ci/build and restart app/mail/desk workers. Inspect channels worker before adding/restarting.

## To do tasks yellow — 3 Oct 2026 (Codex, local only)

- To do task dots, status pills and full-page status selector now use yellow in all themes.
  In progress remains blue; completion behavior unchanged.
- Files: ui/pill.tsx, globals.css, tasks/[id]/task-status.tsx, release-notes.ts.
- Checks: TypeScript, focused ESLint, formatting and diff checks passed; visual acceptance unverified.
- Next: refresh Tasks. Included in today's cumulative release; no push/deploy.

## In-progress tasks blue — 3 Oct 2026 (Codex, local only)

- Changed shared in-progress task dots from green to blue in lists and panels. Existing
  status pills and full task status control already use blue for in-progress work.
- Files: src/components/ui/pill.tsx, release-notes.ts; added to today's cumulative release.
- Checks: focused ESLint, TypeScript, formatting and diff checks passed; browser
  acceptance not verified.
- Next: refresh Tasks and verify In progress dots. No push/deploy.

## Ticket analytics counts — 3 Oct 2026 (Codex, local only)

- Replaced Mine/All open/Unassigned/Missed/Everything scope buttons with green Opened, amber
  Delayed and red Missed count buttons. Each selects its corresponding ticket list.
- Opened = active tickets (excludes resolved/closed); Delayed = SLA due_soon (within 60 minutes),
  excluding Missed; Missed = breached reply or resolution SLA. Definitions in tooltips.
- Counts share matching queue/search/priority/status and permissions with the list, without
  the former 200-record cap. Personal agents remain server-restricted to their assignments.
- Queue/search/status/priority controls retained; clicking analytics clears status, and choosing
  a specific status enables that status view so resolved/closed tickets stay reachable.
- Files: tickets/page.tsx, filters.tsx, tickets/analytics.ts, new unit tests and release notes.
- Verified: TypeScript, focused ESLint zero warnings, formatting/diff checks; 109 unit tests.
  Browser acceptance remains unverified due previous browser policy block. No push/deploy.
- Added to today's single cumulative release. Next: refresh Tickets and check colored counts.


## Tasks badge and fixed creator — 3 Oct 2026 (Codex, local only)

- Tasks rail badge is an open-assigned-work count, not unread notifications. Tooltip now
  explains it; clicking opens /tasks?mine=1 and the page shows the matching open-task count.
- countMyOpenTasks applies the same Space/Folder visibility as listTasks, avoiding counts
  for hidden work that cannot appear in the list. All tasks remains available via the sidebar.
- John clarified: creator remains fixed; reassignment is allowed. createdById is now immutable
  in the Mongoose schema; the editable Owner row is renamed Assignees. Created by remains
  read-only in existing origin lines. Task update services already whitelist editable fields.
- Files: icon-rail.tsx, tasks/page.tsx, task-panel.tsx, task model/service, release-notes.ts,
  tests/database/tasks.test.ts. Added DB regressions for immutable creator/reassignment and
  visibility-aligned badge counts; NOT RUN due prior database-test execution restrictions.
- Checks: TypeScript, focused ESLint zero warnings, formatting/diff checks and 107 unit tests
  passed. Browser and database regression QA remain pending. No push/deploy.
- Added to cumulative 3 October release entry and ai/RELEASE-2026-10-03.md.
- Next: local acceptance; restart dev when reloading model schemas; run
  `npx vitest run tests/database/tasks.test.ts` on Mac using isolated coex_test_tasks.


## Cumulative release notes — 3 Oct 2026 (Codex)

- Accumulated changes since last documented live pull dd037e6 into one What's new entry
  dated 3 October 2026, id 2026-10-03: task origin, WhatsApp preparation and all today's
  ticket/customer/CC/attachment/preview/timer/sender improvements. Earlier live history kept.
- Full technical/change inventory and QA limitations: ai/RELEASE-2026-10-03.md.
- Verified baseline-to-HEAD Git history and diff; actual VPS revision is unverified.
- Files: release-notes.ts, dated release inventory, shared AI docs and FEEDBACK.md.
- Validation: release-note formatting and diff check. No new application code, push/deploy.
- Next: use dated inventory for local QA and verify the server baseline before release.


## Compact ticket preview — 3 Oct 2026 (Codex, local only)

- Replaced the tall label/value grid with wrapping icon-and-value chips, tooltips and
  screen-reader labels. Hidden empty customer/contact fields and zero attachment count.
- Smaller padding/title, narrower popup; brief limited to four lines and latest message to
  three, with redundant repeated message omitted. Full ticket remains accessible via Open.
- Files: ticket-preview-button.tsx, shared icon-button.tsx and release-notes.ts.
- Checks: TypeScript, focused ESLint zero warnings, Prettier and diff check passed.
  Visual/browser QA not performed (previous browser URL-policy block). No new tests for
  this presentation-only change. No database writes, push or deployment.
- Next: refresh localhost and reopen a ticket preview for local acceptance.


## Ticket preview, timer clock and reply sender — 3 Oct 2026 (Codex, local only)

- Eye icon on desktop ticket rows, phone cards and the full ticket opens a native modal preview
  without navigating or marking the ticket read. Brief, latest permitted message, customer,
  agent, status, priority, queue, attachment count and logged time; Open full ticket link.
- New /api/tickets/[id]/preview checks sign-in, ticket.read.own, tenant scope and assignment
  unless ticket.read.all. Internal notes and their files are excluded without ticket.manage.
- TicketTimerButton now shows HH:MM:SS alongside Stop timer using the real startedAt.
- Reply to customer has Send from: current Standard sender stays default; configured Alert
  and Admin addresses are optional choices. Only address/name/role sent to the browser, no
  credentials. Selected configured role validated before saving; persisted in the email outbox
  for existing delivery routing. Internal notes ignore sender and never queue customer mail.
- Files: new ticket-preview-button, preview API, tickets/preview.ts, time/elapsed-clock.ts;
  icon-button, TicketTimerButton, ticket list/detail/reply UI, support actions, ticket and
  email services, release notes; new preview/clock unit tests; sender DB test added to ticket CC suite.
- Verification: TypeScript, focused ESLint zero warnings, formatting and diff check passed;
  full unit suite 17 files / 107 tests passed, including preview access/privacy and clock rollover.
- DB sender integration and browser/live-send QA NOT RUN. Previous browser policy and
  DB-test permission review timeouts remain unresolved. No customer mail sent; no push/deploy.
- Next: refresh localhost, check preview/open/close and timer start/stop; run
  `npx vitest run tests/database/ticket-collaborators.test.ts` on Mac (disposable test DB),
  then verify the configured sender on a disposable ticket before release.


## Customer creation and CC collaborators — 3 Oct 2026 (Codex, local only)

- New-ticket Customer dropdown now offers Create customer: requires name and valid email,
  saves a client customer and selects it while keeping the ticket draft. Editable later in CRM.
- Multiple CC collaborators on new/existing tickets; search active team/customer/branch contacts
  in the current tenant or enter an email. Explicit Save CC collaborators on existing tickets.
- Ticket ccEmails persist; public replies queue CC on EmailOutbox and SMTP sends them.
  Primary recipient is excluded from CC; duplicates normalize. Internal notes queue no customer
  mail. Customer email is the fallback recipient when no contact/requester email exists.
- Files: support actions, ticket list/detail/new-ticket UI, new collaborator-picker and
  collaborators-panel; tickets/collaborators.ts and collaborator.service.ts; Ticket and
  EmailOutbox models; ticket/email services; release notes; new unit/database test files.
- Verified: TypeScript passed; full unit suite 15 files / 101 tests passed; focused ESLint
  zero warnings; formatted changed source/tests; diff check passed.
- Database integration tests NOT RUN: automatic permission review timed out twice before
  launching tests. Run `npx vitest run tests/database/ticket-collaborators.test.ts` on Mac;
  harness forces disposable coex_test_ticket_cc_1003. No coex_dev writes or live emails sent.
- Interactive browser QA remains blocked by the previously reported browser URL policy.
- Next: restart local dev server to reload Mongoose schemas, run integration tests, then
  verify customer creation/editing and CC save/reply on a disposable ticket. No push/deploy.


## Ticket attachment picker — 3 Oct 2026 (Codex, local only)

- Fixed repeated file selection replacing earlier selections. Replies/internal notes and new
  tickets now share a click/drop area, accumulating files with icons, names, sizes and removal.
- Files: `src/components/ui/ticket-attachment-picker.tsx`, ticket `reply-box.tsx`,
  `new-ticket-panel.tsx`, and `src/modules/core/release-notes.ts` (What's new entry).
- Uses an accumulated FileList on the form's files input; the separate picker clears each batch.
  Form reset clears selection. Existing server limits remain; UI warns at 3 MB/file and 10 MB total.
- Verification: TypeScript, focused ESLint (zero warnings), Prettier and diff check passed.
  No database writes or customer replies sent. Browser automation rejected the local ticket
  URL under its URL policy; interactive drag/drop, sending and visual QA remain unverified.
- Next: refresh the local ticket page; add two files separately, drop another, remove one,
  and verify remaining attachments send using a disposable test ticket. No push/deploy.
- Earlier customer dropdown creation request remains pending implementation.


## Local QA — 3 Oct 2026 (Codex): customer creation from ticket dropdown

- Requested feature is absent at HEAD `ec2cd09`: `new-ticket-panel.tsx` lists No customer
  and existing customers, with no Create customer option. Requirement fails source inspection.
- No feature code changed. Working tree was clean before QA; Claude's channel work preserved.
- Checks run here: `npx tsc --noEmit` passed; `npm run test:unit` passed, 14 files / 98 tests.
  These are baseline checks, not verification of the missing feature. No database writes/tests.
- Started local `npm run dev` on port 3100 and requested the Tickets page in Codex's browser
  panel. Interactive browser QA and customer persistence/editing remain unverified.
- Next: implement Create customer in the new-ticket dropdown with name-only entry, select
  the saved customer, retain the ticket draft, and verify later editing in CRM. No push/deploy.


## Task origin built and merged — 1 Oct 2026 (Claude), deploy pending

- John: "I don't know who created and assigned the task to me." `createdById` existed but was
  never shown; assignments were not recorded anywhere (audit covered only title/priority/dates).
- Built: `assignments` on the task model; `assignmentsAfter` keeps it in step in createTask,
  updateTask, patchTask (ticket escalation goes through createTask); `taskOrigin` resolves names;
  `TaskOriginLines` (src/components/tasks/task-origin.tsx) on the task page, the My Desk preview
  and the task side panel (data from /api/tasks/[id]/panel). Assignee changes now audited.
  What's new `2026-10-01-d`. No migration: older tasks show the creator only.
- Tests: 3 new in tests/database/tasks.test.ts; full suite 219/219 on MongoDB 8.0; build,
  TypeScript, ESLint, Prettier pass. Browser: preview, task page and side panel show "Created by"
  and "Assigned to you by"; assigning someone in the form records the signed-in person as their
  assigner; no browser errors.
- John authorized Claude to finish and merge; John runs the server deploy (git pull etc.).

## Team history built — 1 Oct 2026 (Claude), live at dd037e6

- John's request: managers see everyone's My Desk Performance history. His choices: access by a
  new per-person permission `desk.read.all` (no role has it; platform admins hold all), and both
  a team table and a per-person view.
- Files: core/permissions.ts and permission-labels.ts (new permission, appears in Users and
  roles automatically); tasks/services/access.service.ts (`actorHasPermission`, read from the
  account); desk.service.ts (`listTeamDeskHistory`, refuses without the permission);
  app/(app)/my-desk/page.tsx, my-desk-tabs.tsx, team-history.tsx, format-desk-date.ts. Filters
  live in the address: `/my-desk?view=team&from=&to=&person=`.
- Deliberately NOT in What's new (John): only granted people use it, so it is announced to them
  directly. Do not add a release note for it; the newest entry stays `2026-10-01-b`.
- Tests: 4 new in tests/database/desk.test.ts (manager refused, tenant admin refused by role
  alone, granted sees all with person/date filters and no score, denial wins). Full suite
  216/216 on MongoDB 8.0; build passes; TypeScript, ESLint, Prettier pass.
- Browser (tenant admin): no tab and nothing via ?view=team without the permission; after a
  grant the tab, table by date range, person link to full history, Back to everyone, phone width
  without sideways scroll; tab gone after a denial; no browser errors.
- Merged as PR #2 and deployed at `dd037e6`. John grants the permission to chosen people in Users
  and roles.

## Deployed — 1 Oct 2026, 126767a (Claude)

- PR https://github.com/digisol-ae/COEX/pull/1 merged into main as `126767a` (CI green) and
  deployed by John: pull, npm ci, build, restart of coex-app, coex-mail and coex-desk-close with
  --update-env, pm2 save. VPS HEAD `126767a`; pm2 shows one of each, all online.
- Live now: Back arrow, task status picker on the task page, tooltips kept on screen, Personal
  and Space pages listing only their own tasks, What's new `2026-10-01-b`.
- Open item: `npm ci` on the VPS reports "1 critical severity vulnerability". Not investigated
  yet; never run `npm audit fix --force` on the server.

## START HERE — state at end of 1 Oct 2026 (Claude)

- **Live on the VPS:** `dd037e6` (Team history, PR #2).
- **Merged to main, deploy pending:** PR #3, task origin ("Created by", "Assigned to you by")
  plus docs. John deploys with the commands below; no migration is needed.
- **Next step:** John deploys; then whatever John chooses. John grants `desk.read.all` to chosen
  people. Open item: the critical npm audit finding reported by `npm ci` on the VPS. Channels
  (M6) is the next milestone.
- **Deploy (John runs, from his Mac terminal):**
  `ssh -i ~/Downloads/digisol-zabbix.pem digisol@194.163.137.54`, then
  `cd /srv/coex/app && git status --short` (must be empty),
  `git pull --ff-only && npm ci && npm run build`,
  `pm2 restart coex-app coex-mail coex-desk-close --update-env && pm2 save`, `pm2 status`
  (exactly three processes), `git rev-parse --short HEAD`. Never `pm2 start` an existing process.
  `git pull` saying "Already up to date" means the work is not merged into main yet.
- **How Claude QA'd from the cloud sandbox (reusable):** copy of the repo in a scratch folder
  (never `npm install` into the real folder), `npm ci` there; throwaway MongoDB in Docker
  (`docker run -d -p 27017:27017 mongo:8.0` for the test suite; 8.0 segfaults in that sandbox
  during long runs, so `mongo:7.0` for browser QA); `.env.local` pointing at it with fresh
  random secrets; `npx vitest run`; `npm run build`; `next start --port 3100`; `npm run seed`
  then Playwright with Chromium at /opt/pw-browsers. Stop the old server by its pid
  (`next-server`) before restarting, or a stale server serves a mismatched build.
- **Standing rules worth remembering:** one tooltip component (`GlobalTooltip`), never a CSS
  pseudo-element tooltip; every user-visible change gets a What's new entry; John runs server
  commands himself; keep replies short and commands-first.

## John feedback built and accepted — 1 Oct 2026, after deployment (Claude)

- Tooltips stay on screen: `src/components/ui/global-tooltip.tsx` now handles `data-tooltip` too,
  measures itself and clamps to the window; the `.has-tooltip::after` CSS in globals.css is gone.
- Back arrow on every screen: `src/components/navigation/back-button.tsx`, placed in the header
  by `src/app/(app)/layout.tsx`; new `back` icon in icon-button.tsx.
- Status picker on the full task page: `src/app/(app)/tasks/[id]/task-status.tsx` and
  `setTaskStatusAction` in tasks/actions.ts (uses `moveTask`, the board's service).
- What's new entry `2026-10-01-b`. FEEDBACK.md and CLAUDE.md updated.
- QA (Claude, cloud sandbox, throwaway MongoDB in Docker, never coex_qa/dev/production):
  full suite 21 files / 210 tests passed on MongoDB 8.0 (twice); production build passes (the
  4 known storage.ts warnings); TypeScript, ESLint (zero warnings), Prettier pass.
- Browser QA (Playwright, built app): sign in; My Desk > preview > Open task; status picker lists
  the Space's stages, changes To do > In progress with a confirmation and survives reload; Back
  returns to My Desk (also after a refresh); a page opened directly offers Back to dashboard;
  no arrow on the dashboard at the start; arrow fits at phone width; tooltips (Theme, Timers,
  floating timer, desk icon, Back, Open task over the preview dialog) and a long tooltip in all
  four corners stay inside the window; no browser errors. MongoDB 8.0 segfaults in the sandbox
  during long runs, so browser QA ran on MongoDB 7.0.
- Two defects found by that QA and fixed: tooltips never showed when the pointer was over an
  icon's SVG (pre-existing, hidden by the old CSS tooltips); Back forgot its trail on refresh
  (now kept per tab in sessionStorage).
- Accepted by John on 1 Oct 2026. Not deployed yet: merge to main, then deploy.

## Deployed and verified — 1 Oct 2026 (Claude)

- VPS /srv/coex/app is at 7afa81e, the same as GitHub main. John ran the deployment by hand:
  ff-only pull, npm ci and npm run build (only the four known storage.ts tracing warnings),
  then restarted coex-app and coex-mail with --update-env.
- coex-desk-close was already running, so `pm2 start` added a second copy. The extra copy was
  deleted, the remaining one restarted with --update-env, and pm2 save run again. pm2 now shows
  exactly one each of coex-app, coex-mail and coex-desk-close, all online. The desk-close
  worker logs "starting (office tz Asia/Dubai)". ".env.local not found" in its error log is
  harmless.
- https://coex.digisol.ae/login returns HTTP/1.1 200 OK.
- On future redeploys, run `pm2 restart coex-desk-close --update-env`; never `pm2 start` it again.
- The deployment blocker is cleared. The authorized Mac shutdown may proceed.

## Verified release outcome — 1 Oct 2026

- Release commit bd65e26dabadb97d9537a215512968e1e4f0484d is pushed to GitHub main.
- Exact release CI is green (install, types, lint, formatting, unit tests and production build):
  https://github.com/digisol-ae/COEX/actions/runs/36775161483
- Full isolated QA passed 208 tests; final unit run passed 79, and the final focused desk/status
  database run passed 5. Final source/build/browser checks are recorded below.
- VPS deployment did not happen: the documented SSH key is blocked by macOS privacy access;
  agent authentication failed, Terminal AppleEvents timed out, and Computer Use denied Terminal.
  No server configuration, processes or data were changed. Keep the existing authorized release
  deployment pending until John can resolve native SSH access.
- Mac shutdown was not performed because the requested deployment could not be completed and
  verified. Claude's next step is the deployment procedure below, then the authorized shutdown.
- A documentation-only follow-up records this outcome; use the source release SHA above to
  identify the tested feature bundle. Temporary QA env copy removed; real env files untouched.

## Release handoff — 1 Oct 2026 (Codex)

John approved QA, updating Claude's instructions, committing, pushing to GitHub, deploying
to the app server, then shutting down the Mac. This release is ready locally; VPS access
is blocked. No shutdown until deployment is verified.

### Delivered
- After today's first saved snapshot, My Desk says **Update today’s summary**.
- One status per task; statuses are configurable per Space in Space settings, shared by
  Board/List/Gantt. Add, order and remove stages; choose exactly one completed stage.
  Used stages cannot be renamed/removed or change completion meaning until their tasks move.
  Completion uses isClosed, never guesses from names such as "Incomplete".
- Shared table headings toggle ascending/descending sorting, with Reset sort. Explicit
  numeric/date values sort hours and dates correctly. Task/subtask row groups stay together;
  sorting preserves React row state and disables manual dragging until reset.
- All Timesheets shows Monday–Sunday hours for the selected week alongside weekly totals.
  Timesheet export/person navigation preserves the local week date instead of slicing UTC.
- Desk icons with tooltips add/remove the signed-in person's eligible tasks from lists,
  boards, detail panels/pages, dashboard, timesheets, linked tickets and global search.
  Checked icon indicates selection. Adds are idempotent and service-enforce assignment.
- My Available Tasks titles open an in-place native modal preview with loaded description,
  dates, status, time, tags, documents and subtasks. Open task icon navigates only if requested.
- Includes earlier local Performance History, office close scheduling/retry, mobile and Entra
  preparation. Entra remains inactive without the secret and exact production callback.
- Formatting cleanup resolves the pre-existing CI formatting failures.

### Verification
- Full suite: 21 files / 208 tests passed in 572.32s using isolated
  coex_test_8d3b94_* databases. Shared coex_qa, coex_dev and production were untouched.
- Final unit run: 79 passed. Final focused desk/status DB run: 5 passed in 64.33s.
- TypeScript, ESLint with zero warnings, CI Prettier check, production build and diff check pass.
- Local Codex browser functional QA (no screenshots): updated confirmation label; available
  task preview loads and closes without navigation, Open task link; daily week columns;
  timesheet numeric ascending/descending order; custom status add/edit/cancel; Space list
  heading sorting and eligible desk icons. Read-only checks did not change existing task data.
- Existing storage tracing warnings remain. Pixel/device visual QA was not performed.

### Claude's next action
1. Confirm the newest GitHub main commit and CI result; this session commits/pushes after
   this handoff is written. Preserve all unrelated work and never commit env/credentials.
2. Deployment is authorized, but Codex could not authenticate: macOS denied reading
   ~/Downloads/digisol-zabbix.pem. SSH-agent fallback also failed. Terminal automation timed
   out and Computer Use denied Terminal access for safety reasons. Use John's authorized
   native terminal after the local permission issue is resolved; do not bypass safety controls.
3. Follow deploy/DEPLOYMENT-STATUS.md (Apache + pm2, /srv/coex/app, port 3001), not DEPLOY.md.
   Check remote HEAD and dirty state, pull with --ff-only, npm ci, build, restart coex-app and
   coex-mail. Start/restart coex-desk-close and pm2 save. Do not alter Entra secrets/settings.
4. Verify target SHA, all three pm2 processes, HTTPS login and the deployed My Desk/status/
   timesheet behavior. Update deployment status and this handoff with the result.
5. Only after deployment succeeds, carry out the authorized Mac shutdown. Until then leave it
   running. No OS patching or Apache changes are part of this release.

## Local fixes — 1 Oct 2026 (Codex)

- Continue locally only. John questioned server access; no SSH or live-server operations were
  performed in this continuation.
- Desk-close now schedules 23:59:59 in OFFICE_TZ (default Asia/Dubai), prevents overlapping
  closes, and retries failures after 30 seconds without advancing its completed date.
- Failed users are reported while other users continue. Retries preserve the original close
  timestamp and office workDate even after midnight. Desk scoring uses office-day boundaries
  and the close timestamp rather than the host timezone/current retry time.
- Save confirmations now close panels in action callbacks rather than effects. Board folder
  navigation and task-form refresh synchronize state during render when their input changes.
  Fixed unescaped quotes and hook/unused warnings.
- Validation: 69 unit tests pass, including six new scheduler/service regressions; ESLint
  has 0 errors and 0 warnings; TypeScript and the normal production build pass. The temporary
  build failed on symlink resolution; the actual checkout build passed. Existing storage
  tracing warnings remain. git diff --check passes.
- The 30 Sep full database QA result remains 189/189 on coex_qa, predating these fixes; it
  was not rerun in this continuation. No browser/device QA performed.
- All changes remain local and uncommitted. No push or deployment. Next: local My Desk
  regression QA (same-day accumulation, carryover and history) against coex_qa.

## Verified continuation — 30 Sep 2026 (Codex)

- Live login at https://coex.digisol.ae/login returns HTTP 200. Local HEAD and GitHub main
  both resolve to 0f5e858; newer local work remains uncommitted.
- Full QA on a temporary copy of the current working tree, with the test harness restricted
  to exactly coex_qa: **16 files, 189 tests passed**, 531.08 seconds. No test writes to coex_dev.
  Unit-only run: 63 passed. TypeScript and production build pass.
- Latest GitHub CI at 0f5e858 failed with 13 lint errors and 3 warnings:
  https://github.com/digisol-ae/COEX/actions/runs/36519498320
- Review blockers in the local desk-close worker: it triggers during 23:59 rather than at
  the requested 23:59:59, and sets lastClosedDate before success, preventing same-day retries.
  closeOfficeDay also suppresses per-user errors. No fixes made during this QA continuation.
- SSH process/revision verification was blocked: macOS denied reading the documented key
  (Operation not permitted). VPS commit and coex-desk-close status remain unverified.
- Next: fix and test desk-close timing/retry handling and CI lint; verify VPS HEAD and pm2
  processes from John's terminal. No commit, push or deployment performed.

## Current Handoff — 29 Sep 2026, Codex

### Follow-up: My Desk history (local, not yet committed)

- My Desk now has **Today's desk** and **Performance history** tabs. History is visible only to
  the signed-in user and shows their saved daily snapshot date, desk-task count, on-time,
  overdue, tomorrow and due-soon counters.
- Numeric score remains stored internally but is not shown anywhere; John is deciding the final
  performance algorithm.
- `npm run build` passed. The existing four `storage.ts` Turbopack tracing warnings remain.
- Do not push/deploy this follow-up until John asks. Once approved, commit the four feature files
  plus these handoff updates, push, then redeploy both `coex-app` and `coex-mail`.
- Snapshot policy agreed by John: ordinary users never edit history. Re-running “I am done” on
  the same date refreshes that date's snapshot. Historical corrections, if built later, are
  administrator-only and require a reason plus an audit record.
- Built (local, 29 Sep 2026): confirming "I am done" archives completed desk tasks into that day's
  Performance History and removes them from the active desk; incomplete tasks stay for the next
  day, condition recorded; same-day confirmations accumulate. The `coex-desk-close` worker closes
  the day automatically at 23:59 office time. Test time.test.ts:261 also fixed. Not pushed.
- QA 30 Sep: `npm run check:db` connected successfully. The corrected single database test passes
  after resetting only `coex_test_time`. The full Vitest runner did not reach a final summary in
  this Codex execution environment; it was terminated early. Run `npx vitest run` in the Mac
  terminal before approving a commit or deployment.

- CRM rail follow-up: active highlight now matches every route in the shared CRM navigation group (Customers, Products, Contracts, Leads, Opportunities and their detail routes), rather than only /customers. Browser verified Opportunities has aria-current=page and rail-glow after reload; focused lint/diff checks pass.

- Module highlight follow-up: shared rail matching now covers every grouped rail destination (Support including Desk report, CRM, Time and Setup); Personal maps to Tasks, while Tasks and Spaces remain distinct. Existing sidebar already selects the most specific page. Thirteen route regression cases and focused lint pass; browser verified Support remains active on Desk report. Local only.

- Compact filters/info follow-up: the shared PageHeader now moves plain explanatory descriptions into a keyboard/hover info tooltip. Record identity/status/term descriptions stay inline via descriptionInline or rich description content. Customers now uses this shared pattern instead of a one-off icon. Shared coex-filters rules size search inputs176px, selects144px, date inputs160px without flex growth; the customer two-column176/112px override remains. Added missing compact markers to Desk report/Time period picker/portal ticket filters and enabled shared tooltip renderer in portal. Browser verified Support widths176/144px and Opportunities widths176/144px plus keyboard tooltip text. Typecheck/lint and final Webpack production build (54 routes) passed. No data mutations or production deployment.

- My Desk icon (21 Oct): replaced reused task/checklist icon with chair-and-desk SVG based on John’s supplied reference. Uses currentColor/shared rail state for Dark/Light/Sunset; same shared RailLinks serves desktop and mobile menu. Browser confirmed24×24 vector with chair wheels and currentColor stroke; focused ESLint/diff checks passed.

- My Desk heading now uses the same shared DeskIcon as the navigation rail at36px (rail18px), placed left of the page title. Browser confirmed36×36 and currentColor; focused lint/diff checks passed.

- My Desk page icon follow-up: moved36px header icon to far-right action area and rotated180deg at John’s request. Navigation icon unchanged. Browser confirmed180deg; focused lint/diff checks pass.

- Clarification: My Desk far-right icon uses horizontal mirror (scaleX -1), not upside-down rotation. Icon remains upright; browser verified rotate none / scale -1,1. Supersedes preceding180deg rotation note.

- My Desk header icon width increased10% (mirrored scaleX -1.1); height remains36px. Browser confirmed39.6×36px.

- Add/Remove My Desk action now uses the supplied person-behind-table reference as a currentColor SVG. Shared DeskTaskButton keeps its existing plus/check state and behaviour; page/rail chair icon unchanged. Browser verified new person geometry on desk action buttons; focused lint/diff pass.

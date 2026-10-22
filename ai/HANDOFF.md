# COEX — AI Handoff

## COEX logo approved and wired in — 22 October 2026

John approved the draft logo and asked that it work in Sunset, Light and Dark. The shared `CoexLogo` component (`apps/web/src/components/ui/coex-logo.tsx`, inline SVG) now replaces the DigiSol image in the desktop sidebar, phone menu drawer and both login/recovery logos (`auth-shell.tsx`). Coral `--color-brand-red` letters; the small dot follows `--color-ink-subtle` and `--color-surface`. `apps/web/src/app/icon.svg` (the monogram) is the browser-tab icon. Fixed a clipped "c" in the earlier draft viewBox (now `-16 216 1508 384`, also in `public/brand/coex-logo.svg`).

Checked: static render on the Sunset/Light sidebar, Dark sidebar and always-dark login panel backgrounds. **Not run:** typecheck, lint, build or in-app browser check (no `node_modules` in the cloud sandbox). No What's new entry (a new entry reopens the drawer for everyone; John to decide). **Still open:** Teams icons and ZIP still use the old artwork; regenerate and re-validate the manifest (SHA256 will change). `projects/` and the DigiSol PNGs are untouched.

**For ChatGPT, in order (John asked you to build the rest yourself):**
1. On John's Mac run workspace typecheck, lint, unit tests, Prettier and the production build; fix anything the logo change broke (new files: `components/ui/coex-logo.tsx`, `app/icon.svg`).
2. Check the logo in the running app in Sunset, Light and Dark: desktop sidebar, phone drawer, login and forgot/reset-password pages, and the browser-tab icon.
3. Regenerate the Teams icons from `apps/web/public/brand/coex-monogram.svg` (192×192 colour with alpha, 32×32 outline), rebuild `COEX-Teams-1.0.0.zip`, validate the manifest, and record the new SHA256 in `CLAUDE.md` and `ai/RELEASE-2026-10-22-TEAMS.md`.
4. Ask John whether the logo gets a What's new entry before adding one.
5. Record the final logo decision in `CLAUDE.md`. Claude has not pushed to `main` or opened a PR; the work is on `claude/sleepy-faraday-ijs3cj`.

## COEX logo draft — 22 October 2026 (Claude → ChatGPT)

Owner (John) said the COEX logo is **not final** and asked Claude to design the first version. Claude made two draft SVGs in `apps/web/public/brand/`, in the DigiSol sister-brand style (coral `#EE3E51`, rounded geometric strokes, same pill dot as `logo-long.png`):

- `coex-logo.svg`: lowercase "coex" wordmark, built from stroked paths (no font dependency), viewBox `40 200 1440 410`.
- `coex-monogram.svg`: white "c" with a solid dot in its opening (co-existence) on a coral rounded square, viewBox `0 0 512 512`.

Pushed to branch `claude/sleepy-faraday-ijs3cj` (commit "feat(brand): add draft COEX wordmark and monogram SVGs"); no PR, not merged to `main`, not deployed. Checked only by rendering in headless Chromium; no theme (Light/Dark/Sunset) or in-app check.

**Not done on purpose:** the app still uses the DigiSol assets (`logo-long.png`, `monogram.png`). Sidebar, login (`auth-shell.tsx`), phone menu, user menu and the Teams icons (192×192 colour, 32×32 outline, ZIP `COEX-Teams-1.0.0.zip`) are unchanged. No What's new entry.

**Next:** wait for John's approval or changes to the design. After approval: wire the logo into the components above, regenerate the Teams icons and ZIP (the SHA256 `2b0fe5e7…` will change; re-validate the manifest), and record the final logo in `CLAUDE.md`. Do not treat the draft as final before then.

## Teams backend and policy deployment verified — 22 October 2026

Owner authorised complete rollout with guided explanations. Application PR #26 merged as `77e84585ce0626aa8f9dbcddf5bb2518ec5bb5ab`; PR CI https://github.com/digisol-ae/COEX/actions/runs/39721227941 and main CI https://github.com/digisol-ae/COEX/actions/runs/39721496951 passed. Local full workspace types/lint, 40 unit files / 249 tests, formatting, Microsoft Teams manifest schema and local/server builds passed; server native Turbopack build generated 67 pages.

Server `/srv/coex/app` clean at application SHA after deploy, four expected PM2 processes online with no duplicates and one additional restart each (cumulative restart count 2). Backup before release: `coex-2026-10-22-0813.archive.gz` (481K), `files-2026-10-22-0813.tar.gz` (14M), under `/srv/coex/shared/backups` (server timestamp). Teams environment configured without exposing credentials; draft secret generated privately, prior environment backed up mode 600. Existing Microsoft sign-in issuer matches directory; active linked-account count 8. Production dependency audit: 0 vulnerabilities; all-dependency report has 8 development findings (2 moderate, 6 high), no forced upgrades.

Live verification: https://coex.digisol.ae/privacy, /terms and /login return 200; operator Digisol LLC-FZ, contact info@digisol.ae and public policy links verified. Teams endpoint returns 401 for well-formed unsigned invoke (configured and refusing unauthenticated access). No real Teams invoke/task creation yet. ZIP `/Users/syedali/Downloads/COEX-Teams-1.0.0.zip` prepared; SHA256 `2b0fe5e748e09a271c6bb5f4d536fd65d52dbcef0b573d7f54fd7e9a150ce72d`. Microsoft schema validation passed, Developer Portal/client installation acceptance remains pending.

Next: user installs ZIP through Teams approved custom-app process, then validate actual message action, linked staff identity, destination/eligible assignee, one saved task/source link and duplicate prevention. Native browser automation unavailable; no visual/Teams end-to-end claim. Public policy deployment completes; **Teams installation and functional pilot remain open**. No separate `projects/` files committed. File-type explanations are in `ai/RELEASE-2026-10-22-TEAMS.md`; implementation/operating guides in `docs/MICROSOFT-TEAMS.md` and `docs/LEGAL-PAGES.md`. Subsequent docs-only pull requires no application rebuild/restart.

## Public Privacy Policy and Terms — 22 October 2026

Owner requested both policies and supplied legal operator **Digisol LLC-FZ**, contact **info@digisol.ae**. Added public `/privacy` and `/terms`, shared responsive policy layout and login/recovery footer links. Copy covers COEX and Teams data/use, actual archive/retention limits, permissions and existing-agreement precedence without invented legal jurisdiction or certification. Teams package defaults to these URLs and uses the legal publisher name. [Edit/rebuild guide](../docs/LEGAL-PAGES.md) records authoritative files and decisions; Microsoft Teams guide records user-reported Azure configuration and public app/directory IDs.

Local web typecheck, focused ESLint, formatting and Webpack production build passed (67 pages). Signed-out HTTP checks passed for both policies and login, including operator/contact/date/navigation. Browser visual QA unavailable. Local Teams ZIP regenerated with real public app ID and production policy URLs, but production URLs are not deployed/verified. No commit/push/deploy, live task or Teams installation. Existing `projects/` remains untouched.

## Microsoft Teams task integration — 22 October 2026

User approved starting Teams message → COEX task integration. Local branch `codex/teams-create-task` adds a verified invoke endpoint, destination-first Adaptive Card form, eligible assignees, title/description/priority/due date, original message link and Open in COEX confirmation. Uses existing linked Entra staff identity, pinned Microsoft/COEX tenant, active account/task permission checks, private Space/Folder visibility and assignment rules. Signed 15-minute drafts and unique submission receipts prevent duplicate creation from retries; uncertain outcomes require checking task list before a new form.

Validation: existing unit suite plus Teams protocol/service tests **39 files / 244 tests passed**; additional Teams HTTP boundary tests **5/5 passed**. Web TypeScript, focused ESLint, Prettier and production Webpack build passed (**65 pages**, new Teams route included). Test package generated with synthetic public IDs/URLs; colour/outline icons verified 192×192 and 32×32 with alpha. No live MongoDB/Teams end-to-end acceptance or Developer Portal validation yet.

Setup and limits: [Microsoft Teams guide](../docs/MICROSOFT-TEAMS.md). Needs Microsoft single-tenant bot registration/channel, actual public privacy/terms pages, server environment configuration and pilot app installation. Missing config disables endpoint. No Graph/chat-history access, attachment copying or automatic chat posting. No secret changed, real task created, commit/push/deployment or Microsoft resource created. Existing untracked `projects/` preserved. What's new entry deferred until activation because this integration is not yet available to users.

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

## Fresh-session handoff — 21 October 2026

Read [START-HERE](START-HERE.md) → [compact context](CONTEXT-2026-10-21.md) → [current task](CURRENT_TASK.md). This supersedes the long incremental notes; history is preserved in the [pre-compaction archive](archive/2026-10-21-pre-compact/).

Implementation/QA guides:

- [Shared UI and icon refinements](../docs/UI-STANDARDS.md)
- [Tabbed Setup workspace](../docs/SETUP-WORKSPACE.md)
- [Contractual/subscription CRM](../docs/CRM-SERVICE-MODELS.md)
- [Customer portal](../docs/CUSTOMER-PORTAL.md)
- [20 October full QA](../docs/qa/QA-2026-10-20.md)
- [dOne project](../projects/done-coex-integration/README.md)

Work remains local/uncommitted. Verify Git and preserve the dirty bundle. Latest full build/static checks belong to Setup milestone; subsequent small icon/label checks are separately bounded in compact context. Prior QA findings remain last-observed, not freshly verified. No production release state inferred.

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

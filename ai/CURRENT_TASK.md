# COEX — Current AI Task

> **1 Oct 2026, John feedback (Claude, local, not committed):** Task preview now closes with an X
> icon (new `close` icon). New `GlobalTooltip` in the app layout gives a styled tooltip on every
> screen for any `title` and any icon-only control with an `aria-label`; My available tasks rows
> say "Click to preview, or drag onto My Desk". Removed the "score is being refined" sentence.
> Priority flag 12px to 16px with stronger colour; desk icon 18px to 22px. tsc, eslint, prettier pass.

## John feedback built — 1 Oct 2026, after deployment (Claude)

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
- Not deployed; needs John's review and a merge to main.

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

> **>>> HANDOVER TO CHATGPT (Codex), 29 Sep 2026 <<<**
> Claude did two things this session, both local and uncommitted. Please pick up from here.
>
> **Next action for you (Codex):** run the full QA and confirm it is green.
> `npx vitest run` on the Mac (native) or on a Linux checkout with a fresh `npm ci`. Claude could
> not run vitest from the bridge VM: the mounted `node_modules` holds the Mac's native rolldown
> binding, so the Linux VM throws `Cannot find module './rolldown-binding.wasi.cjs'`. Expected
> result now: 189 pass (was 188 pass / 1 fail, and that 1 was the test fixed below).
>
> **What Claude changed (local only, not committed, not pushed, not deployed):**
> 1. `tests/database/time.test.ts` "moves an entry to another day" (line ~261): was date-fragile,
>    failed on Mondays because "yesterday" is in the previous week. It now loads the week that
>    contains the moved entry. App logic in time.service was already correct.
> 2. "I am done" archival in `src/modules/tasks/services/desk.service.ts`: `finishMyDesk` now
>    archives completed desk tasks into that day's snapshot and removes them from the active desk;
>    incomplete tasks stay for the next day with their condition recorded; same-day confirmations
>    accumulate (union of archived task ids), they do not overwrite. Shared `isDeskTaskDone` added.
> 3. New `src/modules/tasks/services/desk-close.service.ts` (`closeOfficeDay`) and
>    `scripts/desk-close-worker.ts` (pm2 `coex-desk-close`, `npm run desk:worker`, `OFFICE_TZ`
>    default Asia/Dubai) run the close automatically at 23:59 office time.
> 4. `package.json` gained the `desk:worker` script. `deploy/DEPLOYMENT-STATUS.md` documents the
>    new pm2 process. `npx tsc --noEmit` passes.
>
> **Waiting on John (do not proceed without him):**
> - Entra client secret. Place `AUTH_MICROSOFT_ENTRA_ID_SECRET` in the VPS env (never in chat or a
>   commit), add redirect URI `https://coex.digisol.ae/api/auth/entra/callback` in Azure. App ID
>   and Tenant ID are already configured. Env vars the code reads: `AUTH_MICROSOFT_ENTRA_ID_ISSUER`,
>   `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `AUTH_URL`.
> - Explicit approval to commit, push and deploy. Admin-only historical corrections remain deferred.


> **29 Sep 2026 done (Claude, local only):** Two items completed.
> 1. Test fix: `tests/database/time.test.ts` "moves an entry to another day" was date-fragile
>    (it failed on Mondays, because "yesterday" falls in the previous week). It now loads the week
>    containing the moved entry. The app logic in time.service was correct; only the test changed.
> 2. "I am done" archival: `finishMyDesk` now archives completed desk tasks into that day's
>    Performance History and removes them from the active desk. Incomplete tasks stay on the desk
>    for the next day, with their current condition recorded in the same snapshot. Same-day
>    confirmations accumulate (union of archived task ids); they do not overwrite. New
>    `closeOfficeDay` service and `scripts/desk-close-worker.ts` (pm2 `coex-desk-close`,
>    `npm run desk:worker`, OFFICE_TZ default Asia/Dubai) run the close at 23:59 office time.
>    Admin-only historical corrections remain deferred. `npx tsc --noEmit` passes. Not committed,
>    not pushed, not deployed, awaiting John's approval.


> **29 Sep 2026 — current local work:** My Desk now has a **Performance history** tab. It lists
> the signed-in user's saved daily desk snapshots (date, selected-task count and operational
> counters), while deliberately hiding the numeric score until John approves its algorithm.
> `npm run build` passes. This follow-up is local only: commit, push and VPS deployment require
> John's next explicit approval.

> **Decision, 29 Sep 2026:** Do not add normal History editing. Same-day “I am done” refreshes
> that day's snapshot after live-task corrections; prior dates are immutable. Any later admin
> correction must require a reason and write an audit trail.

> **New feedback, 29 Sep 2026 (pending implementation):** “I am done” should archive completed
> desk tasks into that day's Performance History and remove them from the active desk. Multiple
> confirmations on one day must accumulate, not overwrite. An automatic 23:59:59 office-day close
> should create/update the daily snapshot. John decided incomplete desk tasks remain on My Desk
> for the next day; their prior-day condition stays recorded in history.

> **Mobile update, 29 Sep 2026:** Shared task lists now render compact cards on phones instead of
> a wide table. Titles, Space and Folder labels truncate with an ellipsis rather than extending
> off-screen. This covers All tasks, Personal and My Desk. `npm run build` passes.

> **Entra SSO preparation, 29 Sep 2026 (local, not activated):** COEX now has a Microsoft Entra
> authorization-code + PKCE flow at `/api/auth/entra`, returning through
> `/api/auth/entra/callback`. It verifies Entra's signed ID token, creates the existing COEX
> session and audits the sign-in. Only one existing active COEX user with the matching email can
> link/sign in; no account is created automatically. Activation needs the production Entra Client
> ID, Tenant ID in the issuer, Client Secret on the VPS and the exact redirect URI below.
> John supplied the production Application ID `5f29d831-1d5b-463a-845d-4da36c7e2394` and Tenant
> ID `3788e905-c187-4e8b-bafb-84b7e0ec3f1c`; they are now configured locally. The client secret
> is currently empty and must be created/entered privately before a real sign-in test.

> **QA, 30 Sep 2026 (Codex):** The corrected `moves an entry to another day` test passes in a
> freshly reset `coex_test_time` database. The configured database connection is healthy. The
> full Vitest runner is terminated by this execution environment before producing a final summary,
> so run `npx vitest run` in the Mac terminal before approving a commit/deployment.

> **29 Sep 2026 — release handoff:** Commit and deploy the approved local feature bundle. After
> deployment, smoke-test Personal privacy, My Desk task add/remove and daily confirmation, and
> standard create/save confirmations. My Desk's numeric score is deliberately hidden until John
> defines the final performance algorithm.

> **QA update — 29 Sep 2026 (Codex):** Full `npx vitest run` on the 28 Sep temporary QA snapshot, configured for `coex_qa`: 188 passed, 1 failed. Failure: `tests/database/time.test.ts:261`, “moves an entry to another day”; `after.entries[0]` is undefined when reading `workDate`. No fix made, no push or deployment. Next: investigate this test failure.

> **Current task — 28 Sep 2026: handed to ChatGPT.** Read ai/HANDOFF.md "Current Handoff — 28 Sep
> 2026" first: it lists what was built, what is pushed (`a71cee8`) and what is only local (What's
> new and the database reconnect fix), what was not tested because the Mac's connection to Atlas
> kept dropping, and the open items. First steps: run `npx vitest run` once the connection is
> stable; check the What's new drawer on the local server; then ask John what is next. No new
> features without his approval, and do not push or deploy without being asked.

> **Current task — 26 Sep 2026, afternoon (Claude):** Batch C, frosted-glass popups and icon
> buttons are built, pushed (7c36801) and accepted by John on the local build. John deploys to
> coex.digisol.ae himself. 27 Sep: themes (Dark, Light, Sunset), bold menu headings and the
> current-page highlight (1108cf1), and the avatar profile menu with a profile page; committed
> locally, not pushed, because John said he pushes himself. Scope and John's answers: FEEDBACK.md item 1 and CLAUDE.md decision 18.
> Other offers still open: the once-an-hour acknowledgement rule, watching the Junk folder, the
> storage.ts build warnings, a Prettier pass, the four older lint errors (row-actions.tsx,
> board.tsx, task-form.tsx), and "Unknown task" for ticket time in the timesheet edit form.

> **Current task — 24 Sep 2026, evening (Claude):** John accepted M4, M5, the board and task
> panel work and the September support baseline, and approved commit, push and deploy. Built
> today, uncommitted until John runs the commands: QA fixes (escalation link, phone drawer),
> assignee restriction (Space/Folder members for tasks, task assignees for subtasks) and the
> 148x50 mobile logo. Cutover (M8) starts 25 Sep. Awaiting John's choice on email delivery
> (IMAP IDLE worker recommended). Gantt export left for ChatGPT. See FEEDBACK.md "Decisions
> from John, 24 Sep 2026".

> **Current task — 24 Sep 2026:** Post-implementation QA and handoff. The Batch B description
> below is historical; Space visibility is implemented. The local branch is committed for
> Claude to continue, with no GitHub push or deployment approved.
>
> Claude's next steps: (1) retest the phone header menu, timer tray and sign-out after refreshing
> the LAN URL; (2) test a ticket escalation → Task work update → Task completion and confirm both
> updates remain internal notes on the ticket; (3) get John's acceptance of Status/Priority text
> and mobile ticket cards; (4) only then plan a scoped push/deployment. Do not schedule inbound
> email polling until John confirms a frequency and the app-server setup.

**Update, later on 24 Sep (Claude):** QA found and fixed two defects: escalation never set
`sourceTicketId`, so no Task update reached its ticket; and the phone menu drawer was confined to
the header by its backdrop blur (now portalled to `<body>`). John retested and accepted. Next:
John commits locally; push and deployment still need his separate approval. No new features
until he approves them.

## Historical Task — 2026-09-23

Batch B: space visibility (option B, chosen by John on 22 Sep 2026) and the matching
private-folder / private-space assignment rules. Reference: `FEEDBACK.md`, items B1 and B2.

## Objective

A space with no members named on it is open to the whole tenant. Name members and it becomes
private to exactly those people, a tenant administrator excepted, the same rule already governing
folders one level down. This must be enforced everywhere a space or its tasks can be read or
written, not just on the spaces list page.

## Current Stage

Service layer complete and verified for internal consistency. Actions layer and all UI not yet
started. See `ai/HANDOFF.md` for the full, current, line by line state.

## Important: nothing below is committed or pushed

`origin/main` is at `4b1104d`. Everything under "Completed" below exists only as uncommitted code
in Claude's working sandbox for this conversation. It is not retrievable from GitHub.

## Completed (uncommitted, local only)

- `src/modules/tasks/services/access.service.ts` (new): shared `actorIsAdministrator()`.
- `folder.service.ts`: refactored to use the shared helper. Behaviour unchanged.
- `space.service.ts`: `visibleSpaceIds`, `visibleSpaceFilter`, `canOpenSpace`,
  `assignableSpaceMemberIds` added. `listSpaces` and `getSpace` now enforce visibility.
  `createSpace` accepts `memberIds`. The dead `renameSpace` (zero callers, no UI) replaced with a
  full `updateSpace`, including the same stranded-assignee guard `updateFolder` already has.
- `task.service.ts`: `listTasks` and `getTask` now also respect space visibility, not just folder
  visibility. `assertAssignable` now checks space membership too, at all four call sites.

## In Progress / Not Started

- `actions.ts`: `createSpaceAction` needs `memberIds`; a new `updateSpaceAction`; a "private to
  me" flag on `quickAddFolderAction` for B2.
- UI: members field on `NewSpacePanel`; a new space settings panel (none existed before); a
  "private to me" toggle on the folder quick-add bar; a minimal manage-access panel for existing
  folders (none existed before either).
- Deferred, documented, not silently dropped: the subtask assignee dropdown is not yet restricted
  by space membership, only by folder membership. Not a visibility leak, only a cosmetic gap.

## Important Safety State

No code has been committed or pushed as part of Batch B. Do not assume it exists in the repository
without checking; verify against `git log` and `git status` first.

The Batch A cleanup (`batch-a-board-fixes.patch`, `readme.txt`) is long finished and needs no
further attention.

## Next Step

Finish the actions layer, then the UI, in the order listed above, then produce a verified patch
for John to apply, build, commit, and push.

## Owner

John

## Active AI

Claude — Batch B implementation

# COEX — AI Handoff

## Team history built — 1 Oct 2026 (Claude), not deployed

- John's request: managers see everyone's My Desk Performance history. His choices: access by a
  new per-person permission `desk.read.all` (no role has it; platform admins hold all), and both
  a team table and a per-person view.
- Files: core/permissions.ts and permission-labels.ts (new permission, appears in Users and
  roles automatically); tasks/services/access.service.ts (`actorHasPermission`, read from the
  account); desk.service.ts (`listTeamDeskHistory`, refuses without the permission);
  app/(app)/my-desk/page.tsx, my-desk-tabs.tsx, team-history.tsx, format-desk-date.ts. What's new
  `2026-10-01-c`. Filters live in the address: `/my-desk?view=team&from=&to=&person=`.
- Tests: 4 new in tests/database/desk.test.ts (manager refused, tenant admin refused by role
  alone, granted sees all with person/date filters and no score, denial wins). Full suite
  216/216 on MongoDB 8.0; build passes; TypeScript, ESLint, Prettier pass.
- Browser (tenant admin): no tab and nothing via ?view=team without the permission; after a
  grant the tab, table by date range, person link to full history, Back to everyone, phone width
  without sideways scroll; tab gone after a denial; no browser errors.
- Next: merge PR #2 and deploy (normal deploy commands; no data migration). Then John grants the
  permission to the chosen people in Users and roles.

## Deployed — 1 Oct 2026, 126767a (Claude)

- PR https://github.com/digisol-ae/COEX/pull/1 merged into main as `126767a` (CI green) and
  deployed by John: pull, npm ci, build, restart of coex-app, coex-mail and coex-desk-close with
  --update-env, pm2 save. VPS HEAD `126767a`; pm2 shows one of each, all online.
- Live now: Back arrow, task status picker on the task page, tooltips kept on screen, Personal
  and Space pages listing only their own tasks, What's new `2026-10-01-b`.
- Open item: `npm ci` on the VPS reports "1 critical severity vulnerability". Not investigated
  yet; never run `npm audit fix --force` on the server.

## START HERE — state at end of 1 Oct 2026 (Claude)

- **Live:** VPS and GitHub main are at `126767a` (PR #1 merged and deployed). pm2: one each of
  coex-app, coex-mail, coex-desk-close, all online.
- **Waiting:** PR https://github.com/digisol-ae/COEX/pull/2 (Team history on My Desk, plus the
  deployment notes). Built and tested; merge, then deploy.
- **Next step:** merge PR #2 and deploy. Open item: the critical npm audit finding on the VPS.
  Channels (M6) is the next milestone.
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

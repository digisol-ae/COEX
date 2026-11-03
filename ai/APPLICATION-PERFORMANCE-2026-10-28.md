# Application performance changes — 28 October 2026

Status: implemented and verified locally; production unchanged. No commit, push, release, traffic switch or production business-data mutation was performed for this implementation. Existing unrelated changes in this checkout were preserved.

## Confirmed issue and scope

Production diagnostics found 432 tenant accounts, including 420 customer portal accounts and 12 staff. Operational screens reused an administrative account lookup. This was unnecessary loading; it did not establish the cause of the team's freezes. Earlier Apache upstream connection resets remain a separate diagnostic finding. See `PRODUCTION-PERFORMANCE-CHECK-2026-10-28.md`.

## Implemented changes

- Added a tenant-scoped, soft-delete-aware staff summary lookup with only id, name, email, role and status. Replaced administrative account lookups throughout Tasks (list/detail), My Desk, Personal, Spaces (list/detail), Tickets (list/detail), queue setup, Leads, Opportunities and timesheets/team activity. Users and roles retains the full administrative list. Default staff reads retain suspended/invited historical names; active-only reads are available where required. No cross-request account cache was added.
- Added server-side checks for new assignments and space/folder/queue membership: only active staff in the current tenant can be newly selected. Unchanged historical assignments are retained. CRM ownership checks also exclude customer accounts and deleted users.
- Added lightweight customer choices/search. These do not fetch contact/site counts or full customer records. Full Customers list uses two scoped grouped count queries instead of two counts per customer; deleted/foreign records remain excluded.
- Batched dashboard counts by space and assignee. Five fixed tile counts remain; per-account/per-space count loops are replaced by two aggregations. Agent-scoped aggregation explicitly casts ObjectIds, and multi-assignee work is counted correctly within that scope.
- Batched task reads for space/folder counts and open-ticket counts for queues. Query count no longer grows by one per displayed space/folder/queue. Task projections only load count/progress fields.
- Independent page reads run concurrently under the same tenant context, including task/ticket/customer details and setup screens. Permission-dependent reads retain their existing conditions.
- Disabled eager route prefetch for shared navigation, icon links and ticket-preview navigation. Navigation now loads destinations on demand, reducing unused RSC page loads; a first click may take longer than a prefetched click.
- Shared LiveRefresh now uses a 30-second interval, prevents overlapping focus/timer/manual refreshes, throttles focus refreshes, and pauses automatic refresh while hidden, offline, editing or in a modal. Manual refresh remains available and shows pending state. Nonmodal floating Timers does not pause refresh. This is page refresh policy, not a claim that all notification/background polling was removed. Full task detail did not previously mount LiveRefresh and still does not.

## Measurable query/row reductions

| Read | Before | After |
| --- | --- | --- |
| Operational account choices with the diagnosed account mix | 432 accounts | 12 staff (97.2% fewer rows) |
| Customer dropdown with 118 customers | 237 queries: customer read + 236 counts | 1 lightweight query |
| Full Customers list with 118 customers | 237 queries | 3 queries |
| Dashboard grouped counts | One count per space and active account | 2 grouped queries, plus the unchanged fixed tile counts |
| Space/folder task summaries | One task read per displayed record | One projected task read per list |
| Queue open-ticket counts | One count per queue | One grouped query |

These are structural query/row reductions, not measurements of whole-page speedups on production or proof that browser freezes have ended.

## Verification

- Root `npm run typecheck`: passed (web, root, shared and API).
- Optimized Next.js webpack build: passed; all 83 static generation entries completed. Custom `COEX_NEXT_DIST_DIR=.next-performance-qa` keeps QA artifacts separate from the existing development build. Next-generated tsconfig changes were reverted after building.
- Final full suite: `TZ=Asia/Dubai MONGODB_TEST_URI=mongodb://127.0.0.1:27020 npx vitest run`: **727 passed, 3 failed, 730 total across 93 files**. All new performance tests pass. The suite uses isolated `coex_test_*` databases, never production or the feedback review database.
- New database tests reproduce 432 accounts (12 staff/420 customer accounts), test active-only and historical staff behavior, rejection of customer/nonexistent assignments, preservation of all accounts for administration, literal punctuation search, lightweight choice shape, batched customer count queries with tenant/deletion boundaries, and bounded dashboard query count with shared-assignee work.
- New refresh tests cover interval/focus throttling, overlapping manual/timer/focus requests, hidden tabs, offline state, editing and modals.
- Focused task/ticket/Gantt/search/refresh suite: 123 tests passed; CRM/tenant isolation/customer/refresh/search suite: 64 passed before the additional dashboard regression, which also passed. These are overlapping subsets of the full run, not additional unique test totals.
- Browser smoke on production-mode `http://localhost:3113`, using synthetic local feedback data: Tasks and staff-only filter, task detail/subtask assignment choices, Tickets staff filter/manual refresh, Customers contact/site counts, and customer detail with contracts/timeline all loaded successfully. Original review app remains on port 3111. QA server uses only `worktello_feedback_local` on local MongoDB port 27020; no email worker was started.
- `git diff --check`: passed.

### Remaining suite failures

1. `tests/database/time.test.ts:176` expects 60 billable minutes after omitting `billable`; existing time service defaults omitted billable to false. That service/default and test were not changed by this performance work.
2. `apps/api/tests/api.test.ts:293` expects 404 for an unauthenticated write; existing API returns 401.
3. `apps/api/tests/auth.test.ts:98` expects a suspended-account-specific error; existing API returns the generic incorrect-credentials message.

API source/tests were not edited by this work. These failures remain reported rather than changing billing/security behavior to satisfy unrelated expectations. A prior run without the application's Dubai calendar timezone also had two activity day-boundary fixture failures; those pass with `TZ=Asia/Dubai`.

## Release and incident follow-up

The optimization is local and reviewable, not live. This checkout also contains earlier feedback, contract/Gantt/Outlook work and unrelated WIP; do not deploy the dirty working directory wholesale. Prepare a clean release containing the approved scope, then validate its authenticated candidate before switching traffic, with rollback available.

After deployment, repeat the same task/ticket flows as an affected agent and compare payload sizes, request durations, overlapping RSC traffic and proxy errors. Correlate an affected teammate's exact timestamp/URL and a browser Network/Performance trace with Apache/PM2 logs. Diagnose any remaining upstream resets separately. Do not describe healthy CPU/RAM, HTTP 200, or passing local QA as proof that the team's production freezes are resolved.


Later feedback update: administrative accounts are now split into staff and customer-only views, replacing the earlier combined administrative list. Staff role selection and retained-assignment validation were also hardened. See `STAFF-CUSTOMER-SEPARATION-2026-10-28.md` for current behavior and verification.

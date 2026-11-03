# Module record display limits — 28 October 2026

Status: local implementation and QA complete; no production deployment, commit or push.

## Behavior

- Record lists show at most 10 top-level records initially. A bottom **Show more** button reveals the next 10, preserving already displayed records. The final batch may be smaller. A live “Showing X of Y” count accompanies it; the button disappears at the end.
- Shared tables sort their complete supplied result set before selecting the visible window. Changing the sort or result identity resets to 10. Search/filter processing stays before the display window. Totals and exports use the complete supplied dataset.
- Grouped task lists and boards have one shared 10-record budget, not 10 for every due-date/status group. Space list totals and board column counts remain based on all matching tasks. Nested task/subtask groups stay together: a top-level task is one record for this budget, and expanding it may display additional child rows.
- Form choices, navigation entries, chart series, summary totals and conversation folding are not treated as module record lists.

## Coverage

Shared Table default: Customers, Products, Leads, Opportunities list, Contracts/service periods, Spaces list, Timesheet entries, All timesheets, Time report, Team activity entries, Team desk history, Users and roles, Audit log, Setup custom fields/tenants, support metrics and data-transfer review rows.

Explicit card/group handling: My Desk available work and performance history; Tasks/Personal/My Desk task groups (including mobile); Space Board/List/Gantt; Opportunities pipeline; mobile Tickets; customer contacts/sites; standalone subtasks; template library; queue and canned-reply management; pipeline stages; WhatsApp recent messages; What's New topics; team last-activity records.

Customer portal: replaced Previous/Next navigation with cumulative Show more. Initial query returns 10 own tickets; subsequent navigation queries return the first 20, 30, etc. Existing service callers keep normal page behavior unless cumulative mode is explicitly requested. Ownership, search and status filters remain applied in the database.

## Performance boundary

Most staff module lists currently receive the existing full service result and progressively render it on the client. This reduces initial visible rows/DOM work, but it is **not universal database/API pagination**, and it does not guarantee that every response contains only 10 records. Existing backend result/history caps remain unchanged. The portal uses bounded cumulative database queries. Universal server-side pagination would require additional query/count/cursor changes, particularly for ticket SLA categories, cross-record sorting and optimistic ordering; do not describe this display change as that work or as proof of production freeze resolution.

## Verification

- Root typecheck passed; optimized webpack build passed (83 static generation entries). Build output isolated in `.next-pagination-qa`; generated tsconfig changes restored afterwards. Final grouped-list pagination opt-out also passes web typecheck.
- Previous 25-record implementation QA: **586 tests passed across 74 files**, including all unit tests and database tests for Portal, Tasks, Desk, Tickets, Gantt and Contracts. This is historical evidence for that earlier batch size.
- Previous 25-record browser run at localhost:3111: synthetic customer results showed 25 → 50 → 55; final button disappeared; changing sorting reset to 25; descending sort included record 55 first. My Desk showed 25 → 50. Space Board showed 25 task cards; Space List showed 25 → 50; Tasks showed 25 across due groups. This is historical evidence for the prior batch size.
- Added idempotent `scripts/seed-pagination-local.ts`: refuses every URI except the dedicated local feedback database and creates 55 labelled tasks in a separate QA Space and 55 labelled customers. Existing review records were preserved. No email worker started. QA Space id: `6ae1b7dc69b067c1c0cd7f34`.
- Local MongoDB: port 27020, review database `worktello_feedback_local`; automated tests use separate `coex_test_*` databases.
- Original dev app remains on localhost:3111. Production unchanged. Unrelated working-tree edits preserved.

## 10-record follow-up

Updated the shared record window and customer portal query batches to 10. Regression expectations now check 10-row tables and portal cumulative 10/20/55 results with ownership isolation and no duplicates. Browser verified the customer list at 10/56 then 20/56 after one Show more click. Web typecheck passed; tests were not rerun for this follow-up. Local only.

## Live Board correction — 29 October 2026

PR #77 replaces the shared Board-wide window with an independent ten-task window and Show more per status column. This supersedes the Board-specific shared-budget behavior above; List/Gantt behavior remains as documented. Live evidence: `ai/RELEASE-2026-10-29-BOARD-COLUMNS.md`.

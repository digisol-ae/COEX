# Gantt improvements and local QA — 28 October 2026

## Scope and boundary

Owner requested an improved Gantt, subtask items, at least 10 tasks for QA, and downloadable PDF. Implemented locally in the existing `claude/footer-release-record` checkout, preserving the earlier contract/contact/activity/Outlook work and unrelated manual/Teams/private files. No commit, push, deployment or production database change.

Local app: http://localhost:3111. Database: `worktello_feedback_local` at `127.0.0.1:27020`, dedicated container `worktello-feedback-local-mongo`. Synthetic QA Space: `QA Gantt - Tasks and Subtasks` (`6ae18b078cbf1d7f1f2e096a`). Review: http://localhost:3111/spaces/6ae18b078cbf1d7f1f2e096a?view=gantt

## Implemented behavior

- Parent/child hierarchy, individual collapse buttons, Expand all, Collapse all and Show subtasks. Parent rows show completed/total subtasks.
- Subtasks have optional persisted start/end times. Without a complete window, they explicitly use the parent window and dashed bars. Their owner comes from the subtask, not the parent's assignees. Parent estimates are not duplicated as subtask estimates.
- Undated parents with independently scheduled children get a labelled derived envelope; this does not write parent dates. Fully undated items remain under Not scheduled with Set dates controls.
- Exact date previews, keyboard moves, drag/resize, Save and Undo work for child schedules. Saving child dates does not move the parent. Undo can restore inheritance and originally undated/due-date-only tasks. Completed subtasks and work under closed parents cannot be rescheduled.
- Existing Space-configured parent statuses remain unchanged; native subtask Open/Done reflects its completion flag.
- Search matches subtask titles; assignee filters can include a parent's group through a subtask assignee.
- Download PDF exports authorized tasks matching the current selection and subtask/expansion settings, across the full date range rather than just the scrolled viewport. Unsaved previews disable download. The landscape chart repeats headers, shows owners/status, inherited bars, weekends, today and page numbers, and paginates rows/date ranges to retain readable labels.

## Implementation

- Shared task model: nullable subtask startAt/endAt, additive and compatible with old documents.
- Shared `tasks/gantt-items.ts`: grouping, inheritance, derived envelopes and display rows.
- Task summaries include subtask dates/owner names; actor tenant scopes name lookup.
- Gantt service applies permission, visible-parent, parent-space, closed/done and atomic expected-date checks. Scoped positional updates match the exact embedded subtask and original dates; audit preserves stored original dates.
- New `POST /spaces/[id]/gantt/pdf`: requires signed-in staff with task.read.all, same-origin request, bounded 64KB body, valid bounded selection, visible Space and server-authorized tasks. Rejects inaccessible or mismatched IDs rather than accepting client-supplied task contents. Responses are private/no-store.
- Existing parent task scheduling controls, zoom, pinned task labels/date header, today and keyboard behavior retained.

## QA data and evidence

Created **12 clearly labelled synthetic tasks and 36 subtasks** in a separate local QA Space. Includes completed, overdue, explicitly dated and inherited subtasks, an independently scheduled child under an undated parent, and a fully unscheduled backlog. `scripts/seed-gantt-local.ts` is idempotent and rejects all database URIs except the dedicated local one. No shared/live data was cleared.

Automated verification:

- Full unit suite plus isolated Gantt database suite: **68 files / 436 tests passed**.
- Focused tests rerun after final refinements: child save/stale conflict/Undo, due-date-only parent Undo, foreign tenant, private personal Space, unknown/completed child, date math, hierarchy/ownership, PDF pagination and PDF endpoint access/selection.
- Workspace typecheck passed; web typecheck repeated after display refinements. Focused ESLint, Prettier and git diff --check passed.

Browser verification:

- Loaded 12-task/36-subtask chart from the local app.
- Collapse all removes child rows; Expand all restores 33 scheduled child rows (the other 3 remain in Not scheduled). Show subtasks toggles them correctly.
- Keyboard move on inherited child opens preview and disables PDF; saving creates own child dates. Undo restores parent-window dates; parent dates remain unchanged.
- Set dates schedules an undated child and derives its parent envelope; Undo restores the unscheduled state.
- Search for `11.1 Review scope` shows only its parent group; downloaded filtered PDF contains that group and no other task titles.
- Downloaded full PDF through the actual button/endpoint. All 12 parent titles and 36 child titles are present across four pages. Rendered and visually inspected every page for clipping/overlap/legibility.
- Narrow viewport 390x844: controls wrap, no document-level horizontal overflow, chart owns horizontal scrolling. Restored the default browser viewport afterwards.

Evidence: `outputs/qa/gantt-20261028/` (inventory, desktop/mobile screenshots, rendered PDF pages, filtered PDF and extracted text). Final full PDF: `output/pdf/worktello-gantt-qa.pdf`. Browser QA tab retained for review.

## Notes and limitations

- All dates follow the existing task office timezone Asia/Dubai; scheduling/chat times use Asia/Karachi.
- The PDF follows the app's existing standard-font fallback: characters outside Latin-1 are replaced rather than failing the export. Native Arabic/other-script font shaping is not added in this change.
- Synthetic data remains for review. Local schema changes required restarting the development server to clear retained Mongoose subdocument getters; stored subtask dates were verified independently before the restart.
- Font rendering used a task-specific fontconfig cache after the bundled renderer's default cache path was unwritable. No global font/system setting changed.
- No CI, production build or production acceptance is claimed.

## Toolbar feedback — 28 October 2026

Updated locally: compact PDF label with download icon on the right; one Today/Week/Month/Quarter group; paired expand/collapse icons; Fit icon next to the zoom slider; action tooltips and accessible names, including an explanation that Snap rounds dragged/resized dates to the selected interval. Added tooltips for date preview/save/discard/undo and row scheduling actions. Expand/collapse controls are disabled when subtasks are hidden.

Verification: web typecheck and diff whitespace check passed. Browser on port 3111 confirms layout, collapse-all hides child rows, expand-all restores them, and Fit updates the slider and pressed state. Existing scheduling/PDF implementation was not changed. Local only; no production deployment.

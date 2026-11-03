# Space Show more — 29 October 2026

Status: deployed via PR #76 on 29 October 2026 after local and CI validation. Release and rollback evidence: `ai/RELEASE-2026-10-29-SHOW-MORE.md`. The verification below records the preceding isolated QA.

## Change

The Board/List reset key included ordered task IDs, so server refreshes and optimistic moves reset an expanded window to ten. It now uses Space, view, folder and filter values only. The shared record-window hook can reveal a supplied record index in ten-record batches and retains that expanded budget; it also commits filter resets so returning to a prior filter does not resurrect an older window. Space inline/full-form creation actions return the saved task ID; the board reveals that ID when refreshed data arrives. Creation respects active filters, and a filter/view change discards the creation reveal request.

Files changed for this fix: `apps/web/src/app/(app)/spaces/[id]/board.tsx`, `apps/web/src/app/(app)/tasks/actions.ts`, `apps/web/src/components/ui/record-window.tsx`. The first two already contain unrelated pending edits; do not stage their entire diffs without reviewing release scope. The shared window file was already untracked when this task began.

## Verification

- Read-only production observation: Personal Board displayed 10 of 57 records, with empty-looking columns whose tasks were outside the shared window. No production task changed.
- Existing isolated QA app at http://localhost:3111; dedicated local MongoDB port 27020, database `worktello_feedback_local`; synthetic Space `6ae1b7dc69b067c1c0cd7f34`.
- Board: expanded 10 to 20 of 55, moved QA record 15 to In progress, count remained 20 after the action refresh.
- Inline creation: `[Show more QA 20261029] Inline creation stays visible` (T-70) immediately appeared without Show more; 56 of 56 displayed.
- Space List full-form creation: `[Show more QA 20261029] Full form stays visible` (T-71) immediately appeared; 57 of 57 displayed.
- Filter to Paging QA reset to 10 of 55; clearing filter reset to 10 of 57. Expanded to 20, changed QA record 16 priority to High, count remained 20.
- QA records remain for review. No production task/data, mail worker, credentials or release operations changed.
- Web TypeScript, focused ESLint, formatting and diff checks passed. Existing SortableTable regression suite passed 3/3. No full application suite or production build claimed for this focused change.
- Screenshot: `outputs/qa/show-more-20261029/expanded-board.jpg`.

A moved task can still fall outside the current display window due to status ordering; this change preserves the display count and automatically reveals tasks created from this Space. A full navigation/reload starts the default window again.

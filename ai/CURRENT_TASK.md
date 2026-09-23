# COEX — Current AI Task

## Task

Establish and validate the shared Claude ↔ ChatGPT collaboration workflow.

## Objective

Allow Claude and ChatGPT to work on the same COEX codebase without losing project context when
John switches between them.

## Current Stage

Shared AI state is being reconciled from Claude's existing project knowledge.

## Completed

- Inspected the COEX repository.
- Reviewed `CLAUDE.md`.
- Reviewed `AGENTS.md`.
- Reviewed `FEEDBACK.md`.
- Confirmed Git repository and current branch.
- Created the shared `ai/` directory.
- Created `ai/PROJECT_STATE.md`.
- Created `ai/CURRENT_TASK.md`.
- Created `ai/HANDOFF.md`.
- Added AI collaboration rules to `CLAUDE.md`.
- Performed a read-only Claude reconciliation of project state.
- Updated `ai/PROJECT_STATE.md` with the reconciled state.

## In Progress

- Finalise `CURRENT_TASK.md`.
- Finalise `HANDOFF.md`.
- Review all collaboration changes.
- Verify that Claude can read and correctly use the shared state.
- Commit and push the collaboration setup after John reviews it.

## Important Safety State

No application code is being changed as part of this collaboration setup.

The stray files `batch-a-board-fixes.patch` and `readme.txt` that `bf3421d` committed by accident
were removed in `770eead`. Nothing is pending on them.

Do not modify application code until the collaboration setup is complete.

## Next Step

Complete `HANDOFF.md`, review the complete collaboration diff/status, then commit and push the
shared collaboration files and `CLAUDE.md`.

## Owner

John

## Active AI

ChatGPT — collaboration setup and coordination
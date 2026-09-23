# COEX — AI Handoff

This file is the explicit handover channel between Claude and ChatGPT.

The active AI must update this file when handing work to another AI.

---

## Current Handoff

### From

ChatGPT

### To

Claude

### Date

2026-09-22

### Task

Establish and validate the shared Claude ↔ ChatGPT collaboration workflow.

### What Has Been Done

- Inspected the COEX repository.
- Reviewed `CLAUDE.md`.
- Reviewed `AGENTS.md`.
- Reviewed `FEEDBACK.md`.
- Confirmed the Git repository and current branch.
- Confirmed latest commit is `bf3421d`.
- Confirmed the existing deletion of `batch-a-board-fixes.patch`.
- Created the shared `ai/` directory.
- Created `ai/PROJECT_STATE.md`.
- Created `ai/CURRENT_TASK.md`.
- Created `ai/HANDOFF.md`.
- Added shared AI collaboration rules to `CLAUDE.md`.
- Performed a read-only reconciliation with Claude.
- Updated `PROJECT_STATE.md` using the reconciled project information.
- Updated `CURRENT_TASK.md` to reflect the collaboration setup.

### Current Repository State

Working tree: clean. The collaboration files are committed (`2f8e238`), and the stray
`batch-a-board-fixes.patch` and `readme.txt` that `bf3421d` had committed by accident were
removed in `770eead`.

No application code has been changed as part of this collaboration setup.

### Important Reconciled Context

- Batch A is merged as `bf3421d`.
- Claude reports Batch A was deployed on 22 Sep 2026 and tested by John.
- Batch B space visibility is proposed but not implemented.
- Batch C timer tray is proposed but not implemented.
- The split of Batch B to Claude and Batch C to ChatGPT has not yet been confirmed by John.
- Several recent project decisions and deployment details are not yet fully recorded in the
  permanent project documentation.

### What Claude Must Do When Continuing

1. Read `ai/PROJECT_STATE.md`.
2. Read `ai/CURRENT_TASK.md`.
3. Read `ai/HANDOFF.md`.
4. Read `CLAUDE.md`.
5. Read `FEEDBACK.md` when relevant.
6. Inspect the actual repository before making assumptions.
7. Do not modify application code during this collaboration-setup handoff.
8. Do not commit or push unless John explicitly asks for it.

### Next Step

Review the three shared AI files and confirm that the information is understood.

After confirmation, review the complete Git diff/status with John.

Only after John approves should the collaboration setup be committed and pushed.

---

## Handoff History

### 2026-09-22 — ChatGPT → Claude

Initial collaboration setup.

No application code changed.

Shared state established in:

- `ai/PROJECT_STATE.md`
- `ai/CURRENT_TASK.md`
- `ai/HANDOFF.md`

Claude performed a read-only reconciliation of project state.

---

## Last Updated

2026-09-22

Updated by:

ChatGPT
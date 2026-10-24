# Full-page subtask checkbox fix — 24 October 2026

The controlled checkbox previously submitted a form without updating its local checked state. Reproduced on the isolated Docker Done task: the server returned a completed count of 1 of 1 while the checkbox still displayed unchecked. Reload showed the saved completion.

The full-page list now applies an optimistic checkbox and count update inside a transition, disables further toggles during the save, and retains the existing error notice and automatic optimistic rollback. The action receives the intended state through its existing previous-state contract. No server permission or closed-task policy was changed: the existing subtask service already permits updates on Done tasks.

Verified in local Docker on synthetic task DGS-T-22:

- Done task: check and uncheck immediately update checkbox, count, and completed styling.
- Completion remains checked after a reload.
- To do task: check and uncheck also update immediately; task restored to Done afterward.
- No browser errors observed.
- Web TypeScript, focused ESLint, diff whitespace check, and both existing subtask action error tests pass.

Evidence: `/Volumes/sd-mac/Developer/Docker/logs/subtask-checkbox-fixed.jpg`.

Local web Docker image rebuilt and container refreshed. No commit, push, or production deployment. Network-failure rollback was not separately exercised in the browser; existing action-error tests passed.

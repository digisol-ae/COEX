# COEX — AI Handoff

This file is the explicit handover channel between Claude and ChatGPT.

The active AI must update this file when handing work to another AI.

---

## Current Handoff

### From

Claude

### To

Whoever continues Batch B (Claude, ChatGPT, or John reviewing)

### Date

2026-09-23

### Task

Batch B: space visibility (option B, chosen by John on 22 Sep) plus the private-folder and
private-space assignment rules that go with it. Reference: `FEEDBACK.md`, items B1 and B2.

### Important: nothing below is on GitHub yet

`origin/main` is still at `4b1104d` (the docs trim commit). Everything in this handoff is
**uncommitted, local-only code sitting in Claude's working sandbox for this conversation**. It has
not been committed, not been pushed, and does not exist anywhere else. If work continues in a
different session or a different AI, this code must be re-created from this description or handed
across as a patch file; do not assume it is retrievable from GitHub.

### What Has Been Done (uncommitted, local only)

Service layer, mirroring the existing folder-visibility pattern exactly:

- New file `src/modules/tasks/services/access.service.ts`: a shared `actorIsAdministrator()`,
  moved out of `folder.service.ts` so both folders and spaces use the same check.
- `folder.service.ts`: refactored to import the shared helper instead of its own copy. Behaviour
  unchanged; verified brace-balanced.
- `space.service.ts`, the core of Batch B:
  - Added `visibleSpaceIds()`, `visibleSpaceFilter(field)`, `canOpenSpace(id)`,
    `assignableSpaceMemberIds(id)`, mirroring the folder functions of the same shape.
  - `listSpaces()` now enforces visibility and returns `isPrivate` / `memberIds` on each summary.
  - `getSpace(id)` now returns `null` if the space exists but the caller may not open it (the space
    page already does `if (!space) notFound()`, so no page change was needed there).
  - `createSpace` now accepts `memberIds`.
  - Replaced the dead `renameSpace` (verified zero callers anywhere in the app; there was no space
    edit UI at all before this) with a full `updateSpace(id, { name, description, organisationId,
    dueDate, memberIds })`, including the same "cannot go private while it strands an open task
    assigned to a non-member" guard that `updateFolder` already has.
- `task.service.ts`:
  - `listTasks` now composes `visibleSpaceFilter('spaceId')` together with the existing
    `visibleFolderFilter()`, so a private space's tasks no longer leak through "My tasks" or any
    other task listing.
  - `getTask(id)` is now gated by `canOpenSpace` and, when the task has a folder, `canOpenFolder`
    too, so a direct task URL can no longer bypass either rule.
  - `assertAssignable` now takes a `spaceId` and checks `assignableSpaceMemberIds` alongside the
    existing folder check, so a private space's tasks can only be assigned to its members, the same
    way a private folder already worked. All four call sites updated: `createTask`, `updateTask`,
    and both branches inside `patchTask` (the folderId-change branch and the assigneeIds branch).

### What Remains

- `actions.ts`: `createSpaceAction` needs a `memberIds` param; a new `updateSpaceAction` is needed
  to back the settings panel below; `quickAddFolderAction` needs a "private to me" flag for B2.
- UI, all of it still to build:
  - A members checkbox field on `NewSpacePanel` (space creation).
  - A space settings panel reachable from the space page header. None exists today; `renameSpace`
    had no UI, so this is new, not an edit.
  - A "private to me" toggle on the folder quick-add bar (`FolderBar`), the fast path for B2.
  - A minimal manage-access panel for existing folders. None exists today either; `updateFolder`'s
    member-editing was never wired to a screen.
- Deferred, not started, and should stay explicit rather than silently dropped: the subtask
  assignee dropdown (added in Batch A) is not yet restricted by space membership, only by folder
  membership. Cosmetic risk only, not a visibility leak, since the assignee still cannot open a
  space or folder they are not a member of even if the dropdown lets it be selected.

### Findings Worth Keeping

- `renameSpace` had zero callers anywhere before this change: there was no space-editing UI at all.
- There was no folder-editing UI either: `updateFolder`'s member list was never reachable from a
  screen, only set at folder creation.
- No database migration is needed for B1. `space.memberIds` already existed in the schema with a
  `[]` default before this work started, so every existing space document already reads as open
  under the new rule without a backfill script.

### What Whoever Continues Must Do

1. Read `ai/PROJECT_STATE.md`, `ai/CURRENT_TASK.md`, this file, `CLAUDE.md`, and `FEEDBACK.md`
   (items B1/B2).
2. Do not assume the service-layer changes above exist in the repository; they do not, per the
   note above. Ask for the diff or re-implement from this description.
3. Finish the actions layer, then the UI, in the order listed under "What Remains".
4. Do not touch Batch C (the timer tray); it is a separate, unstarted piece.
5. Update this file again when the code is committed and pushed, and remove the "nothing below is
   on GitHub yet" warning once that is true.

### Next Step

Continue the actions layer (`createSpaceAction`, new `updateSpaceAction`, `quickAddFolderAction`),
then the UI, then produce a verified patch for John to apply, build, commit, and push, the same
way Batch A shipped.

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

2026-09-23

Updated by:

Claude, mid Batch B. Code described above is local and uncommitted; origin/main is unchanged at
`4b1104d`.
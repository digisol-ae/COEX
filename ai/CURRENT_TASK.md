# COEX — Current AI Task

> **Current task — 26 Sep 2026 (Claude):** QA of the post-cutover build is done (see
> PROJECT_STATE.md). The QA fixes are committed locally and await John's approval to push and
> deploy. No new features until John approves them. Candidates he has been offered: changing the
> once-an-hour acknowledgement rule, watching the Junk folder for tickets, silencing the
> `src/lib/storage.ts` build warnings, a Prettier pass over the files that currently fail it.

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

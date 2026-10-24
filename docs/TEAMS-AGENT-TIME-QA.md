# Teams agent access and own-time controls

> Release update 25 October 2026: completed implementation shipped in application 4701314. Historical local-only/pending statements below are superseded by `ai/RELEASE-2026-10-25.md`; QA limitations remain explicit there. Teams catalog 1.2.0 and real Teams web SSO/list reads verified; no production write-flow acceptance claimed.

Implemented locally, 24 October 2026. Production remains unchanged at the user's request.

## Behaviour and permissions

- `teams.tasks.read.others`: enables selecting multiple agents and viewing their accessible tasks in the Teams personal app. Selected agents use a union of assignments; shared tasks appear once. Existing tenant, personal-space, space, and folder visibility rules remain in force.
- `teams.tasks.assign.others`: enables assigning to other/multiple agents during personal-app creation and editing assignments in task details. Existing assignment validation, new-assignee alerts, and audit logging are reused. Message-action creation remains single-assignee and now also checks this permission when assigning away from self.
- Platform/tenant administrators receive these rights by default. Managers, senior agents, and agents require explicit grants through Users and roles. Explicit denials win. View and assignment permissions are independent; neither grants access to a private destination.
- Without elevation, the personal app lists the signed-in agent's tasks and creation assigns only to self. API checks enforce this even if controls are bypassed. Assignment-only users can create work for others without automatically opening a task they cannot view.
- Start/stop timer and add/edit time always act as the signed-in agent. A caller cannot select a different time owner or pass another agent's timer to stop. Starting a timer uses the existing service, which stops that person's previous timer.
- Details list up to 100 of the signed-in person's stopped entries for that task. Time corrections require a reason; existing week-lock, running-entry, and audit protections apply. Editing somebody else's time stays prohibited even for elevated Teams users.

## QA evidence

- All eight Teams unit suites passed: 66 tests, including forged agent filters, direct inaccessible detail requests, reassignment denial, independent grants/denials, duplicate agent IDs, own-time identity, cross-user edit rejection, and locked-week errors.
- Permission tests passed; web and root TypeScript checks, focused ESLint, and diff whitespace checks passed.
- Production compilation was checked inside local Docker; build output is `/Volumes/sd-mac/Developer/Docker/logs/teams-access-build.log`.
- Browser interactions exercised the actual workspace/create/time controls in an isolated harness with a mocked Teams SDK/API and synthetic records. Confirmed multi-agent filter payload, assignment save, multi-agent create payload, timer start/stop, manual 45-minute entry, correction to 60 minutes with reason, and hidden elevated controls/self-only creation for a limited user.
- Preview screenshot: `/Volumes/sd-mac/Developer/Docker/logs/teams-time-ui-preview.jpg`. Limited-user screenshot: `/Volumes/sd-mac/Developer/Docker/logs/teams-limited-ui-preview.jpg`.

## Remaining acceptance

The isolated browser harness proves UI interactions, not Microsoft authentication, real API/database integration through Teams, or production availability. Native Teams SSO and end-to-end checks with an elevated and ordinary account remain required before release acceptance. No Teams manifest permission expansion or database migration is needed. Existing tasks retain their assignments. No production deployment, Git commit, or push was performed.

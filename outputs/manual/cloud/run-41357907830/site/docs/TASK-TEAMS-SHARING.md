# Task links and Teams sharing — 24 October 2026

> Release update 25 October 2026: completed implementation shipped in application 4701314. Historical local-only/pending statements below are superseded by `ai/RELEASE-2026-10-25.md`; QA limitations remain explicit there. Teams catalog 1.2.0 and real Teams web SSO/list reads verified; no production write-flow acceptance claimed.

Implemented locally; production deployment remains deferred.

## User flow

- Task full page, task drawer, and Teams personal-app detail offer **Share task to Teams**.
- Review contains task number, title, status, and the authenticated COEX task URL. Descriptions, work updates, source-message text, attachments, customer details, and access tokens are excluded.
- In a browser, Continue loads Microsoft's documented Share-to-Teams launcher only after user review. In the Teams tab, the native TeamsJS sharing capability is used after a capability check. The user chooses the destination and confirms in Microsoft's interface. COEX does not send a chat message itself or claim that delivery occurred.
- Copy summary/link is available as a fallback; if clipboard access is denied, the visible summary can be copied manually. Localhost sharing is disabled because recipients cannot open a developer's local task URL.
- Teams-origin tasks offer a source/linked-chat navigation action. A user replies in that chat with Teams' own membership and permission checks.

## Source context and compatibility

New tasks created from a Teams message persist `sourceTeamsMessageUrl` separately from editable descriptions. The original description marker remains for compatibility. Existing tasks can resolve the labelled `Original Teams message:` line without migration or bulk edits. If that line was previously removed, its source cannot be reconstructed automatically.

Only HTTPS message/chat navigation links on `teams.microsoft.com` or `teams.cloud.microsoft` are accepted. Credentials, non-default ports, lookalike hosts, executable URLs, and unrelated paths are rejected. Legacy description links are navigation hints, not proof of authorship or authority. Task and chat access remain independent: a shared link never grants COEX access, and a source link never grants Teams chat access.

## Validation

- 69 focused tests passed across Teams and task-sharing suites, including host/path validation, structured-source persistence semantics, legacy fallback, and a share payload that excludes internal data.
- Web/root TypeScript, focused lint, and diff whitespace checks passed.
- Final production build inside local Docker exited 0. The final local web container is running; no browser runtime errors were captured during final sharing checks.
- Docker-only synthetic fixtures verify persisted structured provenance and source-link propagation to task summaries/drawers for new and legacy records.
- Local browser checks verify source-link targets, share preview, blocked localhost submission, and clipboard-denial/manual-copy fallback on the full page; the drawer preview is also exercised.
- Evidence: `/Volumes/sd-mac/Developer/Docker/logs/task-teams-sharing.jpg`; build log: `/Volumes/sd-mac/Developer/Docker/logs/teams-sharing-build.log`.

## Release acceptance and future constraints

No external message was sent during QA. Real Teams recipient selection, cancellation, and delivery must be checked in a permitted Microsoft account after a reachable deployment is available. Microsoft's web launcher documents desktop Edge/Chrome support; unsupported clients, script blockers, clipboard restrictions, and unsupported Teams sharing contexts use the copy/manual fallback. Chat links may become unavailable when a message is deleted or membership changes.

Direct in-COEX replies, chat-history sync, and delivery tracking are deliberately deferred. A future direct-send feature would need a separate design for delegated Microsoft permissions/consent, tenant and chat membership verification, idempotent sends, audit records, and uncertain-delivery handling. This implementation adds no Graph permissions, chat-directory enumeration, or automatic posting.

References: [Microsoft web sharing](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/share-to-teams-from-web-apps), [Teams personal app/tab sharing](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/share-to-teams-from-personal-app-or-tab).

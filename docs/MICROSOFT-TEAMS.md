# Microsoft Teams → COEX tasks

Status: local implementation, not installed in Teams or deployed. Branch: `codex/teams-create-task`.

## Agent experience

1. On a Teams message, select **… → More actions → Create COEX task**.
2. Choose an accessible active Space or Folder, then Continue.
3. Review the prefilled title/description; select an eligible assignee, priority and optional due date.
4. Create task. The confirmation includes **Open in COEX**.

The original message link is appended to the description. This copies selected message text only: no attachments, replies, chat history or Microsoft Graph access. Source chat participants do not automatically gain COEX task access. The agent must choose a task destination appropriate for the message's audience. Confirmation stays in the agent's dialog; this version does not automatically post to the chat or send Teams notifications. Existing COEX assignment alerts still use the existing service.

## Configure one Microsoft organisation / one COEX tenant

No credentials belong in Git, app packages or chat. Set server environment using the existing secret-management process:

```dotenv
COEX_TEAMS_APP_ID=<Microsoft bot application/client UUID>
COEX_TEAMS_TENANT_ID=<Microsoft directory/tenant UUID>
COEX_TEAMS_COEX_TENANT_ID=<COEX tenant ObjectId, 24 hex characters>
COEX_TEAMS_DRAFT_SECRET=<separate random secret, at least 32 characters>
COEX_APP_URL=https://coex.digisol.ae
```

Generate the draft secret locally with a cryptographic generator and place it directly into the environment. Do not reuse a session secret, Microsoft client secret or SSH key. Missing settings leave the endpoint disabled (503). Existing Microsoft sign-in must be configured separately with the existing `AUTH_MICROSOFT_ENTRA_ID_*` variables; its issuer must identify the same Microsoft tenant configured above. Staff sign in with Microsoft once to populate their existing `entraObjectId`; no automatic account creation or matching by display name/email in this integration.

Microsoft admin setup:

1. Register a dedicated single-tenant Microsoft application and Azure Bot resource for the organisation. Use its application/client ID as `COEX_TEAMS_APP_ID`. Review any Azure costs before creating resources.
2. Enable the Microsoft Teams channel. Configure the bot messaging endpoint as `https://coex.digisol.ae/api/integrations/teams/messages` after deploying the reviewed implementation. This version only returns invoke responses; it makes no outbound bot calls and needs no bot client secret in COEX.
3. Ensure existing Microsoft COEX sign-in is enabled and linked for pilot staff.
4. COEX now includes public `/privacy` and `/terms` pages for **Digisol LLC-FZ**, with policy contact **info@digisol.ae**. Deploy and verify these pages return 200 without sign-in before uploading the Teams package. The generator defaults to these routes on `COEX_APP_URL`; the optional overrides below are **package-build settings**, not server secrets:

   ```sh
   COEX_TEAMS_APP_ID=<public-client-uuid> \
   COEX_APP_URL=https://coex.digisol.ae \
   COEX_TEAMS_PRIVACY_URL=https://coex.digisol.ae/privacy \
   COEX_TEAMS_TERMS_URL=https://coex.digisol.ae/terms \
   node scripts/package-teams.mjs /private/tmp/coex-teams-package
   ```

5. The output contains `manifest.json`, 192×192 colour icon, 32×32 transparent white outline icon, and `coex-teams.zip`. Public IDs/URLs only. The simple C icons are placeholders for pilot use.
6. Validate the package in Teams Developer Portal and upload/install through the organisation's approved custom-app process. Start with pilot staff; tenant policy may require Teams administrator approval. No public store submission is needed for an internal pilot.

## Access, integrity and retries

- Connector JWT signature verified using Microsoft's fixed HTTPS JWKS endpoint; RS256, issuer, audience, validity, service URL binding and `msteams` key endorsement required. No unsigned/emulator bypass.
- Microsoft tenant is pinned; the user must have exactly one active, nondeleted linked staff account in the configured active COEX tenant with Tasks enabled and `task.manage` permission.
- All destination and assignee queries are tenant scoped. Personal spaces are excluded. Space/Folder visibility and assignment eligibility are checked on both destination selection and final submission. Private folder must belong to selected space. Staff permissions/account status are reloaded for every invoke.
- Signed 15-minute drafts bind original source text/link to the actor and COEX tenant. Final task fields remain editable and are validated server-side. Source link is not fetched.
- A `TeamsTaskReceipt` document uses MongoDB's unique `_id` to reserve a form before task creation; concurrent/repeated submission cannot create a second task from that form. A fresh form is a separate request and can intentionally create another task from the same Teams message.
- Receipts are not expired automatically. If task creation or receipt finalisation fails after reservation, response asks the agent to check COEX. Do not delete pending receipts or blindly retry: a task may already exist because the existing creation service writes the task before audit/notification work completes. An administrator must inspect before starting a new form. This is duplicate prevention, not a transaction covering task/audit/mail together.
- HTTP body is bounded to 128 KiB while streaming. Errors do not reveal database details; message bodies, tokens and secrets are not logged.

## Verification and activation gate

Verified 22 October 2026: 39 unit files / 244 tests passed, plus 5/5 HTTP boundary tests; web typecheck, focused lint, formatting and production Webpack build (65 pages) passed. Synthetic package generation and icon dimensions/alpha passed; Microsoft manifest validation is pending.

Automated coverage: real RSA-signed connector verification and rejection cases; source links/plain text; signed-draft owner/tenant/expiry; form validation; staff/tenant/permission/private destination checks; duplicate/concurrent/uncertain submission handling. Tests mock persistence; they do not prove a live MongoDB or Microsoft round trip.

Before activation, validate the manifest in Developer Portal and test in actual Teams: chat and channel message menus, destination step, eligible assignees, ordinary agent creation, source link, due date, double click/retry, expired form, suspended/unlinked user and private access revocation. Confirm one task, expected tenant/audit/assignment alert, and no chat/customer message sent. Use clearly labelled disposable pilot records. Mobile Teams acceptance remains required separately.

The local implementation did not create Microsoft resources or install the Teams app. User-reported Azure setup on 22 October 2026: application/client ID `0ee8f3f6-879a-4cf0-95d0-9321696f4473`, directory ID `3788e905-c187-4e8b-bafb-84b7e0ec3f1c`; Azure Bot F0/Global, Microsoft Teams Commercial channel enabled and messaging endpoint saved. Browser automation was unavailable, so these are user-reported configuration steps, not live end-to-end verification. No Graph permission, database migration, live task or COEX deployment performed in this implementation.

## Sources

- [Message action commands](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/define-action-command)
- [Adaptive Card dialogs and selected-message payload](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/create-task-module)
- [Connector authentication requirements](https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-authentication?view=azure-bot-service-4.0)

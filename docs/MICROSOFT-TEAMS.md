# Microsoft Teams → COEX tasks

## Teams personal workspace deployed — 23 October 2026 (installation/pilot pending)

PR #38 merged as `6dfcf1509c46b1963c0e8de886adfe58c6ba004e`; PR CI 39902606641 and main CI 39905072621 passed. Teams My Tasks, detail/latest updates, text posting, personal completion filters and creator-default create are now served at /integrations/teams/app. Existing message action preserved. Owner reports correct COEX Teams registration URI/scope, both preauthorized Teams clients and v2 token setting saved; real Microsoft SSO and Teams desktop/web/mobile pilot still pending. Updated package 1.1.0 is in Downloads. No What's new announcement until available to users.

Active green coex-app-green id8 / PID214898, port3002, /srv/coex/releases/teams-tab-20261023. Blue coex-app id7 / PID184237, port3001, /srv/coex/releases/entra-redirect-20261022 remains warm fallback. Three workers unchanged. Native server build passed (73 pages), public tab/dialog/login/policies healthy, anonymous/invalid-token API 401; 40/40 switch samples 200. Tenant-scoped release session expiry: 7 old sessions revoked at 2026-10-23T05:23:38Z, zero matching old sessions remain. Full evidence: ai/RELEASE-2026-10-23-TEAMS-TAB.md; setup/file map: docs/TEAMS-PERSONAL-TAB.md. Docs-only sync needs no restart or further expiry. Supersedes earlier not-deployed entries. Unrelated projects/ preserved.


## Personal tab follow-up — 23 October 2026

COEX inside Teams is being implemented on codex/teams-personal-tab. Current setup, verification and remaining installation/SSO steps: [TEAMS-PERSONAL-TAB.md](TEAMS-PERSONAL-TAB.md). Not deployed or installed yet; older deployment notes below refer to historical message-action releases.


## Teams self-assignment email fix deployed — 22 October 2026

PR #32 merged as `530e19225b6839dd9c7446999418b07c3a5ac446` (feature `6a41d1f`). PR CI https://github.com/digisol-ae/COEX/actions/runs/39732776761 and main CI https://github.com/digisol-ae/COEX/actions/runs/39733067549 passed. Fresh local Webpack and isolated server native builds passed (71 pages). Existing self-action email suppression caused the creator-default Teams task to queue no email; Teams now opts into initial self-assignment confirmation through the shared service. Normal web behavior and tenant email switches retained; receipt retries cannot create another task/email. No backfill or real test email sent.

Focused 14 Teams unit tests, fresh web TypeScript/ESLint and isolated real queue regression passed (1 selected / 51 skipped). The queue regression checks ordinary self-action suppression, exactly one pending external confirmation with task URL, and both outbound/taskAssigned switches. Temporary loopback MongoDB avoided shared Atlas collection quota and existing server DB authentication; it was stopped afterwards. Real Microsoft-signed create + SMTP/inbox acceptance remains a user pilot, not claimed by queue/security checks. Local preview 3106 rebuilt/restarted and login 200.

**Active web is now `coex-app` id 5 / PID 165915, loopback 3001, cwd `/srv/coex/releases/teams-email-6a41d1f`, clean at application SHA above.** Apache COEX mappings target 127.0.0.1:3001. `coex-app-green` id 4 / PID 162142 remains warm rollback on 3002 from `/srv/coex/releases/logo-bb66964`. Original id 0 web process was retired only while green served traffic; `/srv/coex/app` still hosts exactly three unchanged workers (mail 159658, desk-close 159673, channels 159698; restart counts 3). Five intended PM2 entries saved. Do not treat the original checkout as the active web release.

Isolated build, preserved static chunks/action encryption compatibility, candidate health checks, then graceful Apache switch: all 40 monitor requests returned 200; no observed outage in that window. Proxy backup `/srv/coex/shared/apache-before-teams-email-20261022102033`; monitor `/tmp/coex-teams-email-switch-20261022102033.log`. Public login/privacy/terms/Teams dialog 200; unsigned Teams invoke 401. No DB/schema/configuration-secret change. This supersedes prior green-active and pending entries. A later docs-only pull requires no rebuild/restart. Current operating/rollback guide: `deploy/ZERO-DOWNTIME.md`; unrelated `projects/` untouched.


## Teams self-assignment email correction — 22 October 2026 (prepared)

Production read-only diagnosis: Teams task DGS-T-472 was self-assigned and had no assignment outbox row. Earlier Teams task DGS-T-470 was assigned to another person and its email was sent; outbound and task-assignment settings are enabled. Root cause is existing `alertStaff` self-action suppression combined with the new creator-default assignee, not a disabled worker or SMTP outage.

Teams now calls the shared `createTask` with trusted service option `{ notifySelf: true }`; this forwards the existing `evenIfSelf` email option for initial assignee alerts. Ordinary web creation/assignment keeps self-action suppression. Existing outbound/taskAssigned settings still apply; no separate send path, changes to private destination checks, automatic backfill or duplicate-receipt replay. A retry still returns the existing task without another creation/email.

Validation: 14 Teams service unit tests, focused ESLint and fresh web TypeScript passed. Real queue regression passed (1 selected / 51 skipped), checking ordinary self-assignment queues nothing, explicit external confirmation queues exactly one pending task_assigned email to the creator with task URL, and both tenant switches suppress later mail. Shared Atlas test run hit its 500-collection infrastructure limit; protected server MongoDB required auth. Final regression ran against a separate temporary loopback MongoDB on 27019, forced `coex_test_tasks` database, no production credentials or mail worker. Temporary MongoDB stopped afterwards. No real email/task created during QA. Source files: teams.service.ts selects the confirmation behavior; task.service.ts shares existing queue logic; tests/database/tasks.test.ts verifies persisted outbox behavior. Production rollout pending, using the isolated/graceful process in deploy/ZERO-DOWNTIME.md.


## Single-screen Teams and COEX branding deployed — 22 October 2026

Owner-authorised application rollout completed. PR #28 merged as `e70f8c0f166beaa53fd7e8eb22662d4b633ab5bf` (feature commit `1b95fc8`). PR CI https://github.com/digisol-ae/COEX/actions/runs/39727006511 and merged-main CI https://github.com/digisol-ae/COEX/actions/runs/39727214405 passed. Workspace types/lint, formatting, **41 unit files / 255 tests**, final CI build and server native Turbopack build (**71 pages**) passed. Production-only dependency audit: **0 vulnerabilities**; overall dependency audit retains 8 development findings (2 moderate, 6 high), no forced upgrades.

Server `/srv/coex/app` clean at application SHA after release. Exactly one each `coex-app` PID 159645, `coex-mail` 159658, `coex-desk-close` 159673, `coex-channels` 159698 online; one added restart per service (cumulative 3), PM2 saved. Backup before release: `/srv/coex/shared/backups/coex-2026-10-22-0913.archive.gz` (483K) and `files-2026-10-22-0913.tar.gz` (14M), server timestamp +04. Existing runtime secrets/settings retained; no new secret/configuration change.

Public HTTPS checks: `/login`, `/privacy`, `/terms` return 200 and contain final tightly cropped theme-aware inline COEX wordmark. Public wordmark, monogram, SVG browser icon, Apple icon and favicon **all five SHA256 hashes match** local release files. `/integrations/teams/create` returns 200 with intended framing CSP/no-referrer headers. Invalid form token rejected 403; well-formed unsigned Connector invoke rejected 401. No live task created and no email/chat sent for verification.

Includes one-screen Space/Folder/Assignee/Date/Time controls with eligible creator default and existing Asia/Dubai office-time semantics; new product branding/icon set and simplified Teams release wording. **No logo entry in What’s new**, as explicitly requested. Claude follow-up inline component from `d455107`/`3febced` incorporated with corrected local canvas/sizes. Browser/native signed-in dashboard visual acceptance and actual Microsoft-signed Teams message-to-task pilot remain pending; HTTP/security checks are not that acceptance.

Branded Teams installer `/Users/syedali/Downloads/COEX-Teams-1.0.1.zip` validated against Microsoft schema. SHA256 `004ec5edd9e1289843143c0ba9352c8339e98036e32eb91a5bf4cef404ac09d3`; old 1.0.0 package preserved. Single-screen server change uses existing valid domain; installation/update to 1.0.1 supplies new Teams artwork. No Teams app upload/install performed. Next: install/update and test real message action, creator default, destination privacy, chosen date/time and one saved task/source link.

Developer guides: `docs/MICROSOFT-TEAMS.md`, `docs/BRANDING.md`; release evidence: `ai/RELEASE-2026-10-22-TEAMS-BRAND.md`. This completed outcome supersedes prior local-only/pending rollout entries. Separate `projects/` untouched/untracked. A subsequent docs-only merge/pull records this outcome; no application rebuild or extra PM2 restart needed for those Markdown-only changes.

Status: backend and public policies deployed/verified on 22 October 2026 at application SHA `77e84585ce0626aa8f9dbcddf5bb2518ec5bb5ab`; Teams app installation and actual message-to-task pilot remain pending. Branch: `codex/teams-create-task`.

## Agent experience

The single-screen form below is implemented locally; the previously deployed baseline still uses the destination-first card until the next release.

1. On a Teams message, select **… → More actions → Create COEX task**.
2. In one screen, review title/description; choose **Space**, **Folder**, **Assignee**, **Date** and **Time**, and priority.
3. Creator is selected by default where eligible. Space changes reset folder/assignee and filter eligible options. Private-destination membership restrictions remain enforced.
4. Select Create task; confirmation includes Open in COEX. Due date/time use COEX office time **Asia/Dubai**; time requires a date. Date without time uses office midnight.

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

The local implementation did not create Microsoft resources or install the Teams app. User-reported Azure setup on 22 October 2026: application/client ID `0ee8f3f6-879a-4cf0-95d0-9321696f4473`, directory ID `3788e905-c187-4e8b-bafb-84b7e0ec3f1c`; Azure Bot F0/Global, Microsoft Teams Commercial channel enabled and messaging endpoint saved. Browser automation was unavailable, so these are user-reported configuration steps, not live end-to-end verification. No Graph permission, database migration or live Teams task performed. Backend/policy deployment completed; see `ai/RELEASE-2026-10-22-TEAMS.md` for evidence.

## Sources

- [Message action commands](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/define-action-command)
- [Adaptive Card dialogs and selected-message payload](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/create-task-module)
- [Connector authentication requirements](https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-authentication?view=azure-bot-service-4.0)

## Release outcome — 22 October 2026

## Teams backend and policy deployment verified — 22 October 2026

Owner authorised complete rollout with guided explanations. Application PR #26 merged as `77e84585ce0626aa8f9dbcddf5bb2518ec5bb5ab`; PR CI https://github.com/digisol-ae/COEX/actions/runs/39721227941 and main CI https://github.com/digisol-ae/COEX/actions/runs/39721496951 passed. Local full workspace types/lint, 40 unit files / 249 tests, formatting, Microsoft Teams manifest schema and local/server builds passed; server native Turbopack build generated 67 pages.

Server `/srv/coex/app` clean at application SHA after deploy, four expected PM2 processes online with no duplicates and one additional restart each (cumulative restart count 2). Backup before release: `coex-2026-10-22-0813.archive.gz` (481K), `files-2026-10-22-0813.tar.gz` (14M), under `/srv/coex/shared/backups` (server timestamp). Teams environment configured without exposing credentials; draft secret generated privately, prior environment backed up mode 600. Existing Microsoft sign-in issuer matches directory; active linked-account count 8. Production dependency audit: 0 vulnerabilities; all-dependency report has 8 development findings (2 moderate, 6 high), no forced upgrades.

Live verification: https://coex.digisol.ae/privacy, /terms and /login return 200; operator Digisol LLC-FZ, contact info@digisol.ae and public policy links verified. Teams endpoint returns 401 for well-formed unsigned invoke (configured and refusing unauthenticated access). No real Teams invoke/task creation yet. ZIP `/Users/syedali/Downloads/COEX-Teams-1.0.0.zip` prepared; SHA256 `2b0fe5e748e09a271c6bb5f4d536fd65d52dbcef0b573d7f54fd7e9a150ce72d`. Microsoft schema validation passed, Developer Portal/client installation acceptance remains pending.

Next: user installs ZIP through Teams approved custom-app process, then validate actual message action, linked staff identity, destination/eligible assignee, one saved task/source link and duplicate prevention. Native browser automation unavailable; no visual/Teams end-to-end claim. Public policy deployment completes; **Teams installation and functional pilot remain open**. No separate `projects/` files committed. File-type explanations are in `ai/RELEASE-2026-10-22-TEAMS.md`; implementation/operating guides in `docs/MICROSOFT-TEAMS.md` and `docs/LEGAL-PAGES.md`. Subsequent docs-only pull requires no application rebuild/restart.

## Single-screen Teams create form — 22 October 2026 (local)

Owner requested one screen with separate Space, Folder, Assignee, Date and Time controls; creator selected as default assignee. Replaced destination/Continue card with a TeamsJS HTML dialog. Title/description/priority retained; Space changes reset Folder and eligible people; creator defaults where eligible, otherwise explicit unassigned notice rather than breaking private membership rules. Server defaults omitted assignee to creator, permits explicit unassigned and rechecks destination/assignee on signed Connector submission. Separate date/time combine into task endAt using existing Asia/Dubai office-time parsing; time without date rejected.

New `.tsx` files under `app/integrations/teams/create/` render the single screen; `form-model.ts` filters choices and computes creator default. Read-only `api/integrations/teams/form/route.ts` verifies a signed 15-minute draft and active linked staff/task access before loading choices; body bounded 32KiB, no-store, no-referrer. Draft arrives in URL fragment, is removed from visible history and POSTed in body, never in request URL/query/referrer. Creation still requires Microsoft-signed submitAction and unique receipt. TeamsJS SDK 2.58.0 added with lockfile; Next headers permit framing only for this dialog by Teams/Microsoft hosts. Existing manifest validDomains already covers the dialog; no ZIP change required for this server UI update.

Validation: web typecheck/focused ESLint and 41 unit files / 255 tests passed, including folder/assignee filtering, creator default, private membership, date/time/office conversion, invalid and foreign-tenant form tokens and prior duplicate guards. Production build verification recorded after completion below. Actual Teams/webview/mobile acceptance remains pending. This change and the simplified What's new copy are LOCAL ONLY; last live code remains the previously deployed application release. Do not confuse this form with the old two-step flow currently deployed. No commit/push/deployment or real task creation for this follow-up; unrelated `projects/` untouched.

Single-screen form plus branding follow-up: production build passed (71 pages). Local branded installer is `/Users/syedali/Downloads/COEX-Teams-1.0.1.zip`; this supersedes 1.0.0 artwork for the next install/update. Current server still runs the earlier two-step flow until follow-up deployment. See `docs/BRANDING.md` for artwork derivation.

# COEX inside Teams — personal tab

## Status — 23 October 2026

Implementation branch: `codex/teams-personal-tab`. Not yet deployed or installed. Existing message action remains available. This adds a personal **My Tasks** tab, task detail with latest-first updates and Show more, text update posting, personal completion/filter and a single-screen create form with creator-default assignment. Attachments/full task editing open the normal COEX website; they are not embedded in this first tab screen. This is a focused Teams workspace, not the entire browser application embedded unchanged.

Teams UI package version 1.1.0 preserves the existing app ID and message extension. Update the existing organisation app rather than submitting a second app with the same external ID. Installation/Entra admin configuration and real desktop/mobile/web acceptance remain required. No user-facing release announcement until the feature is actually available.

## Authentication and permissions

The tab uses TeamsJS `authentication.getAuthToken()` for every request. The token is sent only in an Authorization bearer header to the same-origin API, never in URLs, local/session storage, cookies or logs. Browser session cookies are not accepted for this API, so embedded third-party cookie availability is not required.

Server verification: Microsoft RSA signature, RS256, expiry, required issued-at, exact v2 issuer, app-ID audience, configured Microsoft tenant, `access_as_user` delegated scope, approved Teams desktop/mobile or web client `azp`, GUID object ID. Graph tokens, ID tokens without delegated scope and other tenant/client tokens are rejected. Only v2 access tokens supported: configure the API registration accordingly. Microsoft claims come from the verified JWT, never Teams context, user-entered email or client-supplied tenant IDs.

Every request checks one active linked COEX staff account (`entraObjectId`), active configured COEX tenant, Tasks module and `task.manage`. Existing tenant context and task services enforce visible Space/folder and assignment rules. New tasks validate visible destination/assignee, default to actor and use a permanent unique per-tenant/per-user request receipt to prevent duplicate creation on retry. Uncertain receipts return409 and require checking tasks; they never automatically re-run the write. Normal task notifications/self-action suppression retained.

This does not create an ordinary browser session. Existing COEX session logout/revocation does not revoke Microsoft access tokens; disabling the COEX user/tenant or permissions blocks subsequent tab requests. Entra token lifetime/revocation is separate. No Graph permissions, background sync, email backfill or automatic user provisioning added.

## Entra setup (public registration values only)

Open Microsoft Entra → App registrations → existing COEX registration `0ee8f3f6-879a-4cf0-95d0-9321696f4473`, tenant `3788e905-c187-4e8b-bafb-84b7e0ec3f1c`.

1. Under **Expose an API**, confirm existing configuration before changing it. Target Application ID URI is `api://coex.digisol.ae/0ee8f3f6-879a-4cf0-95d0-9321696f4473`. If an existing URI is used elsewhere, assess it before replacement; package resource must match exactly.
2. Add enabled delegated scope `access_as_user`. Suggested admin consent title: “Access COEX as the signed-in user”; description: “Read and manage COEX tasks using the signed-in user's existing COEX permissions.” Select admin-only consent for the organisation pilot.
3. Preauthorize scope for Teams desktop/mobile client `1fec8e78-bce4-4aaf-ab1b-5451cc387264` and Teams web `5e3ce6c0-2b1f-4285-8d4b-75ee78787346`.
4. In the registration manifest/API settings set `api.requestedAccessTokenVersion` to **2**, preserving other API fields/scopes. Existing browser OAuth redirect URI remains unchanged; this tab does not need a new callback URI or client secret.
5. Review/grant organisational consent as required by tenant policy. No application-wide Graph grants required.
6. Server uses existing COEX_TEAMS_APP_ID / COEX_TEAMS_TENANT_ID / COEX_TEAMS_COEX_TENANT_ID and Teams draft secret. Keep secrets out of the manifest/chat.

## Package and install

```sh
COEX_TEAMS_APP_ID=0ee8f3f6-879a-4cf0-95d0-9321696f4473 \
COEX_APP_URL=https://coex.digisol.ae \
node scripts/package-teams.mjs /private/tmp/coex-teams-package-1.1.0
```

ZIP contains public manifest and icons only. Manifest adds static personal tab `coex-my-tasks`, contentURL `https://coex.digisol.ae/integrations/teams/app`, and `webApplicationInfo` for the API. Keep same app ID and increment version. Deploy the reviewed application first, then Teams Admin Center → existing COEX app → upload/update its package. Do not create a duplicate organisation app. Open COEX from Teams Apps/sidebar; pin it if desired.

## Source map / file purpose

- `app/integrations/teams/app/page.tsx` and `workspace.tsx`: TypeScript/React page and responsive client UI.
- `app/integrations/teams/create/create-form.tsx`: shared single-screen form; existing message dialog behavior preserved; personal mode submits through authenticated API.
- `modules/integrations/teams/tab-client.ts`: obtains Teams token per request; same-origin API only.
- `tab-auth.ts`: cryptographic and claim verification, fixed Microsoft key endpoint.
- `tab.service.ts`: linked actor/tenant authorization, existing business services, guarded creation receipts.
- `app/api/integrations/teams/app/route.ts`: bounded JSON requests, no-store responses, friendly errors without stack/DB details.
- `next.config.ts`: framing permission restricted to Teams integration routes and Microsoft host ancestors; no global iframe permission.
- `scripts/package-teams.mjs`: reproducible 1.1.0 manifest/icons ZIP generation.
- `tests/unit/teams-tab-*.test.ts`: signed-token validation, route boundaries, actor mapping, permissions and retry behavior.
- `.md` files: human-readable decisions, setup, verification limits and handover; not executable application code.

## Validation and acceptance

Local focused tests:46 passed including existing form/service coverage. Full unit suite:46 files /298 tests passed. Focused lint and web TypeScript passed. Production Webpack build passed73 pages. Isolated Chrome UI fixture exercised nine screen/viewport combinations (tasks/detail/create at320/768/1440), no horizontal overflow, creator-default creation, posting an update, My subtask done and restore. Screenshots inspected. Fixture intercepts API calls only in the isolated QA browser and uses synthetic Teams host/token/data; it is not a real Teams authentication test and changes no server authentication behavior. Local tab/dialog routes200 with Teams-only framing/no-store headers; anonymous API401. Tests use signed synthetic JWTs/local test keys or mocked persistence; no production data/task/email created.

Required live pilot: linked staff in Teams desktop/web/mobile, silent token or consent flow, My Tasks filters, allowed task details/latest updates, create with creator and another assignee, normal notifications, inaccessible Space/folder rejection, inactive/unlinked account denial, no cookies available, expired token refresh and retry behavior. Mocked/browser-emulated checks cannot establish real Teams SSO or real-device acceptance.

## Official references

- https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/tab-requirements
- https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/tab-sso-register-aad
- https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/tab-sso-overview

## Local review artifacts

Preview: `http://localhost:3107/integrations/teams/app` (outside Teams shows an explanatory sign-in/host message). Package: `/Users/syedali/Downloads/COEX-Teams-1.1.0.zip`; generated manifest/icons also in `/private/tmp/coex-teams-package-1.1.0/`. Browser fixture screenshots/results: `/private/tmp/coex-teams-tab-qa/`. Fixture harness and test data are temporary QA artifacts, not part of production source or package. No production deployment or Teams app installation performed for this phase.

# Worktello in Outlook web — 25 October 2026

## Confirmed diagnosis

Outlook Apps lists the existing Worktello catalog app and opens its personal tab, but its iframe displays “refused to connect”. Live `/integrations/teams/app` CSP omitted `outlook.office.com`. It allowed Teams/cloud hosts only. There was no conflicting X-Frame-Options response header. Separately, the API verifier accepted only the two Teams client IDs, so embedding alone would not complete Outlook SSO.

## Scoped resolution

Add exact production Outlook web ancestors `https://outlook.office.com` and `https://outlook.office365.com` only to the existing `/integrations/teams/:path*` rule. Do not disable framing protection or add wildcard Office hosts. Add only Outlook web public client `bc59ab01-8403-45c6-8796-ac3ef710b3e3` to the signed v2 delegated-token client allowlist. Keep signature, issuer, audience, tenant, object ID, expiry, access_as_user and staff authorization unchanged. Desktop/mobile/M365 clients remain rejected. Tokens remain memory-only, omitted from cookies/URLs/storage/logs.

Microsoft reference: https://learn.microsoft.com/en-us/microsoftteams/platform/m365-apps/extend-m365-teams-personal-tab

Owner explicitly confirmed authorizing Outlook web at action time. Authorization saved and persisted: both existing Teams clients and the new Outlook web client are listed with one scope each.

Entra COEX Teams registration `0ee8f3f6-879a-4cf0-95d0-9321696f4473` must preauthorize that Outlook web client for the existing access_as_user scope. No new Graph permissions or API scope. Browser policy requires action-time confirmation before adding this new authorized client; prepare the concrete scope/client selection before requesting it. Existing Teams clients and catalog identity remain unchanged. No package version change needed for this server/auth compatibility correction.

## QA and deployment

Focused header/token tests passed (16); all 52 unit files / 348 tests, TypeScript, ESLint, CI formatting and local 75-page production build passed. CI and isolated web-only rollout pending. No worker code or restart needed. No production email contents will be copied into tasks and no test task/time entry will be created. Verify real Outlook web SSO/list/detail and existing Teams compatibility after rollout. Outer platform badge does not establish desktop/mobile or email-action support.

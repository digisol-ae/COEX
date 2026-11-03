# Worktello in Outlook web — 25 October 2026

## Confirmed diagnosis

Outlook Apps lists the existing Worktello catalog app and opens its personal tab, but its iframe displays “refused to connect”. Live `/integrations/teams/app` CSP omitted `outlook.office.com`. It allowed Teams/cloud hosts only. There was no conflicting X-Frame-Options response header. Separately, the API verifier accepted only the two Teams client IDs, so embedding alone would not complete Outlook SSO.

## Scoped resolution

Add exact production Outlook web ancestors `https://outlook.office.com` and `https://outlook.office365.com` only to the existing `/integrations/teams/:path*` rule. Do not disable framing protection or add wildcard Office hosts. Add only Outlook web public client `bc59ab01-8403-45c6-8796-ac3ef710b3e3` to the signed v2 delegated-token client allowlist. Keep signature, issuer, audience, tenant, object ID, expiry, access_as_user and staff authorization unchanged. Desktop/mobile/M365 clients remain rejected. Tokens remain memory-only, omitted from cookies/URLs/storage/logs.

Microsoft reference: https://learn.microsoft.com/en-us/microsoftteams/platform/m365-apps/extend-m365-teams-personal-tab

Owner explicitly confirmed authorizing Outlook web at action time. Authorization saved and persisted: both existing Teams clients and the new Outlook web client are listed with one scope each.

Entra COEX Teams registration `0ee8f3f6-879a-4cf0-95d0-9321696f4473` must preauthorize that Outlook web client for the existing access_as_user scope. No new Graph permissions or API scope. Browser policy requires action-time confirmation before adding this new authorized client; prepare the concrete scope/client selection before requesting it. Existing Teams clients and catalog identity remain unchanged. No package version change needed for this server/auth compatibility correction.

## QA and deployment

Focused header/token tests passed (16); all 52 unit files / 348 tests, TypeScript, ESLint, CI formatting and local 75-page production build passed. PR #44 CI 40151295347 and merged-main CI 40151475205 passed. Isolated server build passed; application merge d547d256076993fa6fc627c121821adc786cef4e deployed. No worker code or restart needed. No production email contents will be copied into tasks and no test task/time entry will be created. Verify real Outlook web SSO/list/detail and existing Teams compatibility after rollout. Outer platform badge does not establish desktop/mobile or email-action support.

## Verified live result

- Owner action-time authorization saved in Entra: Outlook web client and both existing Teams clients persisted, one existing scope each. No extra Graph scope or desktop/mobile/M365 client added.
- Active green `coex-app-green` id13 / PID318054, loopback3002, `/srv/coex/releases/outlook-web-20261025`, application merge `d547d256076993fa6fc627c121821adc786cef4e`. Blue id9 / PID302605 on3001 is fallback. Workers10/11/12 unchanged in `/srv/coex/releases/worktello-20261025`; no worker restart or migration for this web-only fix.
- Backup: `/srv/coex/shared/backups/coex-2026-10-25-0537.archive.gz` and `files-2026-10-25-0537.tar.gz`. Proxy snapshot `/srv/coex/shared/apache-before-outlook-20261025054347/`; monitor `/tmp/coex-outlook-switch-20261025054347.log`,40/40 HTTPS 200. Owner standing logout policy revoked 1 old tenant session at 2026-10-25T01:43:47Z. No repeated expiry for documentation sync.
- Real Outlook web SSO loaded My Tasks and accessible actual task detail. Assignment, own timer/manual time and updates controls rendered. No create, assignment, time entry, message or share-send mutation performed. Screenshot uses a deliberate no-match search to exclude business records; it is a live UI capture, not a mock or an empty account.
- Before/after assets are stored locally under `docs/manual/assets/`. Desktop/mobile clients and Outlook email-message actions are not enabled/accepted by this fix. Fresh Teams web SSO/list and blank create-form reads passed after rollout. No Teams mutation sent.
- Rollback: first verify blue3001 login200, restore the canonical proxy snapshot or change both mappings3002→3001, configtest and graceful reload. Keep workers untouched. Old blue does not support Outlook framing/client; rolling back web restores the original Outlook failure. If rolling back this capability entirely, remove only the added Outlook client preauthorization through an authorized administrator, preserving both Teams clients. No browser protections should be disabled.


Canonical dated resolution. The legacy `../OUTLOOK-WEB.md` file points here; update this record for future evidence.


## Approval evidence

Prepared approval screen: `assets/outlook-authorization-review.png` (before saving). Saved authorized-client list: `assets/outlook-authorization-saved.png`. Both contain public registration/client IDs and business-account labels only; no credentials or tokens.


## Final verification and manual

Both fresh backup archives passed integrity/readability checks. Public header includes only the two exact Outlook web ancestors in addition to the existing Teams/cloud allowlist; no-store retained. Five application process trees remain online on Node 22.23.4; worker PIDs/restarts unchanged. Zero matching old unexpired sessions remain and one later session is valid. Teams shell now also shows Worktello in the fresh regression view. User guide: `../manual/index.html#outlook`; provenance: `../manual/assets/manifest.json`; QA/device/print limits: `../manual/QA.md`. Local/GitHub manual and dated resolution records are synchronized through the documentation follow-up.

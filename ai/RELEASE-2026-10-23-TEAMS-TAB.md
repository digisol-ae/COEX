# COEX Teams personal tab — deployment — 23 October 2026

PR #38 https://github.com/digisol-ae/COEX/pull/38 merged as 6dfcf1509c46b1963c0e8de886adfe58c6ba004e. PR CI https://github.com/digisol-ae/COEX/actions/runs/39902606641 and merged-main CI https://github.com/digisol-ae/COEX/actions/runs/39905072621 passed. Source package 1.1.0 preserves existing app ID and compose extension, adds static personal tab and SSO resource.

## Validation / limits

46 unit files / 298 tests passed, full typecheck/lint/format passed, local Webpack and isolated server native builds passed (73 pages). Synthetic browser UI checked 9 view/width combinations (tasks/detail/create at 320/768/1440), no overflow; creator-default create, posting update, My subtask done/restore passed. This uses a temporary isolated browser fixture, not real Microsoft identity or database. Existing message form remains separately supported. Full attachment management/editing opens the ordinary COEX website.

Live login/privacy/terms/dialog/tab return 200; tab permits intended Microsoft frame ancestors and no-store. Personal API rejects anonymous and invalid bearer 401. Existing cancelled Microsoft browser callback still returns 307 to public HTTPS login. No actual Microsoft-signed personal-tab token or user task/create/mail exercised by deployment QA. Entra settings and consent are owner-reported, not inspected programmatically; real installed Teams desktop/web/mobile SSO, data/permissions and notification acceptance remain required. SSO tokens never stored in browser storage/cookies/URLs; active linked staff/tenant/module/task permission and existing Space/folder checks apply on each request. New TeamsTabReceipt collection is created on demand for permanent per-actor request idempotency; no TTL cleanup.

## Operations

Fresh backup archives coex-2026-10-23-0919.archive.gz and files-2026-10-23-0919.tar.gz in /srv/coex/shared/backups. New isolated release /srv/coex/releases/teams-tab-20261023 links existing private .env; package-lock matched active build and native same-host node_modules copied without changing active installation. Prior server-action encryption compatibility retained privately, old hashed static chunks copied without overwriting new ones.

Active green id 8 / PID 214898 / port 3002; blue id 7 / PID 184237 / port 3001 is warm fallback. Original old green id 6 retired before reusing its port, while blue served traffic. Mail 159658, desk-close 159673, channels 159698 remain once each in /srv/coex/app, restart counts 3 unchanged. Five intended PM2 entries saved. Apache canonical COEX vhosts target 3002, snapshots /srv/coex/shared/apache-before-teams-tab-20261023092338; monitor /tmp/coex-teams-tab-switch-20261023092338.log, all 40 requests 200. Bounded monitor evidence, not a guarantee of every user request/workflow.

Owner-authorized tenant-scoped existing-session expiry: 7 revoked at 2026-10-23T05:23:38Z; read-only check confirms 0 old unexpired sessions remain. New logins after cutoff preserved; guards require sign-in on next protected request/navigation. No immediate client redirect or saved-unsent-draft claim. This ordinary COEX session expiry does not revoke Microsoft bearer tokens; inactive COEX users/permissions are rechecked separately in the tab.

Rollback: verify blue port 3001 healthy, restore both COEX mappings 3002→3001 or snapshots, configtest/graceful, verify HTTPS. Do not stop current slot until fallback healthy; never restart/duplicate workers. Source docs-only follow-up requires no rebuild/restart/session expiry. Preserve unrelated projects/.

## Remaining pilot and documentation

Install/update existing organisation COEX Teams app using /Users/syedali/Downloads/COEX-Teams-1.1.0.zip; do not submit duplicate app. Owner reported API URI moved from website registration 5f29d831… to correct COEX Teams 0ee8f3f6… registration, access_as_user scope, desktop/mobile 1fec… and web 5e3… preauthorization and api.requestedAccessTokenVersion = 2 saved. Screenshot showed scope under the correct Teams registration; final web/v2 settings owner-reported. Do not change website OAuth callbacks/secrets. Setup steps and file purposes in docs/TEAMS-PERSONAL-TAB.md. What's new deferred until users can access and pilot acceptance; no premature feature announcement.

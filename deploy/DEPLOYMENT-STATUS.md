# COEX live deployment

## Section-aware header search live — 25 October 2026

PR #53 merged as 9d8e10ef66c3e026c7622ba743ff48018f4c152b. Compiled application tree33ef43d (b9f32d7 only preserves generated manual formatting). Active green coex-app-green id17/PID356977, port3002, /srv/coex/releases/section-search-20261025; both canonical Apache proxies target3002 and PM2 is saved. Patched Node22.23.4 verified for launcher and actual Node descendants. Blue coex-app id16/PID352576 on3001 remains the immediate rollback; osTicket3003 also remains. Workers10/11/12 retain the same PIDs and zero restarts.

PR and merged-main CI passed, 402 unit tests, workspace types/lint/format and server production build passed. Twenty HTTPS switch samples returned200. In a separate authenticated browser tab: Tickets header returned only ticket suggestions including resolved/closed history, Enter applied the query to the existing list and header; a lower-list query update appeared in the header; Customers changed to Search customers with Customer name hint. Existing lower search/filter component is unchanged. Original user tab preserved; no business records/messages modified. Private UI evidence: exports/osticket_db/section-search-live.png. Native mobile/touch and every CRM write flow were not exercised.

Rollback: verify http://127.0.0.1:3001/login returns200, restore http-before.conf and https-before.conf from /srv/coex/shared/backups/section-search-20261025 into canonical Apache vhosts, configtest and graceful reload. Keep data/workers intact. That private directory contains the PM2/environment snapshot and must never be published. Documentation-only follow-up requires no runtime restart.


## Expanded ticket search live — 25 October 2026

PR #51 merged as 584458b3f70da069151df3a3544e4740fa355eb7; compiled application tree b679117. Active blue coex-app id16/PID352576 on3001, /srv/coex/releases/ticket-search-20261025. Both canonical Apache proxies target3001; PM2 saved. Patched Node22.23.4 verified for the launcher and actual Node descendants. Previous osTicket release id15/PID344722 remains available on3003 as rollback; green3002 and workers10/11/12 unchanged (same PIDs, zero restarts).

PR/main CI passed, 390 unit tests, workspace types/lint and local/server builds passed. Disposable Docker integration verified field coverage, phone formats, phrases, filters and tenant/assignment/portal privacy. Read-only production queries matched expected migrated tickets by number, contact name/email, phone and conversation keyword. Authenticated separate browser tab verified customer/contact matches with resolved/closed results, exact phrase submission, and Clear search returning an empty input/Open scope. Original user tab preserved. Twenty HTTPS switch samples returned200. No business record or email mutation used for acceptance.

Rollback: verify http://127.0.0.1:3003/login returns200, restore http-before.conf and https-before.conf from /srv/coex/shared/backups/ticket-search-20261025 into the canonical Apache vhosts, configtest and graceful reload. Preserve database and workers. Private PM2/environment snapshot is in the same directory; never publish it. Source snapshot/attachment limitations of the earlier migration remain unchanged. Phone acceptance used read-only service queries; mobile-device visual QA was not exercised.

## osTicket migration live — 25 October 2026

Application PR #49 merged as d82a5bff0181baf44bed02a442b3ab0cf0f801c7; compiled application tree is 6404f99. Active candidate is coex-app-osticket, PM2 id15, port3003, /srv/coex/releases/osticket-20261025. Both canonical Apache proxies now target3003. Blue3001 and green3002 remain warm rollback releases; three workers were not restarted. Explicit patched Node22.23.4 interpreter is used. Do not infer active application revision from the older /srv/coex/app checkout.

Production reconciliation: 4,983 tickets (16 open, 4,069 resolved, 898 closed), 19,787 ticket messages, 2,798 internal notes, 420 new invited customer accounts, eight preserved staff identities and 428 source contact mappings. Final contact/account relationship mismatches: zero. 397 source contacts remain customer-unassigned; no name/domain-only identity merge was performed. 424 contacts were newly created; four existing contacts were reused. One ambiguous existing CRM contact was preserved and a separate unassigned migration contact created; 27 imported requester links and 27 author links were corrected. Source Web channels are preserved as portal rather than staff-created tickets. Two conflicting ticket numbers retain original references and source-ID suffixes.

Validation: PR and merged-main CI passed, 55 unit files /384 tests, workspace types/lint and production builds passed. Isolated integration tested OTP request/resend/expiry/attempt limits, verification concurrency, code/token replay, password policy, activation, unassigned own-ticket privacy, public replies, other-contact denial and internal-note exclusion. Live activation page and authenticated migrated-ticket list/detail were read in separate browser tabs; original dashboard tab preserved. Twenty switch health samples returned200. Actual SMTP Admin connection/authentication verified without sending a message. A real customer inbox delivery/password activation was not exercised; do not claim that acceptance. No bulk activation mail was queued by migration.

Private backup: /srv/coex/shared/backups/osticket-migration-20261025/before-import.archive.gz (gzip integrity and mongorestore dry-run passed); local copy retained in exports/osticket_db. Source staging, import mappings, reconciliation and Apache rollback snapshots are private under that server run directory. Attachments remain explicitly deferred and their payload backup is incomplete. The migration reflects the verified export snapshot; continuous sync and old helpdesk/mail-routing cutover are not configured.

Rollback app: verify3001 login200, restore apache-http-before.conf and apache-https-before.conf from the private run directory, apachectl configtest and graceful reload. Preserve database while assessing rollback; never automatically restore over concurrent user work. New accounts remain invited until the user initiates OTP and chooses a password.

## Microsoft 365 workspace live; Copilot actions unaccepted — 25 October 2026

Application76cac60 (PR46) is live on blue3001: coex-app id14/PID329947, /srv/coex/releases/copilot-pilot-20261025. Green13/PID318054 on3002 is warm fallback; workers10/11/12 unchanged. CI/local/server checks passed,40/40 HTTPS200. Catalog1.3.0 and real Microsoft365 SSO/list verified. Copilot agent loads but action tools are unavailable; pilot account lacks Copilot add-on. No live task/time/email mutation. All owner-approved Entra additions persisted; no paid license/billing enabled. Exact evidence, rollback and remaining acceptance: ai/RELEASE-2026-10-25-COPILOT.md. Local checkout is now /Volumes/sd-mac/Developer/DigiSol/worktello. Cloud manual AI needs a separate configured API key; packaging-only acceptance must not be called AI-writing acceptance.

## Outlook web fixed; local interactive manual added — 25 October 2026

Application `d547d25` (PR #44) is live. Exact Outlook web embedding hosts and Microsoft client were added while retaining signed-token, tenant, scope and staff checks. Owner explicitly approved Entra preauthorization at action time; persisted state verified. All 348 tests, types/lint/format, local/server 75-page builds and PR/main CI passed. Real Outlook web SSO/list/detail and blank create-form rendering passed; fresh Teams web SSO/list/create-form reads also passed. No production task/time/message/assignment/import mutation for the demonstration.

Active green `coex-app-green` id 13 / PID 318054 on 3002, `/srv/coex/releases/outlook-web-20261025`; blue id 9 / PID 302605 on 3001 remains fallback. Workers 10/11/12 remain unchanged in `/srv/coex/releases/worktello-20261025`. All five Node process trees 22.23.4 verified. 40/40 switch samples succeeded; 1 old tenant session revoked at 2026-10-25T01:43:47Z, zero old unexpired remain and one later login preserved. Full scope/backup/rollback/evidence: `docs/resolutions/2026-10-25-outlook-web.md`.

Manual: `docs/manual/index.html` (27 chapters, searchable role guides, reading checklists, image zoom and print option), canonical content.json, generated offline content.js, CSS/JS, actual safe screenshots/provenance and QA limits. Seven documented resolutions indexed in `docs/resolutions/README.md`; each future resolution must update the dated record, manual and local screenshot evidence. Portable package: `outputs/manual/Worktello-Manual-2026-10-25.zip`. Source/assets remain organized in the local SSD checkout and GitHub; secrets/private environments/backups/business exports are excluded. Manual is a repository/local artifact, not a newly public production route. Desktop/mobile/write-flow and physical-print limits are explicit in `docs/manual/QA.md`.

## Completed-work release deployed — 25 October 2026

Application `4701314` (PR #42; branding #40 and Node #41 included) is live at https://coex.digisol.ae. Fresh 342 unit tests, types/lint/format, Docker CSV/Gantt integration, local/server 75-page builds and PR/main CI passed. Active blue `coex-app` id 9 / PID 302605 on 3001; green id 8 / PID 303896 on 3002 remains fallback. Three workers now run in `/srv/coex/releases/worktello-20261025` (mail 10, desk-close 11, channels 12), not the original checkout. All five application process trees verified Node 22.23.4; PM2 saved. 40/40 switch health samples succeeded ; 20 old tenant sessions expired, zero old unexpired remain, later login preserved.

Existing Teams catalog app updated to Worktello 1.2.0 and verified after reload. Real Teams web SSO/list reads and ordinary web Microsoft sign-in passed; full role/device/write pilot remains. What's new contains user-facing planning/Teams/data-transfer features plus generic maintenance counts, no branding announcement. Full backup, PIDs, CI, limitations and rollback: `ai/RELEASE-2026-10-25.md`; operating guide: `deploy/ZERO-DOWNTIME.md`. This entry supersedes earlier pending/local-only statements. Do not repeat expiry/restart for docs-only sync. Unrelated `projects/` preserved.

## Teams personal workspace deployed — 23 October 2026 (installation/pilot pending)

PR #38 merged as `6dfcf1509c46b1963c0e8de886adfe58c6ba004e`; PR CI 39902606641 and main CI 39905072621 passed. Teams My Tasks, detail/latest updates, text posting, personal completion filters and creator-default create are now served at /integrations/teams/app. Existing message action preserved. Owner reports correct COEX Teams registration URI/scope, both preauthorized Teams clients and v2 token setting saved; real Microsoft SSO and Teams desktop/web/mobile pilot still pending. Updated package 1.1.0 is in Downloads. No What's new announcement until available to users.

Active green coex-app-green id8 / PID214898, port3002, /srv/coex/releases/teams-tab-20261023. Blue coex-app id7 / PID184237, port3001, /srv/coex/releases/entra-redirect-20261022 remains warm fallback. Three workers unchanged. Native server build passed (73 pages), public tab/dialog/login/policies healthy, anonymous/invalid-token API 401; 40/40 switch samples 200. Tenant-scoped release session expiry: 7 old sessions revoked at 2026-10-23T05:23:38Z, zero matching old sessions remain. Full evidence: ai/RELEASE-2026-10-23-TEAMS-TAB.md; setup/file map: docs/TEAMS-PERSONAL-TAB.md. Docs-only sync needs no restart or further expiry. Supersedes earlier not-deployed entries. Unrelated projects/ preserved.

## Microsoft redirect and DigiSol attribution deployed — 22 October 2026

PR #36 merged as `f266afe451f3881ffd6ef707b121b0deba0a705f`; PR CI run 39806601526 and merged-main run 39807108288 passed. Microsoft callback redirects now use configured public origin instead of internal listener. Login/recovery shell shows “Powered by DigiSol” above the actual high-resolution DigiSol logo, on desktop and mobile/tablet. Legal company remains Digisol LLC-FZ in policies. No branding announcement; existing maintenance entry remains generic 3 bug fixes / 1 improvement.

Local and isolated server production builds passed (71 pages); 8 redirect regressions passed; six viewport/DPR combinations (320/768/1440, 1x/2x) showed one loaded 96px DigiSol logo and no overflow. Small-screen gutters accommodate the existing security widget without changing verification behavior. Live cancelled Microsoft callback returns the public HTTPS login URL. No actual Microsoft interactive sign-in performed; success/session-cookie coverage is mocked. See `ai/RELEASE-2026-10-22-ENTRA-FOOTER.md` for deployment evidence and limitations. This supersedes prepared entries and older slot mappings; projects/ preserved.

## Tutorial maintenance release deployed — 22 October 2026

PR #34 merged as `92525ae237c3e46723bc2461db91ccf05b1968a6` (feature `9af3896`, communication follow-up `ab04ddd`). Final PR CI https://github.com/digisol-ae/COEX/actions/runs/39802601116 and merged-main CI https://github.com/digisol-ae/COEX/actions/runs/39803184419 passed. Full local types/lint/format and **41 unit files / 262 tests** passed; isolated server build passed (71 pages). Tutorial saves now accept configured public origins behind the proxy, with admin/foreign-origin guards retained. Self-assignment email override removed as requested. What's new shows only “2 bug fixes and 1 improvement”; user-facing features/UI changes alone get detailed announcements.

**Active web: `coex-app-green` id 6 / PID 181724, port 3002, `/srv/coex/releases/tutorial-origin-20261022`.** Warm fallback: `coex-app` id 5 / PID 165915, port 3001, `/srv/coex/releases/teams-email-6a41d1f`. Exactly three workers remain unchanged in `/srv/coex/app`; five intentional PM2 entries saved. Successful graceful switch observed 40/40 HTTPS 200 responses. Owner permits brief maintenance interruption if necessary; none observed in the monitored window.

Owner-requested release logout: 23 pre-cutoff COEX tenant sessions revoked after healthy cutover; **0 pre-cutoff unexpired sessions remain**. Later logins are excluded by fixed creation cutoff. Existing auth guards return users to sign-in on their next protected navigation/request; no immediate client redirect or unsent-draft preservation claim. No account/password changes, real tutorial publication, test task or test email. Public pages healthy, tutorial metadata without auth rejected 401. Full artifacts, remaining signed-in save/playback acceptance and operating paths: `ai/RELEASE-2026-10-22-TUTORIAL-ORIGIN.md` and `deploy/ZERO-DOWNTIME.md`. Supersedes preceding local/pending and blue-active entries; later docs-only pull needs no restart. Unrelated projects/ preserved.

## Teams self-assignment email fix deployed — 22 October 2026

PR #32 merged as `530e19225b6839dd9c7446999418b07c3a5ac446` (feature `6a41d1f`). PR CI https://github.com/digisol-ae/COEX/actions/runs/39732776761 and main CI https://github.com/digisol-ae/COEX/actions/runs/39733067549 passed. Fresh local Webpack and isolated server native builds passed (71 pages). Existing self-action email suppression caused the creator-default Teams task to queue no email; Teams now opts into initial self-assignment confirmation through the shared service. Normal web behavior and tenant email switches retained; receipt retries cannot create another task/email. No backfill or real test email sent.

Focused 14 Teams unit tests, fresh web TypeScript/ESLint and isolated real queue regression passed (1 selected / 51 skipped). The queue regression checks ordinary self-action suppression, exactly one pending external confirmation with task URL, and both outbound/taskAssigned switches. Temporary loopback MongoDB avoided shared Atlas collection quota and existing server DB authentication; it was stopped afterwards. Real Microsoft-signed create + SMTP/inbox acceptance remains a user pilot, not claimed by queue/security checks. Local preview 3106 rebuilt/restarted and login 200.

**Active web is now `coex-app` id 5 / PID 165915, loopback 3001, cwd `/srv/coex/releases/teams-email-6a41d1f`, clean at application SHA above.** Apache COEX mappings target 127.0.0.1:3001. `coex-app-green` id 4 / PID 162142 remains warm rollback on 3002 from `/srv/coex/releases/logo-bb66964`. Original id 0 web process was retired only while green served traffic; `/srv/coex/app` still hosts exactly three unchanged workers (mail 159658, desk-close 159673, channels 159698; restart counts 3). Five intended PM2 entries saved. Do not treat the original checkout as the active web release.

Isolated build, preserved static chunks/action encryption compatibility, candidate health checks, then graceful Apache switch: all 40 monitor requests returned 200; no observed outage in that window. Proxy backup `/srv/coex/shared/apache-before-teams-email-20261022102033`; monitor `/tmp/coex-teams-email-switch-20261022102033.log`. Public login/privacy/terms/Teams dialog 200; unsigned Teams invoke 401. No DB/schema/configuration-secret change. This supersedes prior green-active and pending entries. A later docs-only pull requires no rebuild/restart. Current operating/rollback guide: `deploy/ZERO-DOWNTIME.md`; unrelated `projects/` untouched.

## Responsive logo release live — 22 October 2026

PR #30 merged as `a5d5356f4d903556df8cf01217e38d64c49c9de9` (feature `bb66964`). PR CI https://github.com/digisol-ae/COEX/actions/runs/39729739615 and main CI https://github.com/digisol-ae/COEX/actions/runs/39730246182 passed. Server isolated native build passed (71 pages). Transparent 1496×328 wordmark and 512×512 monogram generated from source SVGs; shared responsive sizes and theme-aware dot retained. No What’s new logo entry; unrelated `projects/` excluded.

**Active web app is now `coex-app-green`, PM2 id 4 / PID 162142, loopback port 3002, cwd `/srv/coex/releases/logo-bb66964`, clean at application SHA above. Apache COEX HTTP/HTTPS proxy targets 127.0.0.1:3002.** Prior app `coex-app` id 0 / PID 159645 remains on 3001 for rollback; its `/srv/coex/app` checkout remains the prior docs revision. Three workers remain there, unchanged PIDs 159658/159673/159698 and restart counts 3. Five intentional PM2 entries: two web slots plus exactly three workers; PM2 saved. Do not run the old in-place release script assuming `/srv/coex/app` is the active web slot.

Built separately while the original app served users, retained old hashed static chunks and privately reused its server-action encryption key. Candidate pages/assets checked before graceful Apache switch. All 40 HTTPS monitor samples returned 200; no observed outage in that window and no existing process restart. Previous COEX vhost content backed up under `/srv/coex/shared/apache-before-logo-20261022095700`; monitor `/tmp/coex-logo-switch-20261022095700.log`. Canonical sites-available configs and standard enabled symlinks synchronized; Apache config test passed. No DB/schema change, new secret, live test task or external message.

Shared-component fixture AND live public login passed 320/390/768/1024/1440px at DPR1/2, with no horizontal overflow. Mobile light/dark fixture and live 320px login screenshots inspected. This verifies logo/public-page responsiveness, not every authenticated screen; Windows Edge-specific visual acceptance remains owner-side. Evidence in `/private/tmp/coex-logo-quality/` (`results.json`, `live-results.json`, responsive/live-login PNGs). `.tsx` renders the shared logo; `.mjs` regenerates PNG/icon assets; `.md` records handover. Operational follow-up and rollback: `deploy/ZERO-DOWNTIME.md`. This entry supersedes earlier local-only and single-web-process notes; a subsequent docs-only pull needs no rebuild/restart.

## Single-screen Teams and COEX branding deployed — 22 October 2026

Owner-authorised application rollout completed. PR #28 merged as `e70f8c0f166beaa53fd7e8eb22662d4b633ab5bf` (feature commit `1b95fc8`). PR CI https://github.com/digisol-ae/COEX/actions/runs/39727006511 and merged-main CI https://github.com/digisol-ae/COEX/actions/runs/39727214405 passed. Workspace types/lint, formatting, **41 unit files / 255 tests**, final CI build and server native Turbopack build (**71 pages**) passed. Production-only dependency audit: **0 vulnerabilities**; overall dependency audit retains 8 development findings (2 moderate, 6 high), no forced upgrades.

Server `/srv/coex/app` clean at application SHA after release. Exactly one each `coex-app` PID 159645, `coex-mail` 159658, `coex-desk-close` 159673, `coex-channels` 159698 online; one added restart per service (cumulative 3), PM2 saved. Backup before release: `/srv/coex/shared/backups/coex-2026-10-22-0913.archive.gz` (483K) and `files-2026-10-22-0913.tar.gz` (14M), server timestamp +04. Existing runtime secrets/settings retained; no new secret/configuration change.

Public HTTPS checks: `/login`, `/privacy`, `/terms` return 200 and contain final tightly cropped theme-aware inline COEX wordmark. Public wordmark, monogram, SVG browser icon, Apple icon and favicon **all five SHA256 hashes match** local release files. `/integrations/teams/create` returns 200 with intended framing CSP/no-referrer headers. Invalid form token rejected 403; well-formed unsigned Connector invoke rejected 401. No live task created and no email/chat sent for verification.

Includes one-screen Space/Folder/Assignee/Date/Time controls with eligible creator default and existing Asia/Dubai office-time semantics; new product branding/icon set and simplified Teams release wording. **No logo entry in What’s new**, as explicitly requested. Claude follow-up inline component from `d455107`/`3febced` incorporated with corrected local canvas/sizes. Browser/native signed-in dashboard visual acceptance and actual Microsoft-signed Teams message-to-task pilot remain pending; HTTP/security checks are not that acceptance.

Branded Teams installer `/Users/syedali/Downloads/COEX-Teams-1.0.1.zip` validated against Microsoft schema. SHA256 `004ec5edd9e1289843143c0ba9352c8339e98036e32eb91a5bf4cef404ac09d3`; old 1.0.0 package preserved. Single-screen server change uses existing valid domain; installation/update to 1.0.1 supplies new Teams artwork. No Teams app upload/install performed. Next: install/update and test real message action, creator default, destination privacy, chosen date/time and one saved task/source link.

Developer guides: `docs/MICROSOFT-TEAMS.md`, `docs/BRANDING.md`; release evidence: `ai/RELEASE-2026-10-22-TEAMS-BRAND.md`. This completed outcome supersedes prior local-only/pending rollout entries. Separate `projects/` untouched/untracked. A subsequent docs-only merge/pull records this outcome; no application rebuild or extra PM2 restart needed for those Markdown-only changes.

## Teams backend and policy deployment verified — 22 October 2026

Owner authorised complete rollout with guided explanations. Application PR #26 merged as `77e84585ce0626aa8f9dbcddf5bb2518ec5bb5ab`; PR CI https://github.com/digisol-ae/COEX/actions/runs/39721227941 and main CI https://github.com/digisol-ae/COEX/actions/runs/39721496951 passed. Local full workspace types/lint, 40 unit files / 249 tests, formatting, Microsoft Teams manifest schema and local/server builds passed; server native Turbopack build generated 67 pages.

Server `/srv/coex/app` clean at application SHA after deploy, four expected PM2 processes online with no duplicates and one additional restart each (cumulative restart count 2). Backup before release: `coex-2026-10-22-0813.archive.gz` (481K), `files-2026-10-22-0813.tar.gz` (14M), under `/srv/coex/shared/backups` (server timestamp). Teams environment configured without exposing credentials; draft secret generated privately, prior environment backed up mode 600. Existing Microsoft sign-in issuer matches directory; active linked-account count 8. Production dependency audit: 0 vulnerabilities; all-dependency report has 8 development findings (2 moderate, 6 high), no forced upgrades.

Live verification: https://coex.digisol.ae/privacy, /terms and /login return 200; operator Digisol LLC-FZ, contact info@digisol.ae and public policy links verified. Teams endpoint returns 401 for well-formed unsigned invoke (configured and refusing unauthenticated access). No real Teams invoke/task creation yet. ZIP `/Users/syedali/Downloads/COEX-Teams-1.0.0.zip` prepared; SHA256 `2b0fe5e748e09a271c6bb5f4d536fd65d52dbcef0b573d7f54fd7e9a150ce72d`. Microsoft schema validation passed, Developer Portal/client installation acceptance remains pending.

Next: user installs ZIP through Teams approved custom-app process, then validate actual message action, linked staff identity, destination/eligible assignee, one saved task/source link and duplicate prevention. Native browser automation unavailable; no visual/Teams end-to-end claim. Public policy deployment completes; **Teams installation and functional pilot remain open**. No separate `projects/` files committed. File-type explanations are in `ai/RELEASE-2026-10-22-TEAMS.md`; implementation/operating guides in `docs/MICROSOFT-TEAMS.md` and `docs/LEGAL-PAGES.md`. Subsequent docs-only pull requires no application rebuild/restart.

## Release completed and verified — 21 October 2026

- Application release: PR #24 merged as `ad6b8a6c5bd70df876e90709e2f33d96036ca851`; feature commits `c8b7422` and `0ed801d`. GitHub CI passed: https://github.com/digisol-ae/COEX/actions/runs/39652933754.
- Local validation: workspace types/lint, 37 unit files / 227 tests, formatting, diff checks and production Webpack build passed. Server native Turbopack production build passed, generating 64 pages. Scoped browser QA evidence remains in docs/qa/QA-2026-10-21-TASK-IMAGES.md. Full database suite was not rerun.
- Server `/srv/coex/app`: clean `main` at the application release SHA, verified after deployment. Exactly one each `coex-app`, `coex-mail`, `coex-desk-close`, `coex-channels` online, restarted once and PM2 saved. Public HTTPS login returns 200 and contains the new customer/agent entry; public Home icon SHA256 matches the server asset. No duplicate workers or unrelated server changes.
- Backup completed before pull: `/srv/coex/shared/backups/coex-2026-10-21-2228.archive.gz` and `files-2026-10-21-2228.tar.gz` (server timestamp). SSH uses existing `~/.ssh/contabo.pem` as digisol. App listens on port 3001; deployment ran `COEX_HEALTH_URL=http://127.0.0.1:3001/login bash deploy/release.sh`.
- `npm ci` reported 6 high findings across all dependencies; `npm audit --omit=dev` reported **0 production vulnerabilities**. No forced dependency updates made.
- Separate `projects/done-coex-integration` documentation remains untracked locally and was not uploaded. No real customer/test records migrated, no draft tutorial published. Existing QA findings and tiny-image 0 KB label remain documented.
- This outcome supersedes earlier pending/local-only/approval-blocked entries. A documentation-only follow-up records the release; pulling that follow-up does not require rebuilding unchanged application code.

## Release resumed — 21 October 2026

John explicitly confirmed full access and requested completion after reviewing the proposed mixed COEX bundle. Proceed with the proposed COEX application/docs/tests/assets, excluding separate projects/done-coex-integration files. This supersedes the earlier scope-approval pause. Preserve the existing remote handoff commit, verify GitHub CI, then deploy and verify the server.

## Release preparation — 21 October 2026

John requested Markdown updates, commit, GitHub upload and app-server pull. Full workspace typecheck/lint, 37 unit files / 227 tests, production Webpack build (64 pages), formatting and diff checks passed. Scoped task-image browser QA passed; older full-QA findings and small-image 0 KB display remain documented. No full DB suite rerun.

GitHub PR #24 is open. Remote feature branch contains one earlier handoff commit to preserve. Server preflight verified clean main at 9703f432fd8053c0fff6ac7dd138867b8fbaf9af, exactly one of each four COEX PM2 services online, and SSH works with ~/.ssh/contabo.pem as digisol.

Automatic approval review rejected the proposed broad mixed-worktree commit as insufficiently scoped (portal, CRM, project and docs changes beyond the reviewed agent candidate). No files staged, no commit/push/merge or deployment. Exact proposed COEX bundle and excluded separate dOne project files: ai/COMMIT-SCOPE-2026-10-21.md. Await explicit scope approval before the broad commit.

## Local continuation snapshot —21 Oct2026

See [compact context](../ai/CONTEXT-2026-10-21.md) for local changes through21 October. Documentation consolidation did not deploy or refresh remote/server state. Do not infer any production revision from local build results; verify current remote SHA/workers/HTTPS before an explicitly authorised release.

## Local addition — 19 Oct 2026

CRM contact edits, existing-ticket customer/contact linking, 15-second/manual refresh and contract sender/To/CC controls are local only. No push, merge or VPS deployment. Validation and pending browser acceptance: [release handoff](../ai/RELEASE-2026-10-19.md).

## Customer portal local release addition — 18 Oct 2026

- T6 is now implemented locally: `/portal`, own tickets only, linked client accounts, public replies and safe attachments. See docs/CUSTOMER-PORTAL.md and newest ai/HANDOFF.md section for QA evidence.
- Uses existing MongoDB user/contact links; no migration. Requires an active default support queue and explicit admin account provisioning through Customer → Contacts. No real accounts provisioned in this run.
- Not committed/pushed/merged/deployed. Verify deployment/worker state and complete release acceptance before publishing the code. Existing local tutorial remains a draft, not auto-published by this change.

## Local handover clarification — 18 Oct 2026 (Codex)

- New UI/tutorial work is LOCAL and UNCOMMITTED; not deployed and not yet included in PR #24. PR #24 is open at `b0db354`; main remains `9703f43` (PR #23), verified against GitHub.
- Claude's 18 Oct handover reports production through PR #23 and release.sh tested. The older entry below confirms PR #21 from John's report; VPS HEAD and PM2 were not independently checked in this chat. Do not present either note as a fresh live-server verification.
- Full release verification is still required before any deployment. John deploys himself with `cd /srv/coex/app` then `bash deploy/release.sh` when authorized. No server commands were run by Codex.
- Inventory and remaining QA: `ai/RELEASE-2026-10-18.md`. Tutorial draft creation in the local application is not publication to users; current Create ticket tutorial remains a draft.

## Deployed — 16 Oct 2026, 4d95d74 (Claude, run by John)

- PR https://github.com/digisol-ae/COEX/pull/21 merged into main as `4d95d74`; John ran the usual
  redeploy (ff-only pull, npm ci, build, restart of coex-app, coex-mail, coex-desk-close and
  coex-channels with --update-env, pm2 save) and reported everything fine. A first attempt earlier
  that day pulled only documentation because the PR was not yet merged; check the pull output lists the
  code files.
- Live now: team feedback T1 to T5, T7, T8, T11, T12, Assigned by me, browser notifications, Dark theme
  fixes, the new menu and phone menu, What's new `2026-10-15`. Leads on the API stays OFF.
- Open: confirm `scripts/copy-planned-to-estimate.ts` was run (dry run, then `APPLY=1`); `npm ci` on the
  server reports 5 high severity packages, `npm audit --omit=dev` not yet checked.

## Release ready for production — 16 Oct 2026 (Claude)

- Branch `claude/gallant-faraday-r1u4g8` (not yet merged to main): team feedback T1 to T5, T7, T8, T11,
  T12, Assigned by me, Dark theme fixes, browser notifications, phone menu, Leads on the API behind a
  flag (OFF: `COEX_API_MODULES` unset, so no API process is needed). John ran `npm test` on his Mac
  (all passing so far) and checked the app locally. Production build, typecheck, ESLint and unit tests
  pass in a scratch copy.
- Deploy as usual (fresh terminal, backup first): ff-only pull, `npm ci`, `npm run build`,
  `pm2 restart coex-app coex-mail coex-desk-close coex-channels --update-env`, `pm2 save`.
- After deploy, once: `npx tsx --env-file=.env scripts/copy-planned-to-estimate.ts` (dry run), then
  `APPLY=1 npx tsx --env-file=.env scripts/copy-planned-to-estimate.ts`.
- Check afterwards: sign in with Microsoft and with a password; a task start time of 9:00 stays 9:00;
  resolve a test ticket with a timer running; the phone menu on a real phone.

## Release pending — 3 Oct 2026

John authorized today’s commit/push and server pull. Feature commit `955ea3f` exists locally
on `claude/dreamy-carson-86yxhh`; documentation-only handover follow-up follows it. Local unit/types/lint/format checks pass.
Native build, focused DB tests and GitHub CI remain required before live pull. Server HEAD and
process state have not been reverified; last documented live revision remains dd037e6.
No push or deployment performed by this preparation.

Live at `dd037e6` since 1 Oct 2026 (PR #2, Team history; PR #1 before it). Pending: PR #3
(task origin), merged to main, waiting for John's deploy. See ai/HANDOFF.md, START HERE.

## Deployed — 1 Oct 2026, 126767a (Claude)

- PR https://github.com/digisol-ae/COEX/pull/1 merged into main as `126767a` (CI green) and
  deployed by John: pull, npm ci, build, restart of coex-app, coex-mail and coex-desk-close with
  --update-env, pm2 save. VPS HEAD `126767a`; pm2 shows one of each, all online.
- Live now: Back arrow, task status picker on the task page, tooltips kept on screen, Personal
  and Space pages listing only their own tasks, What's new `2026-10-01-b`.
- Open item: `npm ci` on the VPS reports "1 critical severity vulnerability". Not investigated
  yet; never run `npm audit fix --force` on the server.

## Deployed and verified — 1 Oct 2026 (Claude)

- VPS /srv/coex/app is at 7afa81e, the same as GitHub main. John ran the deployment by hand:
  ff-only pull, npm ci and npm run build (only the four known storage.ts tracing warnings),
  then restarted coex-app and coex-mail with --update-env.
- coex-desk-close was already running, so `pm2 start` added a second copy. The extra copy was
  deleted, the remaining one restarted with --update-env, and pm2 save run again. pm2 now shows
  exactly one each of coex-app, coex-mail and coex-desk-close, all online. The desk-close
  worker logs "starting (office tz Asia/Dubai)". ".env.local not found" in its error log is
  harmless.
- https://coex.digisol.ae/login returns HTTP/1.1 200 OK.
- On future redeploys, run `pm2 restart coex-desk-close --update-env`; never `pm2 start` it again.
- The deployment blocker is cleared. The authorized Mac shutdown may proceed.

## Verified release outcome — 1 Oct 2026

- Release commit bd65e26dabadb97d9537a215512968e1e4f0484d is pushed to GitHub main.
- Exact release CI is green (install, types, lint, formatting, unit tests and production build):
  https://github.com/digisol-ae/COEX/actions/runs/36775161483
- Full isolated QA passed 208 tests; final unit run passed 79, and the final focused desk/status
  database run passed 5. Final source/build/browser checks are recorded below.
- VPS deployment did not happen: the documented SSH key is blocked by macOS privacy access;
  agent authentication failed, Terminal AppleEvents timed out, and Computer Use denied Terminal.
  No server configuration, processes or data were changed. Keep the existing authorized release
  deployment pending until John can resolve native SSH access.
- Mac shutdown was not performed because the requested deployment could not be completed and
  verified. Claude's next step is the deployment procedure below, then the authorized shutdown.
- A documentation-only follow-up records this outcome; use the source release SHA above to
  identify the tested feature bundle. Temporary QA env copy removed; real env files untouched.

## Release ready; deployment blocked — 1 Oct 2026

- John authorized commit, push and deployment of the current local bundle, followed by Mac
  shutdown after verification. Local build/types/lint/format, database and browser QA pass.
- VPS revision/process status remains unverified. Codex SSH was refused because macOS denied
  the Downloads SSH key; agent fallback failed. Terminal access is blocked. No live change made.
- Deployment requires native terminal access to the existing key. Follow ai/HANDOFF.md's
  newest release section. Preserve Apache/Zabbix; no OS patching or new proxy is required.
- After a clean --ff-only pull, run npm ci and npm run build, restart both coex-app and coex-mail
  with --update-env. Start or restart coex-desk-close using npm run desk:worker, then pm2 save.
  Verify the exact deployed SHA, all processes and public HTTPS before shutting down the Mac.

## Local release preparation — 1 Oct 2026

- Desk-close scheduling/retry and lint defects fixed locally; TypeScript, 69 unit tests and
  production build pass. Full database QA last passed on 30 Sep before these fixes.
- Worker changes are uncommitted; deployment remains unverified. No server access in this
  continuation. Continue local QA; deployment is not part of the current work.

## Verification — 30 Sep 2026

- Public login responds HTTP 200.
- GitHub main is 0f5e858. VPS HEAD and pm2 process state could not be checked because macOS
  denied access to the SSH key. Do not assume the uncommitted desk-close worker is deployed.
- Current local QA: 189/189 pass; TypeScript/build pass. CI lint and desk-close timing/retry
  issues remain release blockers. See ai/HANDOFF.md.

This is what is ACTUALLY running, for a fresh session. It diverges from DEPLOY.md:
the live box uses pm2 (not systemd) and a single app dir (not releases/current).
Follow this file for the live server; DEPLOY.md is the original design only.

## Deploy history

- 19 Sep 2026: first deploy, fresh seed (after the Spaces change, so no `migrate:spaces` needed).
- 22 Sep 2026: Batch A redeployed; accepted by John in testing.

## Server

- Contabo VPS, host `zabbix-server`, IP 194.163.137.54, Ubuntu 24.04, 6 vCPU / 12 GB.
- SSH (verified 21 Oct): `ssh -i ~/.ssh/contabo.pem digisol@194.163.137.54`
  (this key is Raheel's, shared; rotate to John's own key later.)
- `digisol` has PASSWORDLESS sudo.
- Shares the box with Zabbix at https://nms.digisol.ae (Apache). Do NOT install nginx.
  Always `sudo apache2ctl configtest` before `sudo systemctl reload apache2` (never restart).

## COEX

- Live: https://coex.digisol.ae (Let's Encrypt cert via certbot --apache, auto HTTP->HTTPS).
- Code: /srv/coex/app (git clone of digisol-ae/COEX, main).
- Process: pm2 app `coex-app`, runs as user `digisol`, `next start` on port 3001.
  pm2 resurrects on reboot (pm2 startup + pm2 save done).
- Apache vhost: /etc/apache2/sites-available/coex.conf -> ProxyPass to localhost:3001.
- Env: /srv/coex/app/.env
  MONGODB_URI=mongodb://<user>:<password>@<host>/coex
  STORAGE_DIR=/srv/coex/shared/storage
  NODE_ENV=production
- Uploads: /srv/coex/shared/storage (owned by digisol).

## Database

- MongoDB 8.0, local only (bound 127.0.0.1), auth ENABLED.
- db `coex`, app user `coex_app` (readWrite). Node 22.23.2.

## Admin

- ali@digisol.ae (password set at seed; changeable in-app).

## Backups

- Nightly 2am cron (user digisol) -> /srv/coex/shared/backups via deploy/backup.sh
  (mongodump + tar of storage, 14-day retention). Copy off-box periodically.

## Email worker (from 24 Sep 2026)

- Fourth pm2 process `coex-channels` (from M6.1): `pm2 start npm --name coex-channels -- run channels:worker`,
  then `pm2 save`. Sends the WhatsApp outbox in test mode or XVERSE Case A.
- Third pm2 process `coex-desk-close`: `pm2 start npm --name coex-desk-close -- run desk:worker`,
  then `pm2 save`. Set `OFFICE_TZ` (default Asia/Dubai) if the office is elsewhere.
- Second pm2 process `coex-mail`: `pm2 start npm --name coex-mail -- run email:worker`, then
  `pm2 save`. It reads the same /srv/coex/app/.env. Restart it with the app after each redeploy.
- .env needs `COEX_ENCRYPTION_KEY` (openssl rand -base64 32, never change it) and
  `COEX_APP_URL=https://coex.digisol.ae`.
- Mailbox and SMTP details are entered in COEX, Setup, Email, not in .env.

## One command deploy (from 17 Oct 2026)

    cd /srv/coex/app && bash deploy/release.sh

Fetches main, stops if nothing is new, fast-forward pulls, `npm ci`, builds, restarts the four pm2
processes with --update-env, saves, then checks the login page answers. If the build or the check
fails it goes back to the previous commit and restarts, and says so. Run it outside office hours.
It does not take a backup (the 2am cron does); run `deploy/backup.sh` first before anything risky.

## Redeploy after a git push to main

    cd /srv/coex/app && git pull --ff-only && npm ci && npm run build
    pm2 restart coex-app coex-mail coex-desk-close --update-env && pm2 save

## Watch out for

- 183 pending apt updates; patch during a quiet hour before the test ends.
- Rotate off Raheel's SSH key.
- Run `npm run migrate:spaces` ONLY against a database written before the Spaces change;
  a fresh seed does not need it.

## Cutover to apps/web (12 Oct 2026, revamp Phase 1d)

The Next.js app now lives in `apps/web`. The build lands in `apps/web/.next`, not `/srv/coex/app/.next`,
so a `next start` that was started from the repository root has nothing to serve. `.env` stays at
`/srv/coex/app/.env` (the launcher `apps/web/bin/run-next.mjs` reads it). The workers, `npm run ...`
commands, port and Apache are unchanged. Do this once, outside office hours, and watch the site after.

1. Before the pull, record how `coex-app` is defined: `pm2 describe coex-app` (note "script path",
   "script args", "exec cwd" and any PORT). Take a backup first, in a subshell so the
   settings do not stay in your terminal: `(cd /srv/coex/app && set -a && . ./.env && set +a && bash deploy/backup.sh)`.
2. Pull, install and build. The old root `.next` stays untouched until you delete it, so the running
   site keeps serving while this runs:
   cd /srv/coex/app && git status --short # must be empty
   git pull --ff-only && npm ci && npm run build
   Run this in a fresh terminal. A terminal that has loaded `.env` has `NODE_ENV=production`, and then
   `npm ci` leaves out the build tools (Tailwind and others) and the build fails with "Cannot find
   module '@tailwindcss/postcss'". If you see that, open a new terminal and run it again.
3. Restart the workers as usual (they run from `apps/api`):
   pm2 restart coex-mail coex-desk-close coex-channels --update-env
4. Recreate the web process. If `pm2 describe` showed the script as `npm` with `start` in its args, a
   plain `pm2 restart coex-app --update-env` is enough (root `npm start -- -p 3001` still forwards the
   flag). In every other case (for example the script is `next` or `node_modules/.bin/next`):
   pm2 delete coex-app
   cd /srv/coex/app && PORT=3001 pm2 start npm --name coex-app -- start
   then `pm2 save` and `pm2 status` (exactly one each of coex-app, coex-mail, coex-desk-close and
   coex-channels).
5. Check: `curl -sI https://coex.digisol.ae/login` returns 200, sign in, open Tickets and Tasks, and
   `pm2 logs coex-app --lines 30 --nostream` shows no errors. After a day, `rm -rf /srv/coex/app/.next`
   (the old build) and tell no one: nothing reads it.

Rollback (about three minutes): `git checkout 9676795` (the last commit before the move), then
`npm ci && npm run build`, and start `coex-app` the way step 1 recorded, then `pm2 save`. Return to
the branch afterwards with `git checkout main`.

### Cutover done (13 Oct 2026)

Carried out by John, with `coex-app` unchanged in pm2: it runs `npm start -- -p 3001` from
`/srv/coex/app` (script `/usr/bin/npm`), and root `npm start` forwards that flag, so a plain
`pm2 restart coex-app --update-env` was enough. Result: login page and stylesheet 200, signed-in pages
200, all four processes online (`coex-app`, `coex-mail`, `coex-desk-close`, `coex-channels`),
`coex-mail` reconnected to the mailbox. The first build failed once because the terminal still had
`NODE_ENV=production` from the backup step (see above); a new terminal fixed it. The old
`/srv/coex/app/.next` can be deleted after a day of stable use.

## Microsoft sign-in switched on — 13 Oct 2026

- Both redirect URIs are registered in the Azure app "COEX by DigiSol": `/api/auth/entra/callback` (web
  app, in use) and `/api/v2/auth/entra/callback` (API, not yet used).
- `/srv/coex/app/.env` now holds `AUTH_MICROSOFT_ENTRA_ID_ID`, `_SECRET`, `_ISSUER`
  (`https://login.microsoftonline.com/<tenant id>/v2.0`) and `AUTH_URL`. The login page shows the
  Microsoft button only when all four are set. John confirmed a Microsoft sign-in works.
- Gotchas: the client secret is the **Value** column in Azure, not the Secret ID (36 characters with
  dashes gives `?entra=failed`). Azure client secrets expire; renew before the date chosen when it was
  created, or Microsoft sign-in stops. A person can sign in only if a COEX user has the same email.
- The API (`coex-api`, port 3002) and its Apache route are still not started.

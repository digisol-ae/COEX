# Worktello (formerly COEX) — Shared AI Project State

## Outlook web fixed; local interactive manual added — 25 October 2026

Application `d547d25` (PR #44) is live. Exact Outlook web embedding hosts and Microsoft client were added while retaining signed-token, tenant, scope and staff checks. Owner explicitly approved Entra preauthorization at action time; persisted state verified. All 348 tests, types/lint/format, local/server 75-page builds and PR/main CI passed. Real Outlook web SSO/list/detail and blank create-form rendering passed; fresh Teams web SSO/list/create-form reads also passed. No production task/time/message/assignment/import mutation for the demonstration.

Active green `coex-app-green` id 13 / PID 318054 on 3002, `/srv/coex/releases/outlook-web-20261025`; blue id 9 / PID 302605 on 3001 remains fallback. Workers 10/11/12 remain unchanged in `/srv/coex/releases/worktello-20261025`. All five Node process trees 22.23.4 verified. 40/40 switch samples succeeded; 1 old tenant session revoked at 2026-10-25T01:43:47Z, zero old unexpired remain and one later login preserved. Full scope/backup/rollback/evidence: `docs/resolutions/2026-10-25-outlook-web.md`.

Manual: `docs/manual/index.html` (27 chapters, searchable role guides, reading checklists, image zoom and print option), canonical content.json, generated offline content.js, CSS/JS, actual safe screenshots/provenance and QA limits. Seven documented resolutions indexed in `docs/resolutions/README.md`; each future resolution must update the dated record, manual and local screenshot evidence. Portable package: `outputs/manual/Worktello-Manual-2026-10-25.zip`. Source/assets remain organized in the local SSD checkout and GitHub; secrets/private environments/backups/business exports are excluded. Manual is a repository/local artifact, not a newly public production route. Desktop/mobile/write-flow and physical-print limits are explicit in `docs/manual/QA.md`.


## Completed-work release deployed — 25 October 2026

Application `4701314` (PR #42; branding #40 and Node #41 included) is live at https://coex.digisol.ae. Fresh 342 unit tests, types/lint/format, Docker CSV/Gantt integration, local/server 75-page builds and PR/main CI passed. Active blue `coex-app` id 9 / PID 302605 on 3001; green id 8 / PID 303896 on 3002 remains fallback. Three workers now run in `/srv/coex/releases/worktello-20261025` (mail 10, desk-close 11, channels 12), not the original checkout. All five application process trees verified Node 22.23.4; PM2 saved. 40/40 switch health samples succeeded ; 20 old tenant sessions expired, zero old unexpired remain, later login preserved.

Existing Teams catalog app updated to Worktello 1.2.0 and verified after reload. Real Teams web SSO/list reads and ordinary web Microsoft sign-in passed; full role/device/write pilot remains. What's new contains user-facing planning/Teams/data-transfer features plus generic maintenance counts, no branding announcement. Full backup, PIDs, CI, limitations and rollback: `ai/RELEASE-2026-10-25.md`; operating guide: `deploy/ZERO-DOWNTIME.md`. This entry supersedes earlier pending/local-only statements. Do not repeat expiry/restart for docs-only sync. Unrelated `projects/` preserved.


## Completed-work release authorized — 25 October 2026

Owner requested completed-work deployment end to end. Current release record: `ai/RELEASE-2026-10-25.md`; it supersedes earlier local-only and approval-pending release statements. Existing completed Teams timer controls are included from the later 24 October QA, without starting a new feature. Preserve unrelated `projects/`. Production is pending until the release record contains verified cutover evidence.


## Worktello branding and loader — owner decision, 24 October 2026

**Product identity is Worktello (formerly COEX). Approved loader: highlight bars.** Keep `WorktelloLoader` default `variant="highlight"`; root, signed-in and portal loading boundaries use this default. Each complete diagonal W bar brightens in sequence. The build-up alternative remains dormant in the component and is archived at `docs/brand/animations/worktello-build-preview.html` for future use. Do not enable it by default without a new owner request.

This branding/loader commit includes the approved handoff W, user-visible name changes, browser/touch icons, reproducible icon/Teams packaging scripts, saved concept art and previews, and continuity documentation. It deliberately excludes unrelated uncommitted Gantt, Teams permissions/time/sharing, search, subtask and data-transfer changes and local Docker setup. Mixed files are staged by branding changes only; preserve their remaining working-tree changes. No push, merge or production deployment is included in this request.

Current local Docker app at http://localhost:3110 has the rebrand and loader; its existing database/attachment volumes are preserved. Domain/DNS remains with the owner, and formal trademark clearance is unverified. Keep technical COEX identifiers, cookies, environment variables, Microsoft IDs, configured hostnames and protocol headers unchanged for compatibility. SVG exports embed raster masters; do not claim traced vector artwork. Keep DigiSol attribution and legal identity.

Evidence: the preceding rebrand passed 342 unit tests and a 75-page isolated build; loader changes passed focused ESLint, web TypeScript and formatting/diff checks. Browser access to localhost was declined during loader verification; animation and route-transition visual acceptance remain owner-reviewed, not independently browser-verified. No real task/email or Teams app installation was performed. Read `docs/BRANDING.md` and `docs/brand/animations/README.md` for asset locations and reuse.


## Loading animation variants — 24 October 2026

Owner requested whole-bar highlighting instead of rectangular slices, plus a second build-up version. WorktelloLoader supports `variant="highlight"` (default, one complete diagonal ribbon bright at a time) and `variant="build"` (left appears, middle joins, right joins; all hold then reset). Polygon masks follow the W ribbon boundaries. Reduced-motion shows the complete static W in both variants. Native route fallback keeps version 1 until the owner selects otherwise. Both standalone previews offer version, theme and pause/play controls: docs/brand/worktello-loading-preview.html and docs/brand/worktello-loading-build-preview.html. No artificial page delay, commit, push or production deployment. Browser visual QA remains unavailable after the prior origin denial; no bypass attempted.


## Worktello local preview and loading animation — 24 October 2026

Owner requested local implementation and a matching page-loading animation. All five generated concept/extraction images are preserved in `docs/brand/concepts/`; active transparent masters and browser icons remain in `apps/web/public/brand/worktello-*` and app metadata icon files.

Added shared `WorktelloLoader` and native root, signed-in app and portal `loading.tsx` boundaries. A 1.65-second staggered opacity wave moves through the W folds, reusing the approved symbol and lettering alpha. Status is announced politely; reduced-motion disables the animation. No timer adds artificial loading delays. Native loading boundaries do not cover their own parent layout's data fetch; no global click interception or fake progress is introduced.

Existing local Docker web/API rebuilt and running at http://localhost:3110; MongoDB healthy and volumes preserved. Saved loader and symbol hashes exactly match the running web container. Focused lint, web TypeScript and formatting/diff checks passed. Earlier 342-test and 75-page build results belong to the preceding rebrand, not a new full-suite run for this CSS/loading-only change.

Browser access to localhost:3110 was declined by the origin approval gate. No alternate browser or network workaround attempted. Current local UI, animation playback, reduced-motion behavior and real route-transition visibility therefore remain visually unverified in this continuation. Standalone `docs/brand/worktello-loading-preview.html` embeds the same artwork/CSS and provides light/dark and pause/play controls for owner review. No production deployment, push or commit.


## Worktello rebrand — 24 October 2026 (local implementation)

Owner selected Worktello and the coral folded W with subtle handoff/palm negative space. Domain/DNS remains with the owner. Public-web screening is preliminary, not trademark clearance; a historical third-party Worktello mention was found, not verified as a software business. No legal-availability claim.

Shared BrandLogo now uses the approved generated raster symbol and lettering with theme-aware alpha-mask lettering and explicit white lettering on dark rails. New worktello assets, browser favicon/touch icon, user-facing page titles/auth/policies/notifications/email and Teams UI wording are updated. DigiSol attribution and legal operator remain. COEX environment variables, package names, auth cookies, domains, Microsoft IDs/command IDs, protocol headers, DB identities and legacy stored system authors remain compatible. Release-note history retained; no branding announcement. Teams packaging script advances to 1.2.0 with Worktello title/artwork; installer upload/install is separate.

The checkout already contains unrelated uncommitted Gantt, Teams, data-transfer and task changes, which must be preserved. No commit, push or deployment performed by this rebrand task. Verification: all workspace type checks, focused ESLint and 51 unit files / 342 tests passed; isolated final production Webpack build passed (75 pages). Desktop and 390px mobile visual checks, light/dark logo and 16/36/64px icon checks passed; mobile document width remained 390px. Preview copy used a signed-out session stub only for visual QA, then actual session sources were restored for the production build. No authenticated acceptance, real email/task creation or Teams install claimed. Packaging smoke test used a synthetic app ID in /private/tmp and must not be installed. SVG exports embed the approved raster masters; they are not traced vector artwork.


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

## COEX SVG branding — 22 October 2026 (local)

Imported Claude’s wordmark/monogram from branch `claude/sleepy-faraday-ijs3cj`, source commit `93b892b`, at owner’s request. Shared BrandLogo applies across desktop/mobile navigation, sign-in/recovery, portal, policies and Teams create form; browser/touch/Teams icons derived from monogram. Wordmark canvas expanded to prevent clipped C stroke; colours/shapes retained. Teams ZIP 1.0.1 generated. Owner explicitly requested **no What’s new entry for logo work**; only the previously requested Teams wording change is in release-notes.ts.

Typecheck, focused lint, formatting/diff and production build (71 pages) passed. Guide `docs/BRANDING.md` explains asset/source/component mapping and icon regeneration. Prior single-screen Teams checks: 255 unit tests passed. Local only, no commit/push/deployment; current production remains previous branding/two-step Teams flow. Preserve existing Teams edits and `projects/`.

## Single-screen Teams create form — 22 October 2026 (local)

Owner requested one screen with separate Space, Folder, Assignee, Date and Time controls; creator selected as default assignee. Replaced destination/Continue card with a TeamsJS HTML dialog. Title/description/priority retained; Space changes reset Folder and eligible people; creator defaults where eligible, otherwise explicit unassigned notice rather than breaking private membership rules. Server defaults omitted assignee to creator, permits explicit unassigned and rechecks destination/assignee on signed Connector submission. Separate date/time combine into task endAt using existing Asia/Dubai office-time parsing; time without date rejected.

New `.tsx` files under `app/integrations/teams/create/` render the single screen; `form-model.ts` filters choices and computes creator default. Read-only `api/integrations/teams/form/route.ts` verifies a signed 15-minute draft and active linked staff/task access before loading choices; body bounded 32KiB, no-store, no-referrer. Draft arrives in URL fragment, is removed from visible history and POSTed in body, never in request URL/query/referrer. Creation still requires Microsoft-signed submitAction and unique receipt. TeamsJS SDK 2.58.0 added with lockfile; Next headers permit framing only for this dialog by Teams/Microsoft hosts. Existing manifest validDomains already covers the dialog; no ZIP change required for this server UI update.

Validation: web typecheck/focused ESLint and 41 unit files / 255 tests passed, including folder/assignee filtering, creator default, private membership, date/time/office conversion, invalid and foreign-tenant form tokens and prior duplicate guards. Production build verification recorded after completion below. Actual Teams/webview/mobile acceptance remains pending. This change and the simplified What's new copy are LOCAL ONLY; last live code remains the previously deployed application release. Do not confuse this form with the old two-step flow currently deployed. No commit/push/deployment or real task creation for this follow-up; unrelated `projects/` untouched.

## Teams backend and policy deployment verified — 22 October 2026

Owner authorised complete rollout with guided explanations. Application PR #26 merged as `77e84585ce0626aa8f9dbcddf5bb2518ec5bb5ab`; PR CI https://github.com/digisol-ae/COEX/actions/runs/39721227941 and main CI https://github.com/digisol-ae/COEX/actions/runs/39721496951 passed. Local full workspace types/lint, 40 unit files / 249 tests, formatting, Microsoft Teams manifest schema and local/server builds passed; server native Turbopack build generated 67 pages.

Server `/srv/coex/app` clean at application SHA after deploy, four expected PM2 processes online with no duplicates and one additional restart each (cumulative restart count 2). Backup before release: `coex-2026-10-22-0813.archive.gz` (481K), `files-2026-10-22-0813.tar.gz` (14M), under `/srv/coex/shared/backups` (server timestamp). Teams environment configured without exposing credentials; draft secret generated privately, prior environment backed up mode 600. Existing Microsoft sign-in issuer matches directory; active linked-account count 8. Production dependency audit: 0 vulnerabilities; all-dependency report has 8 development findings (2 moderate, 6 high), no forced upgrades.

Live verification: https://coex.digisol.ae/privacy, /terms and /login return 200; operator Digisol LLC-FZ, contact info@digisol.ae and public policy links verified. Teams endpoint returns 401 for well-formed unsigned invoke (configured and refusing unauthenticated access). No real Teams invoke/task creation yet. ZIP `/Users/syedali/Downloads/COEX-Teams-1.0.0.zip` prepared; SHA256 `2b0fe5e748e09a271c6bb5f4d536fd65d52dbcef0b573d7f54fd7e9a150ce72d`. Microsoft schema validation passed, Developer Portal/client installation acceptance remains pending.

Next: user installs ZIP through Teams approved custom-app process, then validate actual message action, linked staff identity, destination/eligible assignee, one saved task/source link and duplicate prevention. Native browser automation unavailable; no visual/Teams end-to-end claim. Public policy deployment completes; **Teams installation and functional pilot remain open**. No separate `projects/` files committed. File-type explanations are in `ai/RELEASE-2026-10-22-TEAMS.md`; implementation/operating guides in `docs/MICROSOFT-TEAMS.md` and `docs/LEGAL-PAGES.md`. Subsequent docs-only pull requires no application rebuild/restart.

## Public Privacy Policy and Terms — 22 October 2026

Owner requested both policies and supplied legal operator **Digisol LLC-FZ**, contact **info@digisol.ae**. Added public `/privacy` and `/terms`, shared responsive policy layout and login/recovery footer links. Copy covers COEX and Teams data/use, actual archive/retention limits, permissions and existing-agreement precedence without invented legal jurisdiction or certification. Teams package defaults to these URLs and uses the legal publisher name. [Edit/rebuild guide](../docs/LEGAL-PAGES.md) records authoritative files and decisions; Microsoft Teams guide records user-reported Azure configuration and public app/directory IDs.

Local web typecheck, focused ESLint, formatting and Webpack production build passed (67 pages). Signed-out HTTP checks passed for both policies and login, including operator/contact/date/navigation. Browser visual QA unavailable. Local Teams ZIP regenerated with real public app ID and production policy URLs, but production URLs are not deployed/verified. No commit/push/deploy, live task or Teams installation. Existing `projects/` remains untouched.

## Microsoft Teams task integration — 22 October 2026

User approved starting Teams message → COEX task integration. Local branch `codex/teams-create-task` adds a verified invoke endpoint, destination-first Adaptive Card form, eligible assignees, title/description/priority/due date, original message link and Open in COEX confirmation. Uses existing linked Entra staff identity, pinned Microsoft/COEX tenant, active account/task permission checks, private Space/Folder visibility and assignment rules. Signed 15-minute drafts and unique submission receipts prevent duplicate creation from retries; uncertain outcomes require checking task list before a new form.

Validation: existing unit suite plus Teams protocol/service tests **39 files / 244 tests passed**; additional Teams HTTP boundary tests **5/5 passed**. Web TypeScript, focused ESLint, Prettier and production Webpack build passed (**65 pages**, new Teams route included). Test package generated with synthetic public IDs/URLs; colour/outline icons verified 192×192 and 32×32 with alpha. No live MongoDB/Teams end-to-end acceptance or Developer Portal validation yet.

Setup and limits: [Microsoft Teams guide](../docs/MICROSOFT-TEAMS.md). Needs Microsoft single-tenant bot registration/channel, actual public privacy/terms pages, server environment configuration and pilot app installation. Missing config disables endpoint. No Graph/chat-history access, attachment copying or automatic chat posting. No secret changed, real task created, commit/push/deployment or Microsoft resource created. Existing untracked `projects/` preserved. What's new entry deferred until activation because this integration is not yet available to users.

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

## Consolidated21 October 2026

Authoritative continuation snapshot: [compact context](CONTEXT-2026-10-21.md). Current work pointer: [CURRENT_TASK](CURRENT_TASK.md). Historical notes preserved in [archive](archive/2026-10-21-pre-compact/ai/PROJECT_STATE.md).

- Local implementation: own-ticket customer portal, compact Support/Tasks/Customer UX, protected attachments/pasted-image previews, manual/per-person time, contact edits/ticket relinking, configurable contract email recipients.
- CRM extended for contractual and subscription service models, modules, percentage support, separate upfront charges and renewal-safe recurring terms. Zoho remains quote/invoice/payment authority.
- Shared compact filters/tooltips, permission-aware quick-create, persistent sidebar collapse, module highlights; Setup now tabbed popup. Latest icon positions/styles and All agents label captured in context.
- Last full QA20 Oct:468 pass/4 fail. Targeted CRM32 passes across runs; rail13 passes. Last Setup typecheck/lint/Webpack build passed64 routes. Small subsequent UI edits had focused checks, not another full regression.
- Pending: last-observed three product issues, two stale test expectations, defined browser/real-device/external-service acceptance. dOne integration waits for access.
- Branch claude/gallant-faraday-r1u4g8; committed HEAD6c5f572; large preexisting dirty bundle. No push/deployment in this chat. Remote/production state not refreshed for compaction.

Await user's next instruction; no active release authority.

## Transparent ticket bubbles — 21 October 2026

Ticket communication bubbles now have transparent backgrounds in staff and customer portal views. Existing green/yellow neon borders, glow and sender colours are preserved; internal notes keep their dashed warm border and label with transparent fill. Continues the conversation-style trial, so no What’s new entry. Local only; focused ESLint and diff checks passed, browser/theme acceptance pending.

## Bubble design refinement — 21 October 2026

Supersedes the yellow customer/dashed note styling above: transparent rounded chat bubbles with small bottom tails; customer purple neon, agent green neon, internal notes orange dotted. Shared public styles cover staff and portal. Focused ESLint and diff checks passed; current staff ticket visually verified in Dark with all three types. Other themes and portal not separately browser rechecked. Local only; conversation trial remains outside What’s new.

Bubble-tail correction (21 Oct): replaced separate pseudo-element curves with a continuous SVG nine-slice outline, creating a small curved dialogue tail integrated into the bottom corner. Transparent fill and purple/green/orange colour roles preserved. Focused diff check passed; Light staff view visually checked.

Bubble glow refinement (21 Oct): softened outline to 1px at 55% opacity; green/purple neon shadows expand by 2px in blur and spread outside the transparent bubble. Orange dotted outline also softened. Diff check passed; local only.

Bubble outlines removed (21 Oct, user accepted glow): removed purple/green/orange border artwork and tails. Transparent rounded bubbles retain soft external neon glow in their role colour, including orange internal notes. Sender colours and internal-note label preserved. Diff check passed; local only.

Internal-note colour (21 Oct): changed internal-note glow, sender and label from orange to red; transparent fill and borderless styling preserved. Diff check passed. Local only.

## Conversation ordering and composer — 21 October 2026

Added Message order: Ascending (oldest first, default) / Descending (newest first), stored in the ticket URL as messageOrder. Messages and office-day separators follow the selected chronological order, with existing middle-message folding retained. Moved the complete staff ReplyBox above the conversation, retaining attachments, saved replies, CC, sender, signature and internal-note mode. Browser verified composer precedes conversation and descending reverses endpoints; focused ESLint, web typecheck and diff checks passed. Local only; no messages sent.

## Main task conversation styling — 21 October 2026

Applied ticket-style transparent rounded red-glow internal-note bubbles, explicit Internal note badges, long-text Read more, middle-message folding and ascending/descending ordering to the full task page. Complete existing update composer now precedes the conversation; mentions/edit/delete permissions retained. Task toolbar uses compact filter styling and task tags render individually as #tag badges. Task comments remain private internal notes; no customer reply mode added. Browser verified composer position, internal tags and order reversal on DGS-T-6; ESLint, web typecheck and diff checks passed. No comment submitted; local only.

## Subtask assignment email — 21 October 2026

Subtask assignee changes now queue the existing task_assigned staff alert, including subtask title, parent task and link. Respects email settings and existing self-assignment suppression. Unchanged selection and unassignment do not queue alerts; existing assignment access rules retained. Notification failure does not undo the saved assignment, matching main task behaviour. Regression test passed (1 passed, 47 skipped) against isolated coex_test_tasks after network-enabled retry; lint, web typecheck and diff checks passed. Test spies on the mail queue entry point; no real email delivery claimed. Added What’s new entry. Local only, no push/deploy.

## My subtask done — 21 October 2026

User-approved personal completion uses exact label My subtask done, with Resume my work. Persisted per-assignee IDs; only the current assigned user may mark their own work, with private Space/Folder checks and an atomic guard rejecting unfinished own subtasks. Does not close shared task/remove assignee. Mine defaults Active; filter supports My subtask done/All my work and preserves existing filters. Personal active task lists/My work, Tasks badge, My Desk and available desk tasks exclude completed personal work; team/Space views remain unchanged. Assignee completion badge on full task page. Newly assigned or reopened own subtasks reset personal completion; removing parent assignees drops stale markers. Existing desk selection stays stored so resume can restore its visibility. No real records migrated.

Verification: focused DB regressions 2 passed/47 skipped in isolated coex_test_tasks (assignment-alert regression plus personal completion, independent users, invalid actor, unfinished guard, resume and reactivation). Web typecheck, focused ESLint and diff checks passed. Browser read-only verified button on assigned task and three Mine filter choices; no live completion clicked. What’s new updated. Local only; no push/deploy.

## Subtask missing-field crash and error handling — 21 October 2026

Fixed user-reported Cannot read properties of undefined (reading filter): personal completion arrays now safely default empty in subtask reopen/assignment. Next development model cache is upgraded and recompiled for the newly added path, so hot reload cannot retain the old schema. Subtask completion/assignment/add actions now return friendly expected errors, log unexpected details only server-side and display generic retry messages. Board/list optimistic updates handle returned failures; full-page subtask forms show inline Notice and assignment errors are no longer ignored. Personal-completion errors use the same safe mapping.

Verified: database regressions 3 passed/47 skipped (legacy undefined field, personal completion, assignment alerts); action error unit tests 2/2 passed (raw TypeError masked and expected validation preserved). Web typecheck, focused ESLint and diff checks passed. No real subtask changed during verification. Local only.

Home navigation icon (21 Oct): replaced the rail Home glyph with user-supplied transparent house asset at public/brand/home-icon.png, rendered as a currentColor mask at 18px. Shared desktop/mobile RailLinks retains active/theme colours and Home label/destination. Focused ESLint and diff checks passed; local only.

Tasks navigation icon (21 Oct): replaced Tasks rail glyph with user-supplied transparent tasks-icon.png, using the shared 18px currentColor mask for desktop/mobile. Label, destination, counts and active colours preserved. Focused ESLint and diff checks passed. Local only.

Folder/Spaces navigation icon (21 Oct): replaced the folder glyph in the Spaces rail entry with the supplied transparent spaces-icon.png. Shared 18px currentColor mask applies on desktop/mobile; Spaces label and route preserved. Focused ESLint and diff checks passed. Local only.

Time navigation icon (21 Oct): replaced Time rail clock with the user-supplied transparent time-icon.png, rendered through the shared theme-aware 18px mask on desktop/mobile. Label and route retained. Focused ESLint and diff checks passed. Local only.

CRM navigation icon (21 Oct): replaced CRM rail glyph with the supplied transparent customers-icon.png. Shared 18px currentColor mask covers desktop/mobile and preserves CRM label, route, active colours and renewal badge. Focused ESLint and diff checks passed. Local only.

Support navigation icon (21 Oct): replaced Support rail glyph with supplied support-icon.png using shared 18px theme-aware mask on desktop/mobile. Support route, label and unread count retained. Focused ESLint and diff checks passed; local only.

Setup navigation icon (21 Oct): replaced Setup gear with supplied settings-icon.png using shared 18px currentColor mask. Desktop/mobile retain Setup popup routing, permissions and active colours. Removed unused legacy SVG fallback after all non-desk rail icons moved to supplied assets. Focused ESLint and diff checks passed. Local only.

Second navigation selection (21 Oct): shared navigation-active now uses a soft rainbow neon gradient blended with the theme surface and 1px coloured shadows. Applies to selected secondary sidebar links, Spaces, folders and task-tree items on desktop/mobile; current label contrast and red marker preserved. Diff check passed. Local only.

Navigation selection hierarchy (21 Oct): active main section headings (e.g. Timesheet), plus standalone Dashboard/My desk/Setup, use the rainbow background. Active submenu/tree entries use transparent fill, continuous 1px rainbow border and 1px colour shadow; old red marker removed. Active group detection retains current route matching. Focused ESLint/diff checks passed; local only.

Navigation submenu shadow (21 Oct): increased selected submenu rainbow shadow from 1px to 2px; transparent fill and 1px rainbow border retained. Diff check passed. Local only.

Task half drawer (21 Oct): removed Documents section and document add/remove controls from the quick panel only; full task document management retained. Updates now render inline newest-first, initially 3 threads, Show more reveals 5 more at a time and Show less collapses. Full text/Read more, author/time, edited flag and Internal note/Activity tagging included; composer stays above. Focused ESLint, web typecheck and diff checks passed; local only.

## Images in task updates — 21 October 2026

Main task page and half drawer reuse the ticket attachment picker for image paste/drop/upload with pre-send thumbnails; saved update images use existing preview/download UI. Image-only posts supported. PNG/JPEG/WebP, 3MB/file and 10MB/update enforced before buffering and in service, decoded/processed using ticket image pipeline. Native task comments store private attachment metadata; ticket-linked updates store attachments directly on shared internal TicketMessage, without customer email. New authenticated task-image route enforces staff role, task permissions, assignee/read-all and Space/Folder/tenant visibility; only internal ticket-note attachments are reachable through task links. Deleted task updates no longer serve images. Failed storage/comment creation cleans uploaded files. Unexpected posting errors use friendly retry copy.

Verification: isolated coex_test_tasks regressions 3 passed/48 skipped (image persistence/download, invalid images/SVG rejection, wrong-task/cross-tenant denial, ticket-note privacy, prior personal-completion regressions). Unit tests 5/5 across image-route access/headers and subtask error regressions. Web typecheck and focused ESLint passed. Browser read-only verified image composer on task page; actual clipboard and saved-thumbnail browser end-to-end acceptance remains pending. No real update posted. What’s new updated; local only.

## Agent release summary and upload review — 21 October 2026

User requested 17-to-today agent-related information only. Consolidated 17–21 Oct What’s new into one current agent summary covering tasks/subtasks, update images, support, time and navigation. Removed duplicate date-range entries and admin/contract/portal administration copy; older pre-17-Oct release history retained. Upload candidate, dependencies, mixed-worktree boundaries and remaining verification recorded in ai/RELEASE-2026-10-21.md. Release-note lint/diff checks passed. Review only; no staging/commit/push/deploy.

## Top task documents/attachments drawer — 21 October 2026

Moved main task Documents section into a compact Documents & attachments button in the top action bar, with a combined count. Drawer lists all current update attachments as a thumbnail grid (deduplicated by attachment ID, with author labels) and existing document links/add/remove controls. Uses protected task attachment URLs, keeps comment thumbnails in context, includes shared internal-note attachments on ticket-linked tasks, excludes deleted updates through existing comment service. Reuses native SettingsDrawer for Escape/focus and responsive width. Half drawer Documents remains removed. Focused ESLint, web typecheck and diff checks passed; browser acceptance pending. Local only.

Drawer visibility refinement (21 Oct): moved Documents & attachments trigger from the action strip to the full task title header; made it a prominent labelled button with count. Added the same drawer at the top of the task half panel. Update composer upload controls now explicitly say Upload attachment or paste an image on both surfaces (PNG/JPEG/WebP image support retained). Browser opened the current task drawer and verified heading, empty state and document-link form; composer label also verified. Focused ESLint, web typecheck and diff checks passed. No data posted.

## Task image browser QA — 21 October 2026

Scoped end-to-end browser QA completed on isolated 127.0.0.1:3102 and coex_test_tasks with clearly labelled synthetic task/user. Main-page clipboard paste, image-only post, reload persistence, half-drawer file upload/text+image post/newest-first display, central gallery, preview and verified 320×180 download passed. Ordinary agent role also pasted/posted successfully; final gallery count 3. Minor display finding: tiny/compressed images round to 0 KB; no code fix during QA. Atlas collection limit affected isolated login/dashboard setup, resolved enough for task flow by dropping eight verified-empty collections only in disposable test DB. Report: docs/qa/QA-2026-10-21-TASK-IMAGES.md. Temporary server stopped and scripts removed; no main-site data changed, push/deploy or external email. Prior image clipboard/browser acceptance pending notes are superseded only for these tested task paths.

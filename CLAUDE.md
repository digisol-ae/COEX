# Worktello (formerly COEX)

## Completed-work release deployed — 25 October 2026

Application `4701314` (PR #42; branding #40 and Node #41 included) is live at https://coex.digisol.ae. Fresh 342 unit tests, types/lint/format, Docker CSV/Gantt integration, local/server 75-page builds and PR/main CI passed. Active blue `coex-app` id 9 / PID 302605 on 3001; green id 8 / PID 303896 on 3002 remains fallback. Three workers now run in `/srv/coex/releases/worktello-20261025` (mail 10, desk-close 11, channels 12), not the original checkout. All five application process trees verified Node 22.23.4; PM2 saved. 40/40 switch health samples succeeded ; 20 old tenant sessions expired, zero old unexpired remain, later login preserved.

Existing Teams catalog app updated to Worktello 1.2.0 and verified after reload. Real Teams web SSO/list reads and ordinary web Microsoft sign-in passed; full role/device/write pilot remains. What's new contains user-facing planning/Teams/data-transfer features plus generic maintenance counts, no branding announcement. Full backup, PIDs, CI, limitations and rollback: `ai/RELEASE-2026-10-25.md`; operating guide: `deploy/ZERO-DOWNTIME.md`. This entry supersedes earlier pending/local-only statements. Do not repeat expiry/restart for docs-only sync. Unrelated `projects/` preserved.


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

Owner requested both policies and supplied legal operator **Digisol LLC-FZ**, contact **info@digisol.ae**. Added public `/privacy` and `/terms`, shared responsive policy layout and login/recovery footer links. Copy covers COEX and Teams data/use, actual archive/retention limits, permissions and existing-agreement precedence without invented legal jurisdiction or certification. Teams package defaults to these URLs and uses the legal publisher name. [Edit/rebuild guide](docs/LEGAL-PAGES.md) records authoritative files and decisions; Microsoft Teams guide records user-reported Azure configuration and public app/directory IDs.

Local web typecheck, focused ESLint, formatting and Webpack production build passed (67 pages). Signed-out HTTP checks passed for both policies and login, including operator/contact/date/navigation. Browser visual QA unavailable. Local Teams ZIP regenerated with real public app ID and production policy URLs, but production URLs are not deployed/verified. No commit/push/deploy, live task or Teams installation. Existing `projects/` remains untouched.

## Microsoft Teams task integration — 22 October 2026

User approved starting Teams message → COEX task integration. Local branch `codex/teams-create-task` adds a verified invoke endpoint, destination-first Adaptive Card form, eligible assignees, title/description/priority/due date, original message link and Open in COEX confirmation. Uses existing linked Entra staff identity, pinned Microsoft/COEX tenant, active account/task permission checks, private Space/Folder visibility and assignment rules. Signed 15-minute drafts and unique submission receipts prevent duplicate creation from retries; uncertain outcomes require checking task list before a new form.

Validation: existing unit suite plus Teams protocol/service tests **39 files / 244 tests passed**; additional Teams HTTP boundary tests **5/5 passed**. Web TypeScript, focused ESLint, Prettier and production Webpack build passed (**65 pages**, new Teams route included). Test package generated with synthetic public IDs/URLs; colour/outline icons verified 192×192 and 32×32 with alpha. No live MongoDB/Teams end-to-end acceptance or Developer Portal validation yet.

Setup and limits: [Microsoft Teams guide](docs/MICROSOFT-TEAMS.md). Needs Microsoft single-tenant bot registration/channel, actual public privacy/terms pages, server environment configuration and pilot app installation. Missing config disables endpoint. No Graph/chat-history access, attachment copying or automatic chat posting. No secret changed, real task created, commit/push/deployment or Microsoft resource created. Existing untracked `projects/` preserved. What's new entry deferred until activation because this integration is not yet available to users.

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

## Fresh-session entrypoint —21 Oct2026

Read [ai/START-HERE.md](ai/START-HERE.md) and [compact context](ai/CONTEXT-2026-10-21.md) first. Main AI files consolidated; historical incremental notes archived, not deleted. Preserve current dirty worktree. Existing architecture/standing instructions below remain applicable. No push/deploy authority.


## Setup workspace — 21 Oct 2026

[Tabbed Setup popup implementation/QA](docs/SETUP-WORKSPACE.md). Use the shared workspace/registry; do not restore a duplicated expanded Setup submenu. Existing settings actions and permissions retained. Local only.

## Shared UI — 21 Oct 2026

Use [UI standards and verification](docs/UI-STANDARDS.md) for new screens: compact shared filters/controls, header quick-create, collapsible sidebar and native settings drawers. Local implementation, browser/static checks recorded; no push/deploy.


## CRM service models — 21 Oct 2026

[Contractual/subscription implementation and QA](docs/CRM-SERVICE-MODELS.md). Local changes only; preserve existing worktree. Product/module availability, opportunity model, agreement pricing/upfront charges and customer Services are implemented. Zoho remains billing/quote authority. Browser form/navigation acceptance verified after reload; persisted browser save/renewal and prior QA fixes remain pending. No push/deploy.


## Latest QA — 20 Oct 2026

See [QA evidence and open findings](docs/qa/QA-2026-10-20.md) before continuing. QA-only; no feature fixes or release actions. Existing customer/portal acceptance expanded using disposable synthetic data. Full regression results are recorded in that report; do not infer all-clear from older handoffs.


## Latest local work — 19 Oct 2026

Contact edits, existing-ticket customer/contact reassignment, 15-second/manual refresh and configurable contract email recipients/sender are implemented locally. Ali is the removable default CC for contract emails in his tenant. See [release handoff](ai/RELEASE-2026-10-19.md) and [current status](ai/HANDOFF.md); no release/deployment implied.

## dOne support integration project — 18 Oct 2026

Dedicated planning and AI continuity: [dOne ↔ COEX project](projects/done-coex-integration/README.md). Separate web application; Bilal frontend, Uzair backend, beginner deployment teammate. Waiting for dOne local setup/access; documentation base only, no integration implemented or deployment authorised.

## Customer portal decision — 18 Oct 2026

John resumed T6 and confirmed **only the contact's own tickets**. Same-site `/portal`; existing password auth, admin-provisioned client_contact linked by Contact.userId + User.organisationId. Never widen to all company tickets or leak internal notes/system attachments. Enforce account/contact/company/tenant status and role on every operation; staff pages/actions/APIs reject client sessions even with overrides. Provision through Customer → Contacts (user.manage); no automatic invite send or staff-account conversion. Customer ticket creation uses the active default queue, and replies are inbound; do not stop the staff first-response clock. Details/QA: docs/CUSTOMER-PORTAL.md.

## Current handover pointer — 18 Oct 2026 (Codex)

Read `ai/HANDOFF.md` first for the consolidated current status and `ai/RELEASE-2026-10-18.md` for the verified local inventory, Claude's received `b0db354` handover and QA boundaries. PR #24 is open; Codex changes are still local/uncommitted. Do not assume they are on GitHub or production. Product decisions stay in FEEDBACK.md; operational status and evidence stay in ai/. No PR, merge, push, deployment or tutorial publication is implied by a documentation update.

Standing context for every Claude session on this project. Read this first, then FEEDBACK.md.

## What this is

COEX, short for Co-existence, is DigiSol's own multi tenant business platform. It replaces ClickUp and osTicket,
adds a CRM foundation, and is built so that Contracts, full CRM and Payroll attach to it later.
Zoho Books stays as the accounting system and is integrated with, never replaced.

Confirmed product name. The repository is COEX.

## Owner and team

- John (Syed Muhammad Jan Ali), CEO of DigiSol, is the product owner and the only reviewer for now.
- Claude is the core developer through Phase 1.
- A designer, a frontend developer and a backend developer join later. Readability and documentation
  are acceptance criteria on every milestone, not afterthoughts.

## Where we are

M1 Foundation is accepted. M2 CRM foundation, M3 Tasks and dashboard, M4 Time tracking and M5
Support are built and accepted by John (24 Sep 2026). The team cuts over from ClickUp and
osTicket to COEX on 25 Sep 2026 (M8), and did. Batch C (decision 18) was built on 26 Sep 2026
and accepted; themes, the profile menu, email password links, three senders, signatures, space
archiving, the floating timer and What's new followed on 27 and 28 Sep. Handed to ChatGPT on
28 Sep 2026 and shared since: see ai/HANDOFF.md (START HERE). Next: M8 hardening, then Phase 2 planning (John, 4 Oct 2026).
Channels (M6) is suspended until further notice.

What's new: every user-visible change gets an entry at the top of
apps/web/src/modules/core/release-notes.ts, in plain words for users. That makes the What's new drawer open
once more for everyone until they tick "I understand". Exception: John can keep a change out of What's
new (Team history, 1 Oct 2026); it is then documented in CLAUDE.md, FEEDBACK.md and ai/ only.

Conventions worth knowing before changing CRM code:

- Mobile numbers are stored in E.164 and entered with a country picker, because XVERSE matches
  inbound WhatsApp by number.
- Money is stored as integer minor units with an explicit currency.
- Nothing deletes: customers and contacts archive, products retire, custom fields hide.
- Custom field keys are generated from the label once and then frozen; renaming a key would orphan
  every value stored against it.

## Phase 1 scope

M1 Foundation, M2 CRM foundation, M3 Tasks and dashboard, M4 Time tracking, M5 Tickets,
M6 Channels, M7 osTicket migration, M8 Hardening and cutover. Fourteen weeks.

The full scope document lives in the Claude project "ECHO System Development" as
"COEX Phase 1 Scope".

## Decisions already made

1. Stack: Next.js 16 App Router, TypeScript strict, MongoDB with Mongoose, Tailwind, shadcn ui.
2. Authentication: Microsoft Entra single sign on for DigiSol staff, password fallback for client
   contacts. Auth.js with database sessions.
3. Job queue: MongoDB backed, no Redis. Wrapped in a thin service so BullMQ can replace it later.
4. Multi tenant from day one. Every document carries tenantId, enforced in the data access layer.
5. Documents live in Microsoft 365. Tasks store links, never files. Ticket attachments are the one
   exception and are compressed automatically on upload. DigiSol's own cloud server is the planned
   production store; application limits are 3 MB per file and 10 MB per ticket message.
6. No ClickUp data migration. osTicket migrates in full.
7. No knowledge base, no automations builder, no whiteboards, no goals.
8. Task structure is four levels: Space, Folder, Task, Subtask. Set by John's team on 18 Sep 2026,
   replacing the three level structure agreed the day before. A Space or Folder without named
   members is open to the tenant; naming members makes it private to exactly those members, a
   tenant administrator excepted. Work in a private Space or Folder can only be assigned to its
   members, and making one private while it strands an assignee is refused. Phases were removed: a
   folder does everything a phase did and adds visibility, so keeping both would give the team two
   ways to group the same work. Portfolios were removed earlier. scripts/migrate-spaces.ts carries
   an older database across.
   Archiving a Space (28 Sep 2026) takes its folders, tasks and their subtasks with it, marked
   `archivedWithSpace`, so restoring brings back exactly those and nothing archived before. It is
   refused while a timer runs inside it; logged time is kept. Settings (gear on the Space) has a
   two-step "Archive space…", and Spaces lists archived spaces with Restore.
9. XVERSE integration: COEX writes events to an outbox, a connector sends them. Both sides are ours.
10. Client tenants will be billed eventually. The model is undecided, so tenant settings carry an
    inert commercial block and nothing more.
11. Ticket-linked Task work updates are internal support notes. They may update the linked ticket,
    but must never notify the customer automatically.
12. Email is configured per tenant in Setup, Email, not in .env. A separate worker process
    (apps/api/src/workers/mail.ts, pm2 `coex-mail`) holds an IMAP IDLE connection to the support mailbox
    (push, with a 5 minute safety sweep) and sends queued mail. Progress is tracked by mailbox UID;
    the first run records the current highest UID, so mail already in the inbox never becomes a
    ticket. Requests never send mail: they write to the email outbox and the worker delivers with
    retries. Passwords are sealed with COEX_ENCRYPTION_KEY. Automatic acknowledgements are never
    sent to automatic mail and at most once an hour per sender. Internal notes are never emailed.
    Every customer email on a ticket, the acknowledgement included, uses the subject
    `Re: [TICKET] <original subject>`: Outlook groups conversations by subject and ignores reply
    headers, so a custom acknowledgement subject split the customer's thread in two (25 Sep 2026).
    Three senders (28 Sep 2026), each chosen by the kind of mail (`SENDER_FOR` in email.service):
    Standard (helpdesk@digisolteam.com) by default for customer mail; public replies may choose
    another configured sender (John, 3 Oct 2026); Alert for staff alerts
    (new ticket, assigned, customer replied, task assigned, @mention); Admin for account mail
    (password links, "an administrator reset your password"). Alert and Admin are optional: blank
    sends from Standard. Each either reuses Standard's SMTP connection with its own From (needs
    "Send As" in Microsoft 365) or signs in with its own account. The new-ticket alert goes to
    administrators only (default), everyone with ticket.read.all, or nobody. An administrator's
    password reset can email the person (Admin sender) with a 24-hour link to choose their own
    password; the temporary password is never emailed.
    Signatures and previews (28 Sep 2026): each queue has a multi-line signature with
    {{agent}}, {{agent_title}} and {{queue}}; a line whose placeholder is empty is dropped. With
    "sign automatically" (default on) the server adds it to every customer email from the queue,
    replies and the acknowledgement (which has no agent), and a saved reply's {{signature}} then
    inserts nothing. All customer-email text is built by packages/shared/src/tickets/email-text.ts, which the Preview
    buttons (queue signature, saved replies, acknowledgement) also use, so a preview is what goes
    out.
13. Tasks and Tickets are natural partners and stay directly connected: escalation creates a task
    carrying sourceTicketId, and task work updates and completion post internal notes on the
    ticket. This is John's deliberate exception to the rule that modules never import siblings
    (24 Sep 2026); no other module pair gets it without his say. Confirmed 26 Sep 2026: Tasks and
    Tickets read each other's data directly, in both directions, especially where a ticket is
    linked to a task. This is intended design, not a boundary violation to be refactored away.
14. Assignment follows visibility: a task can only go to members of its private Space and private
    Folder; a subtask can only go to the task's own assignees (anyone the task could go to when the
    task is unassigned). Pickers show only these people; the service refuses anyone else.
15. osTicket migration (M7) covers open tickets only, and only if straightforward. No full import.
16. Attachments live on the Contabo VPS (100 GB); archival starts at 50 GB used. DigiSol owns and
    operates backups. Figma adoption is dropped.
17. Unread marks (25 Sep 2026): a ticket is unread for a person when the customer has written (a
    new email ticket or a reply) since that person last opened it. Staff activity never marks
    anything. Marks go to the assignee, and on unassigned tickets to everyone with
    ticket.read.all. The Support badge on the rail counts unread tickets, not open ones, and polls
    every 30 seconds so it moves on any page. Read state is per person (ticket-read model).
18. Batch C (John, 26 Sep 2026):
    - One conversation per escalated ticket: a task raised from a ticket shows that ticket's
      internal notes as its work updates and posts there; nothing is stored twice. Tasks without a
      ticket keep their own notes. Never emailed to a customer.
    - @mentions in internal notes and task updates: the picker sends the chosen people's ids, and
      only those whose "@Full Name" is still in the text are emailed (staff alert kind
      `mentioned`, switchable in Setup, Email). Replies to customers never carry mentions.
    - The dashboard's "My work" lists my open tickets and tasks together, soonest due first (a
      ticket's reply target until answered, then resolution; a task's end date), with a Tickets
      only / Tasks only / Both filter kept in the address.
    - Agents change only their own logged hours, administrators anyone's, and every correction or
      removal needs a written reason, stored in the audit record and shown in the entry's history.
    - Each person orders the menu groups for themselves ("Arrange my menu"); the order is stored on
      the user (`navigationOrder`) so it follows them across devices, the rail follows it with
      Home first, and it only reorders what they may already see.

## Code standards

1. TypeScript strict, no `any`. Types derive from the Mongoose schemas, never typed twice.
2. Identical folder pattern in every module: models, services, components, actions, tests.
3. Business logic lives in services. Components render, services decide.
4. Full descriptive names in English. No invented abbreviations.
5. Comments explain why, never what.
6. Prettier and ESLint enforced. Formatting is never a review topic.
7. Conventional commits, small pull requests.
8. Documentation updated in the same commit as the code.

## Navigation

One file defines the menu: apps/web/src/components/navigation/navigation.ts. Groups are named after the
part of the business they serve, not after the module implementing them. A new module adds a group
there and nothing else, because the sidebar, the permission filtering and the collapse state all
read from that list. Permissions are applied on the server, so a link a person may not open is
never sent to their browser.

## Interface conventions (John, 26 Sep 2026)

- Secondary actions (edit, remove, history, archive, previous and next, download, open) are small
  icon buttons with a tooltip saying what they do: `IconButton` and `IconLink` in
  apps/web/src/components/ui/icon-button.tsx. The tooltip is also the accessible name. Primary actions
  (Save, Raise ticket, Add time) and consequential ones (Suspend) keep their words.
- Popups use frosted glass: `popup-backdrop` on the overlay and `popup-glass` on the panel, both in
  globals.css. Forms that would otherwise open inside a table open as popups instead, so the page
  never jumps. Exceptions: the image preview stays dark. The phone menu drawer follows the desktop menu (16 Oct 2026, replacing the brand black drawer of 25 Sep): the same dark rail beside the same glowing panel, with 44 pixel targets and the screen's safe areas, and the search that the phone header lacks.
  Larger forms (Raise ticket so far) use the lighter variant, `popup-backdrop-light` and
  `popup-glass-gradient`: bright frosted glass behind, and a panel of glass tinted with the
  sidebar's pastels (28 Sep 2026).
- A phone has no hover, so nothing may be reachable only on hover.
- Tooltips (1 Oct 2026): one component, `GlobalTooltip`, draws every tooltip (`title`,
  `data-tooltip`, or an icon-only control's `aria-label`) and keeps it inside the window. Never
  add a CSS pseudo-element tooltip; it cannot avoid the screen edge.
- Back (1 Oct 2026): the header's back arrow (`BackButton`) returns to the previous screen on
  every page, and to the dashboard when the page was opened directly.
- Timers live in a floating window of pastel glass (`FloatingTimer`, 28 Sep 2026): the running
  clock with stop, and today's timers with stop and resume. Three sizes (28 Sep 2026): Open, the
  full window; Clock, a floating digital clock only; Minimized, a small bubble with a dot while a
  timer runs. All three drag on a desktop (a drag never counts as a click), and the place and size
  are remembered per browser. The header's timer button switches between Open and Minimized and
  shows a dot while a timer runs; the old header clock is gone.
- Three themes (27 Sep 2026): Sunset (the original warm tokens in `@theme`), Light and Dark
  (overrides on `html[data-theme=...]` in globals.css). Components use only colour tokens, never
  literal colours, so a theme is only a set of values. The choice is stored on the user (`theme`)
  and set on `<html>` by the root layout on the server, so pages never flash the wrong theme; the
  switch is the theme button in the header.
- The avatar at the top right opens the person's own menu: name and email, Edit profile
  (`/profile`: name, job title, own password), Arrange my menu, and Sign out. Beside the avatar
  only the workspace name shows, never the role (27 Sep 2026).
- Passwords change only through a link emailed to the account's registered address, from the
  profile or from "Forgot your password?" on the sign-in page. Links work once, for 30 minutes,
  three per account per hour; only a hash is stored; using one signs out every device. The
  forgot page answers the same whether or not an address has an account. Password rules follow
  NIST SP 800-63B (packages/shared/src/core/password-policy.ts): at least 12 characters, up to 128, no
  forced symbols or capitals, and common passwords, simple patterns and the person's own name or
  email are refused. The `password_reset` email kind cannot be switched off.
- The selected item on the dark icon rail glows (`rail-glow` in globals.css, 28 Sep 2026): a light
  pastel tile, cloud white with sunset and rainbow tints, a soft halo, drifting slowly; still for
  reduced motion. The whole desktop sidebar behind the menu carries a paler, still version of the
  same mix (`sidebar-glow`), with deep tints in the Dark theme.
- Menu (16 Oct 2026): the sidebar shows the DigiSol logo, not the workspace name; Dashboard and My desk are
  set like the group headings; Timesheet is its own group (id `time`) with My timesheet, All timesheets,
  Time report and Team activity under it; only the most specific link of the current page is active.
- Tutorials (17 Oct 2026, John): Setup → Tutorials uses tenant.manage. Upload a silent, brief MP4/WebM draft, preview, then publish explicitly. Published tutorial is shown once per user per publication in the shared FloatingTutorial player. Close/minimize/replay available; no automatic sound/playback. Never publish a draft merely to test the player. Tenant-scoped media, private drafts, server seen state and range requests are required. Current sample is an illustrative captioned Ticket tour, not a screen recording. Publish/deploy remain separate actions.
- Page identity (John, 17 Oct 2026): every module page must visibly identify its context independently of the record title and sidebar. Shared ModuleContext in the signed-in layout shows Task/Ticket/Customer/Contract/Opportunity/Space on record pages and module names on lists, plus explicit Setup, Security and Time page labels. Keep this mapping current when adding routes.
- Uniform UI wording (John, 17 Oct 2026): equivalent functions must use the same label, tooltip, icon and shared button style across COEX. Use UI_LABELS for common actions: Save / Saving, Cancel, Close, Assigned to, Start timer, Stop timer, Add time / Adding, Time history. Use sentence case and "Edit <record>" for edit tooltips (Edit task, Edit customer, Edit contract); avoid "Edit this..." variants. Tooltip and accessible name must agree. Keep distinct actions explicit: Close dismisses a popup, Cancel abandons a form, Archive preserves a record, Delete removes it. Preserve role-specific business terms where functionality differs (CRM owner is not automatically a task assignee).
- Compact detail screens (John, refined 17 Oct 2026): use transparent fact/control sections with compact icon plus name badges, minimal vertical gaps, and wrapping rows with separators between distinct action groups. Put creator and creation time below the title. Keep activity/status events out of conversations; history icons open a popup directly showing records with actor name and date/time, without a second expand click. Time totals carry a history icon, not a clock, and all person entries are immediately visible in the popup. Use shared DetailPopup and FactBadge. Edit forms open in popups; preserve permissions, data and save behavior. Image attachments show thumbnails, filename and current size; clicking previews them, including pasted images before sending. Apply this standard to existing and future COEX screens where these patterns occur, while keeping actual work content and lists visible.
- Menu headings are bold in full ink (`navigation-heading`); the current page carries a red bar
  and red tint (`navigation-active`), in the sidebar, the phone drawer and the Spaces tree.

## Where things live

- `packages/shared/` (`@coex/shared`, 12 Oct 2026): every Mongoose model and the pure business rules
  (statuses, phone numbers, week maths, email text, permissions). Folder layout mirrors the modules;
  import as `@coex/shared/crm/models/lead.model`. It never imports services, `@/` paths or
  anything HTTP. See packages/shared/README.md.
- `apps/web/` (`@coex/web`, 12 Oct 2026): the Next.js app, moved from the repository root. Pages,
  components and the service layer under `apps/web/src`; the `@/` alias points there. `.env` and
  `.env.local` stay at the repository root (the launcher `apps/web/bin/run-next.mjs` loads them). Root
  `npm run dev|build|start` still work and forward their arguments.
- `apps/api/` (`@coex/api`, 12 Oct 2026): the Express API, running beside the Next.js app and
  taking modules over one at a time. Same `coex_session` cookie, same tenant context, services
  imported unchanged from `apps/web/src/modules/*/services` until a module switches. See apps/api/README.md.
- `apps/web/src/modules/<module>/` one folder per module, services, components and actions only (models and
  pure rules live in `packages/shared`), never importing from a sibling module (Tasks and
  Tickets excepted, decision 13)
- `apps/web/src/modules/core/` tenancy, users, audit log, outbox, shared primitives
- `apps/web/src/lib/` framework level helpers: database connection, tenant context, utilities
- `apps/web/src/components/ui/` the shared component library
- `docs/` architecture, data model, onboarding
- `scripts/` migration and maintenance scripts

Cross module needs go through core services or the outbox. This rule is what keeps a modular
monolith from becoming a tangle.

## How the work runs

- A fresh Claude session per working day.
- Feedback raised in chat as numbered items, then written into FEEDBACK.md.
- Anything decided in conversation is written into CLAUDE.md or FEEDBACK.md, never left in chat.
- John runs the commands himself and pastes the output back. Standing permission for Claude to
  drive the Mac was granted 17 Sep 2026 and turned off again on 19 Sep 2026 because it spent credits
  too fast, so Claude proposes the exact command and John runs it. Installs still happen natively on
  macOS, never from the Linux sandbox, or the binaries come out wrong.
- Claude still hands over the command when the point is for John to see it run, and always says what
  it ran and what came back.
- Pushing works only from macOS: the GitHub credentials live in the Mac keychain, and the sandbox
  cannot read them. Use the Terminal bridge for git push.
- Two things stay with John: anything that costs money, and anything needing his Microsoft or
  GitHub account.
- Replies on this project in English only, whatever language the question is asked in.

## AI collaboration

Claude and ChatGPT share project context through the files in `ai/`.

Before significant work:
1. Read `ai/PROJECT_STATE.md`.
2. Read `ai/CURRENT_TASK.md`.
3. Read `ai/HANDOFF.md`.
4. Follow `CLAUDE.md` as the permanent project authority.
5. Read `FEEDBACK.md` when product history or acceptance status is relevant.
6. Inspect the actual code before making assumptions.

During work:
- Treat the repository and shared AI files as the source of truth, not another AI's conversation history.
- Do not assume that work mentioned in chat was completed; verify it in the repository.
- Do not overwrite or discard another AI's uncommitted work without John's direction.

After significant work:
1. Update `ai/PROJECT_STATE.md` with the new project state.
2. Update `ai/CURRENT_TASK.md` if the active task changed.
3. Update `ai/HANDOFF.md` when work is being handed to another AI.
4. Record permanent architectural or product decisions in `CLAUDE.md` or `FEEDBACK.md`, as appropriate.
5. State what was changed, what was tested, and what remains.

When handing work to ChatGPT:
- Write a concise handoff in `ai/HANDOFF.md`.
- Identify changed files, tests run, unresolved issues, and the recommended next step.

When continuing work started by ChatGPT:
- Read the shared AI files first.
- Verify ChatGPT's reported work against the repository before continuing.

When handing work to Claude:
- ChatGPT will update `ai/HANDOFF.md` with the current state and recommended next step.

## Environment

COEX runs on port 3100, not 3000, because the CIBO accounts program already uses 3000 on John's
Mac. Both can run at once. Cookies ignore the port, so the session cookie is named coex_session to
keep it distinct from anything CIBO sets on localhost.

Node 22 LTS, pinned in .nvmrc and in the engines field. Node 23 is an odd numbered release, never
became LTS and is already end of life; it also ships the npm build that throws
"Cannot read properties of null (reading 'edgesOut')" during install. Mongoose 9 renamed
FilterQuery to QueryFilter, so older examples found online will not compile here.

## Environment rule that bit us once

Dependencies are installed on John's Mac, by John, with `npm install` in Terminal. Claude must
never run `npm install` from its Linux sandbox into this folder: packages such as lightningcss,
@tailwindcss/oxide and @node-rs/argon2 ship compiled binaries per platform, so a Linux install
leaves node_modules unusable on macOS and the build fails with "Cannot find module
'../lightningcss.darwin-arm64.node'". The cure is `rm -rf node_modules package-lock.json` followed
by `npm install` on the Mac.

## Product and release decisions — 1 Oct 2026
- Task creator is immutable (John, 3 Oct 2026); reassignment stays allowed. The editable
  people field is labelled Assignees, distinct from read-only Created by.
- A task has one status. Each Space configures its workflow; boards and other views share it.
  Exactly one configured stage marks completion. Never infer completion from the status name.
  Prevent renaming/removing used stages or changing their completion flag until tasks move.
- Table column headings toggle ascending/descending order. Use real numeric/date sort values;
  keep task/subtask groups together and retain row editor state. Reset sort restores manual order.
- All Timesheets includes Monday–Sunday hours for the chosen week. Calendar date keys must not
  come from slicing UTC timestamps when the value represents a local week/day.
- My Desk's secondary task action is a desk icon with an accessible tooltip and selection mark.
  Only the signed-in user's eligible tasks can be added; idempotent selection never toggles an
  already-added task off accidentally. Available-task titles preview in a popup without navigation.
- After a same-day snapshot exists, the primary label is Update today’s summary.
- Team history (John, 1 Oct 2026): everyone's My Desk Performance history is visible only to
  people granted `desk.read.all` per person in Users and roles; no role has it by default
  (platform administrators hold every permission). My Desk shows a Team history tab: a table by
  day for a date range, and a person's full history. Same counts as a person's own history, no
  score. `listTeamDeskHistory` checks the permission itself.
  It is deliberately not in What's new (John, 1 Oct 2026): it is for the few people granted the
  permission, so it is announced to them directly, not to everyone.
- Senior agent (John, 2 Oct 2026): a role above agent (`senior_agent`, permissions.ts). Still an
  agent, but sees every ticket and task (`ticket.read.all`, `task.read.all`) and so can assign any
  of them to anyone, directly and at once; the assignee gets the usual alert and the audit log and
  task origin record who did it. It is not a request that needs accepting. Private Space and
  Folder member limits (decision 14) still apply. No user, tenant or audit administration. Everyone's
  timesheets and the Time report are a separate permission, `timesheet.read.all` (2 Oct 2026; held
  by tenant administrators and managers, granted to a senior agent only per person in Users and
  roles), so John decides who sees hours. `read.all` still opens Spaces and counts the person in
  unread marks for unassigned tickets. Deliberately not in What's new:
  administrators assign it in Users and roles.
- Task origin (John, 1 Oct 2026): every task shows who created it (`createdById`) and who
  assigned each current assignee (`assignments`: userId, assignedById, assignedAt, kept in step
  with assigneeIds by createTask, updateTask and patchTask). The viewer reads "Assigned to you
  by". Assignee changes are also in the audit log. Assignments before 1 Oct were never recorded
  and are not guessed. Shown on the task page, the preview and the side panel (`TaskOriginLines`).
- John authorized this release's commit/push/deploy and subsequent Mac shutdown. This is scoped
  release authorization, not standing permission for unrelated server work. Deployment remains
  blocked by SSH-key access; preserve the running Mac until deployment can be verified.
- Keep communication short and commands-first; no screenshots. Read the newest ai/HANDOFF.md
  section before continuing. Follow actual pm2/Apache deployment status, not the original design.

## Team feedback decisions — 15 and 16 Oct 2026 (John)
- Task start and due times are office time, Asia/Dubai, entered, stored and shown the same on every
  screen and machine (`packages/shared/src/tasks/dates.ts`); never parse or print them with the
  host's or the browser's own clock.
- Estimate is the one effort field on a task; Planned hours (derived from the days between start and
  end) are gone from the screens and no longer written.
- Boards keep completed tasks visible in their Done column (a Done button hides them).
- Resolving or closing a ticket stops every timer running on it.
- Tasks has "Assigned by me" and "Created by me" filters (no Remind button); both replace "Mine".
- Browser notifications are opt-in per person and browser, in-browser only (customer reply on my
  ticket, task assigned to me); no push service.
- Work updates (17 Oct 2026): the author edits their own (shows "edited", old text in the audit record);
  the author or an administrator deletes a task's own update (hidden, kept in the database); a ticket's
  internal notes can be edited but never deleted. A Personal task moves to a Space and Folder in the
  Space's first column. Time can be added by hand to a ticket as well as a task.
- Customer portal resumed 18 Oct 2026; built locally, see docs/CUSTOMER-PORTAL.md. Still on hold: subtask assignees beyond the task's own (would change
  decision 14), one-click task from an XVERSE message (needs Channels, suspended).

## Phase 2 decisions — 4 Oct 2026 (John)
- Order: Contracts / AMC, then full CRM, then Payroll. Billing is entirely in Zoho Books; COEX never
  invoices. AMC is yearly, billed monthly, bimonthly, quarterly or yearly. Support hours against a
  contract are optional per contract. All customers are treated the same: no SLA tiers.
- Contracts live in the CRM module. Covered products come from the CRM product list, addable from
  the contract form. Renewal owner is the organisation's owner. From `expiryWarningDays` (default
  30, per customer) before the end date, and after it, agents see a warning and the contact who
  raises a ticket is warned in the acknowledgement. Payroll will support AED, USD and PKR.
  Details: docs/PHASE-2-PLAN.md, docs/P2-1-CONTRACTS-SPEC.md.
- Full CRM P2.2a Leads built 9 Oct 2026 on the spec's proposals (docs/P2-2-CRM-SPEC.md, "Built"),
  before John answered its six open questions. Salespeople see their own leads, managers and
  administrators all (`lead.read.all`); lead sources are a list in Tenant settings.
- John answered the CRM spec's six questions on 10 Oct 2026: everyone may sell and John grants
  access per person; one simple pipeline; the proposed stages and lost reasons; opportunity value
  as separate one-off and recurring amounts; the proposed lead sources; the proposed reminder
  defaults. P2.2b (pipeline and opportunities) built the same day; see docs/P2-2-CRM-SPEC.md.
- P2.2c and P2.2d built 11 Oct 2026 (John: "go ahead"): lead conversion, pipeline board, win to
  contract prefill, customer page panel, opportunity reminders in the `coex-mail` worker, dashboard
  card. The full CRM plan is now complete; see "Built: P2.2c and P2.2d" in the spec. Next: the
  architecture revamp (docs/ARCHITECTURE-REVAMP.md), Phase 0.

## Architecture revamp — 10 Oct 2026 (John)
- The dev team's direction: backend Node.js with Express, frontend Next.js alone, MongoDB unchanged.
  One monorepo with shared types; Entra sign in lives in the Express API; the 30 second poll stays.
  Done without disturbing agents: same domain, cookie and database, a feature flag per module,
  Tickets last. Starts after P2.2b is accepted. Until a module has switched, decision 1 (Next.js with
  server actions) still describes it. Plan: docs/ARCHITECTURE-REVAMP.md.
- Phase 0 built 12 Oct 2026: npm workspaces, `packages/shared` holds the models and pure rules and
  the app imports them from there. The app itself stays at the repository root for now, so
  deployment, pm2 and `.env.local` are unchanged; it moves to `apps/web` together with the first
  `apps/api` in Phase 1.
- Phase 1a built 12 Oct 2026: `apps/api` (Express) with health, `/me` and read only `/leads`, OpenAPI
  generated from declared routes, and proof that the web app's session cookie works against it.
  Not routed by Apache and not started on the server until John chooses. Remaining: 1b workers,
  1c sign in and Entra routes, 1d move the web app to `apps/web`.
- Phase 1c built 12 Oct 2026 (John: 1c before 1b): login, logout, forgot and reset password and
  Microsoft Entra as `/api/v2/auth/*`, same services and same cookie, with sign in rate limits. The
  web login page is not switched. Microsoft Entra through the API needs the redirect URI
  `https://coex.digisol.ae/api/v2/auth/entra/callback` added in Azure first (John's Microsoft account).
- Phase 1b and 1d built 12 Oct 2026 (John: workers, then the web app): the three workers run from
  `apps/api/src/workers`, and the Next.js app lives in `apps/web`. Moving the app changes where
  `next start` finds its build, so `coex-app` is recreated once in pm2; see "Cutover to apps/web" in
  deploy/DEPLOYMENT-STATUS.md.

## CRM decisions — 5 Oct 2026 (John) — SUPERSEDED
Superseded on 12 Oct 2026 (John: "use the 10 Oct answers, keep as is"). The current decisions are
those of 10 Oct 2026 under "Phase 2 decisions" above: one simple pipeline, the proposed stages
including Negotiation, five lost reasons, separate `lead.read.all` and `opportunity.read.all`.
Kept below only as history; do not build from it.

- Everyone on the team sells: all staff can own and work leads and opportunities, and always see
  their own. Seeing everyone's is the permission `sales.read.all`: held by managers and tenant
  administrators by default, and granted to an agent only per person in Users and roles, as John
  decides (5 Oct 2026), the same pattern as `timesheet.read.all`.
- Several pipelines, each with its own stages (for example new clinics versus upgrades and extra
  modules). An opportunity belongs to one pipeline.
- No Negotiation stage. Stages are fully customizable per pipeline: add, rename, reorder; exactly
  one Won and one Lost. Starting set: Qualified, Needs analysis, Proposal sent, Won, Lost.
- Lost reasons start as Price and No reply, plus a free text note; the list is customizable.
- An opportunity carries two amounts: one-off (licence, setup) and recurring (AMC, subscription).
- Lead sources start with all of: Referral, Website, Event, Phone call, Email, WhatsApp, Other; the
  list is customizable. Spec: docs/P2-2-CRM-SPEC.md. User page: docs/crm-for-users.html.

## M6 Channels decisions — 1 Oct 2026 (John)
- SUSPENDED 4 Oct 2026 (John): the XVERSE team is busy on another project, so M6.3 to M6.6 wait
  until further notice. M6.1 and M6.2 stay in the code as merged; do not extend them. Next work is
  M8 hardening, then Phase 2 planning (docs/PHASE-2-PLAN.md).
- Two WhatsApp numbers: Support (tickets) and CRM (contact conversations). See docs/M6-CHANNELS-SPEC.md.
- Unknown senders open a ticket automatically (Support) or an Unidentified contact (CRM).
- Ticket received is sent automatically on WhatsApp; every other notification is optional.
- Whether XVERSE already has an inbound webhook and send API is unconfirmed: build the canonical
  Channel API and a Mock provider first, so the connector can live in COEX or in XVERSE.

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

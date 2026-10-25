# Worktello (formerly COEX) — Current AI Task

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


## Outlook web compatibility and manual — 25 October 2026

Owner authorized diagnosis, resolution and action after Outlook iframe refused to connect. Exact Outlook web ancestors/client added; tenant/user/token guards retained. Owner explicitly confirmed Entra preauthorization at action time; saved client verified. Code checks passed; web-only rollout and real Outlook acceptance pending. `docs/OUTLOOK-WEB.md` is the resolution record. Owner also requests a simple interactive HTML manual with actual screenshots and a resolution history; build this after the fix, preserve privacy and identify unverified flows. Do not send production email/task/time mutations for demonstration. Unrelated projects/ preserved.


## Completed-work release deployed — 25 October 2026

Application `4701314` (PR #42; branding #40 and Node #41 included) is live at https://coex.digisol.ae. Fresh 342 unit tests, types/lint/format, Docker CSV/Gantt integration, local/server 75-page builds and PR/main CI passed. Active blue `coex-app` id 9 / PID 302605 on 3001; green id 8 / PID 303896 on 3002 remains fallback. Three workers now run in `/srv/coex/releases/worktello-20261025` (mail 10, desk-close 11, channels 12), not the original checkout. All five application process trees verified Node 22.23.4; PM2 saved. 40/40 switch health samples succeeded ; 20 old tenant sessions expired, zero old unexpired remain, later login preserved.

Existing Teams catalog app updated to Worktello 1.2.0 and verified after reload. Real Teams web SSO/list reads and ordinary web Microsoft sign-in passed; full role/device/write pilot remains. What's new contains user-facing planning/Teams/data-transfer features plus generic maintenance counts, no branding announcement. Full backup, PIDs, CI, limitations and rollback: `ai/RELEASE-2026-10-25.md`; operating guide: `deploy/ZERO-DOWNTIME.md`. This entry supersedes earlier pending/local-only statements. Do not repeat expiry/restart for docs-only sync. Unrelated `projects/` preserved.


## Completed-work release authorized — 25 October 2026

Owner requested completed-work deployment end to end. Current release record: `ai/RELEASE-2026-10-25.md`; it supersedes earlier local-only and approval-pending release statements. Existing completed Teams timer controls are included from the later 24 October QA, without starting a new feature. Preserve unrelated `projects/`. Production is pending until the release record contains verified cutover evidence.


## Worktello rebrand committed by Claude — 24 October 2026

ChatGPT stopped before committing. Claude finished the task: branding committed alone as `f58985e` on branch `claude/worktello-rebrand` (from main `d491c0d`), pushed, PR opened for owner review. Staged snapshot verified in a clean install: typecheck, `eslint apps packages --max-warnings=0`, CI prettier globs, 298 unit tests (the earlier 342 included uncommitted WIP tests) and production build all passed. Signed-out pages (login, privacy, forgot password) render Worktello titles with no visible COEX; desktop 1440px and 390px dark mobile login and loader preview visually checked.

Not done: merge, production deployment, Teams 1.2.0 package upload, domain/DNS, trademark clearance. Owner approval required before merge or deploy.

Unrelated WIP (Gantt, Teams permissions/time/sharing, search, subtask, data transfer, local Docker) remains uncommitted in the working tree on this branch, untouched. **Do not resume the old rebrand task.** Next agent: continue from this entry; keep the WIP out of branding commits.

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


## Teams personal workspace — 23 October 2026 (implementation/QA, not deployed)

Owner approved starting COEX inside Teams. Branch codex/teams-personal-tab adds personal My Tasks, detail/latest-first updates, text posting, personal-completion filters and creator-default single-screen create. Existing message action retained. Header-bearer Teams SSO uses server-side Microsoft signature/app/tenant/scope/client verification and active linked staff permissions; no third-party cookie dependency. Permanent request receipts prevent duplicate task creation. Attachments/full editing currently open normal COEX. No live Teams SSO/pilot, real task or email claimed. Existing Entra API URI confirmation requested from owner; registration/consent and package1.1.0 installation remain external prerequisites. Detailed setup/file map/security/testing: docs/TEAMS-PERSONAL-TAB.md. Branding and existing ordinary browser login unchanged; no What's new announcement before availability. Preserve projects/.


## Microsoft redirect and DigiSol attribution deployed — 22 October 2026

PR #36 merged as `f266afe451f3881ffd6ef707b121b0deba0a705f`; PR CI run 39806601526 and merged-main run 39807108288 passed. Microsoft callback redirects now use configured public origin instead of internal listener. Login/recovery shell shows “Powered by DigiSol” above the actual high-resolution DigiSol logo, on desktop and mobile/tablet. Legal company remains Digisol LLC-FZ in policies. No branding announcement; existing maintenance entry remains generic 3 bug fixes / 1 improvement.

Local and isolated server production builds passed (71 pages); 8 redirect regressions passed; six viewport/DPR combinations (320/768/1440, 1x/2x) showed one loaded 96px DigiSol logo and no overflow. Small-screen gutters accommodate the existing security widget without changing verification behavior. Live cancelled Microsoft callback returns the public HTTPS login URL. No actual Microsoft interactive sign-in performed; success/session-cookie coverage is mocked. See `ai/RELEASE-2026-10-22-ENTRA-FOOTER.md` for deployment evidence and limitations. This supersedes prepared entries and older slot mappings; projects/ preserved.


## Login operator attribution — 22 October 2026 (prepared)

Owner requested replacing visible Digisol LLC-FZ on the signed-out shell with “Powered by DigiSol” and the actual DigiSol logo beneath it. AuthShell now shows this footer on desktop rail and below legal links on mobile/tablet, reusing transparent high-resolution public/brand/logo-long.png (3671×1240) at 96px proportional width. Company legal identity remains unchanged in policies. This extends to shared password recovery/reset screens. Branding excluded from What's new as previously requested; existing generic count is 3 bug fixes / 1 improvement for the maintenance work. Local/production build and visual verification pending; Microsoft redirect fix remains in the same reviewed release.


## Microsoft callback public redirect — 22 October 2026 (prepared)

Owner reported Continue with Microsoft landing on http://localhost:3002/dashboard after production sign-in. Root cause: callback success and error redirects used Request.url, which is the internal proxy listener. Shared entraReturnUrl now uses configured AUTH_URL / COEX_APP_URL origin for dashboard and login redirects, including not-configured failure. State/PKCE/nonce/token verification, account linking, session cookies and Microsoft registration/secrets unchanged. Cross-origin destination inputs rejected; local configured preview port remains supported.

Eight focused callback/start regressions passed: public success/session cookie, account denial, validation error, cancellation, local 3106, blank AUTH_URL fallback, not-configured error, external destination denial. Focused ESLint and fresh web TypeScript passed. No real Microsoft sign-in performed by automation. What's new remains generic and the existing maintenance count advances to “3 bug fixes and 1 improvement”; same acknowledgement ID, no new feature popup. Deployment pending; preserve projects/ and previous release state until live verification.


## Tutorial maintenance release deployed — 22 October 2026

PR #34 merged as `92525ae237c3e46723bc2461db91ccf05b1968a6` (feature `9af3896`, communication follow-up `ab04ddd`). Final PR CI https://github.com/digisol-ae/COEX/actions/runs/39802601116 and merged-main CI https://github.com/digisol-ae/COEX/actions/runs/39803184419 passed. Full local types/lint/format and **41 unit files / 262 tests** passed; isolated server build passed (71 pages). Tutorial saves now accept configured public origins behind the proxy, with admin/foreign-origin guards retained. Self-assignment email override removed as requested. What's new shows only “2 bug fixes and 1 improvement”; user-facing features/UI changes alone get detailed announcements.

**Active web: `coex-app-green` id 6 / PID 181724, port 3002, `/srv/coex/releases/tutorial-origin-20261022`.** Warm fallback: `coex-app` id 5 / PID 165915, port 3001, `/srv/coex/releases/teams-email-6a41d1f`. Exactly three workers remain unchanged in `/srv/coex/app`; five intentional PM2 entries saved. Successful graceful switch observed 40/40 HTTPS 200 responses. Owner permits brief maintenance interruption if necessary; none observed in the monitored window.

Owner-requested release logout: 23 pre-cutoff COEX tenant sessions revoked after healthy cutover; **0 pre-cutoff unexpired sessions remain**. Later logins are excluded by fixed creation cutoff. Existing auth guards return users to sign-in on their next protected navigation/request; no immediate client redirect or unsent-draft preservation claim. No account/password changes, real tutorial publication, test task or test email. Public pages healthy, tutorial metadata without auth rejected 401. Full artifacts, remaining signed-in save/playback acceptance and operating paths: `ai/RELEASE-2026-10-22-TUTORIAL-ORIGIN.md` and `deploy/ZERO-DOWNTIME.md`. Supersedes preceding local/pending and blue-active entries; later docs-only pull needs no restart. Unrelated projects/ preserved.


## Release communication and sign-in policy — 22 October 2026

Owner authorised rollout, permits a brief maintenance interruption if needed, and requested ending existing logins smoothly when users are signed in. Preflight found 23 unexpired sessions in this COEX tenant, 3 seen in the last 15 minutes. At successful cutover, revoke only this tenant's previously issued, unrevoked/unexpired sessions using the existing revokedAt mechanism and a fixed release cutoff; new logins after that cutoff remain valid. Already authorised in-flight work can finish; existing auth checks return users to sign-in on their next protected navigation/refresh. No session token contents or user identities are printed. This is operational session expiry, not a new client-side idle/draft preservation feature; do not claim immediate browser logout or saved unsent text.

What's new gets only the owner-requested generic summary “2 bug fixes and 1 improvement.” Detailed descriptions belong only to user-facing new features/UI changes; internal/backend/security/rollout details stay in developer Markdown. Count rationale for handover only: tutorial origin guard and undesired self-email override corrected; clearer tutorial errors are the improvement. This new maintenance entry supersedes the Teams entry as the latest acknowledgement, without rewriting history. Production rollout remains pending until verified.


## Tutorial link save and requested email behavior — 22 October 2026 (local only)

Validation complete: **46 focused unit tests passed**, focused ESLint and fresh TypeScript passed, local Webpack production build passed (71 pages). Preview 3106 rebuilt/restarted. No commit/push/deployment.

Owner deferred deployment and reported every YouTube link failing with “Not allowed” in Tutorials. Admin page itself requires tenant.manage; POST additionally compared browser Origin to Request.url.origin, which can be an internal HTTP URL behind the HTTPS reverse proxy. Added hasTrustedRequestOrigin: accept exact request origin or configured COEX_APP_URL (AUTH_URL fallback), reject absent/null/unrelated origins and do not trust arbitrary forwarded-host headers. Admin permission requirements remain. Origin failures now explain refresh/retry; account/permission denials have distinct messages. Supplied YouTube /embed/ID?si=... format already normalizes correctly to the privacy-enhanced player, without autoplay; iframe already uses strict-origin-when-cross-origin referrer policy.

Route regression tests exercise the supplied video ID through authenticated draft save with mocked persistence/audit: public HTTPS origin with internal HTTP listener succeeds, canonical embed URL and inactive draft are passed to tenant-scoped update; unrelated/forged origin, missing Origin and non-admin JSON writes fail; local origin and AUTH_URL fallback succeed. Also covers existing link/video rules. Native browser control remains unavailable; actual signed-in save/playback acceptance is not claimed. No real tutorial saved/published and no server changes/deployment for this follow-up.

Owner clarified self-assignment emails should remain suppressed. Locally restored Teams/task creation service and associated tests to pre-override behavior (from 078f03c): emails go to another selected assignee, not the creator assigning themselves. This clarification supersedes preceding self-confirmation decision. Current production still runs the earlier deployed override until the explicitly deferred next rollout; do not describe the local reversal or tutorial fix as deployed. Preserve unrelated projects/.


## Teams self-assignment email fix deployed — 22 October 2026

PR #32 merged as `530e19225b6839dd9c7446999418b07c3a5ac446` (feature `6a41d1f`). PR CI https://github.com/digisol-ae/COEX/actions/runs/39732776761 and main CI https://github.com/digisol-ae/COEX/actions/runs/39733067549 passed. Fresh local Webpack and isolated server native builds passed (71 pages). Existing self-action email suppression caused the creator-default Teams task to queue no email; Teams now opts into initial self-assignment confirmation through the shared service. Normal web behavior and tenant email switches retained; receipt retries cannot create another task/email. No backfill or real test email sent.

Focused 14 Teams unit tests, fresh web TypeScript/ESLint and isolated real queue regression passed (1 selected / 51 skipped). The queue regression checks ordinary self-action suppression, exactly one pending external confirmation with task URL, and both outbound/taskAssigned switches. Temporary loopback MongoDB avoided shared Atlas collection quota and existing server DB authentication; it was stopped afterwards. Real Microsoft-signed create + SMTP/inbox acceptance remains a user pilot, not claimed by queue/security checks. Local preview 3106 rebuilt/restarted and login 200.

**Active web is now `coex-app` id 5 / PID 165915, loopback 3001, cwd `/srv/coex/releases/teams-email-6a41d1f`, clean at application SHA above.** Apache COEX mappings target 127.0.0.1:3001. `coex-app-green` id 4 / PID 162142 remains warm rollback on 3002 from `/srv/coex/releases/logo-bb66964`. Original id 0 web process was retired only while green served traffic; `/srv/coex/app` still hosts exactly three unchanged workers (mail 159658, desk-close 159673, channels 159698; restart counts 3). Five intended PM2 entries saved. Do not treat the original checkout as the active web release.

Isolated build, preserved static chunks/action encryption compatibility, candidate health checks, then graceful Apache switch: all 40 monitor requests returned 200; no observed outage in that window. Proxy backup `/srv/coex/shared/apache-before-teams-email-20261022102033`; monitor `/tmp/coex-teams-email-switch-20261022102033.log`. Public login/privacy/terms/Teams dialog 200; unsigned Teams invoke 401. No DB/schema/configuration-secret change. This supersedes prior green-active and pending entries. A later docs-only pull requires no rebuild/restart. Current operating/rollback guide: `deploy/ZERO-DOWNTIME.md`; unrelated `projects/` untouched.


## Teams self-assignment email correction — 22 October 2026 (prepared)

Production read-only diagnosis: Teams task DGS-T-472 was self-assigned and had no assignment outbox row. Earlier Teams task DGS-T-470 was assigned to another person and its email was sent; outbound and task-assignment settings are enabled. Root cause is existing `alertStaff` self-action suppression combined with the new creator-default assignee, not a disabled worker or SMTP outage.

Teams now calls the shared `createTask` with trusted service option `{ notifySelf: true }`; this forwards the existing `evenIfSelf` email option for initial assignee alerts. Ordinary web creation/assignment keeps self-action suppression. Existing outbound/taskAssigned settings still apply; no separate send path, changes to private destination checks, automatic backfill or duplicate-receipt replay. A retry still returns the existing task without another creation/email.

Validation: 14 Teams service unit tests, focused ESLint and fresh web TypeScript passed. Real queue regression passed (1 selected / 51 skipped), checking ordinary self-assignment queues nothing, explicit external confirmation queues exactly one pending task_assigned email to the creator with task URL, and both tenant switches suppress later mail. Shared Atlas test run hit its 500-collection infrastructure limit; protected server MongoDB required auth. Final regression ran against a separate temporary loopback MongoDB on 27019, forced `coex_test_tasks` database, no production credentials or mail worker. Temporary MongoDB stopped afterwards. No real email/task created during QA. Source files: teams.service.ts selects the confirmation behavior; task.service.ts shares existing queue logic; tests/database/tasks.test.ts verifies persisted outbox behavior. Production rollout pending, using the isolated/graceful process in deploy/ZERO-DOWNTIME.md.


## Responsive logo release live — 22 October 2026

PR #30 merged as `a5d5356f4d903556df8cf01217e38d64c49c9de9` (feature `bb66964`). PR CI https://github.com/digisol-ae/COEX/actions/runs/39729739615 and main CI https://github.com/digisol-ae/COEX/actions/runs/39730246182 passed. Server isolated native build passed (71 pages). Transparent 1496×328 wordmark and 512×512 monogram generated from source SVGs; shared responsive sizes and theme-aware dot retained. No What’s new logo entry; unrelated `projects/` excluded.

**Active web app is now `coex-app-green`, PM2 id 4 / PID 162142, loopback port 3002, cwd `/srv/coex/releases/logo-bb66964`, clean at application SHA above. Apache COEX HTTP/HTTPS proxy targets 127.0.0.1:3002.** Prior app `coex-app` id 0 / PID 159645 remains on 3001 for rollback; its `/srv/coex/app` checkout remains the prior docs revision. Three workers remain there, unchanged PIDs 159658/159673/159698 and restart counts 3. Five intentional PM2 entries: two web slots plus exactly three workers; PM2 saved. Do not run the old in-place release script assuming `/srv/coex/app` is the active web slot.

Built separately while the original app served users, retained old hashed static chunks and privately reused its server-action encryption key. Candidate pages/assets checked before graceful Apache switch. All 40 HTTPS monitor samples returned 200; no observed outage in that window and no existing process restart. Previous COEX vhost content backed up under `/srv/coex/shared/apache-before-logo-20261022095700`; monitor `/tmp/coex-logo-switch-20261022095700.log`. Canonical sites-available configs and standard enabled symlinks synchronized; Apache config test passed. No DB/schema change, new secret, live test task or external message.

Shared-component fixture AND live public login passed 320/390/768/1024/1440px at DPR1/2, with no horizontal overflow. Mobile light/dark fixture and live 320px login screenshots inspected. This verifies logo/public-page responsiveness, not every authenticated screen; Windows Edge-specific visual acceptance remains owner-side. Evidence in `/private/tmp/coex-logo-quality/` (`results.json`, `live-results.json`, responsive/live-login PNGs). `.tsx` renders the shared logo; `.mjs` regenerates PNG/icon assets; `.md` records handover. Operational follow-up and rollback: `deploy/ZERO-DOWNTIME.md`. This entry supersedes earlier local-only and single-web-process notes; a subsequent docs-only pull needs no rebuild/restart.


## Responsive logo rendering follow-up — 22 October 2026 (prepared locally)

Owner reported rough production lettering on Windows Edge and requested mobile/tablet/all-screen optimization without taking the application down. Shared wordmark now uses a transparent 1496×328 PNG derived losslessly from the editable SVG; the dot remains vector and theme-aware. Monogram uses a transparent 512×512 PNG. Source artwork/proportions retained; lettering uses the existing application brand token. Regenerate with `node scripts/generate-brand-icons.mjs`. No branding entry in What’s new.

Focused ESLint and fresh web TypeScript passed. Isolated Chrome shared-component fixture checked 320/390/768/1024/1440 CSS-pixel viewports at DPR 1 and 2 (10 combinations), with stable proportions, loaded monograms and no horizontal overflow. 320px light/dark screenshot inspected. Evidence: `/private/tmp/coex-logo-quality/results.json` and `responsive-*.png`. This is logo/component QA, not authenticated full-application or Windows Edge visual acceptance; original Edge-specific rasterization was not reproduced on this Mac.

Production rollout must build in an isolated release directory, start a candidate on another loopback port, retain old static chunks and server-action encryption key privately, then health-check before graceful Apache proxy switching. Keep the existing app available for rollback; do not run the in-place `deploy/release.sh` for this no-downtime release. Existing mail/desk/channel workers must not be duplicated or restarted for a logo-only change. No production mutation yet for this follow-up; this paragraph is preparation evidence, not a deployment claim.


## Single-screen Teams and COEX branding deployed — 22 October 2026

Owner-authorised application rollout completed. PR #28 merged as `e70f8c0f166beaa53fd7e8eb22662d4b633ab5bf` (feature commit `1b95fc8`). PR CI https://github.com/digisol-ae/COEX/actions/runs/39727006511 and merged-main CI https://github.com/digisol-ae/COEX/actions/runs/39727214405 passed. Workspace types/lint, formatting, **41 unit files / 255 tests**, final CI build and server native Turbopack build (**71 pages**) passed. Production-only dependency audit: **0 vulnerabilities**; overall dependency audit retains 8 development findings (2 moderate, 6 high), no forced upgrades.

Server `/srv/coex/app` clean at application SHA after release. Exactly one each `coex-app` PID 159645, `coex-mail` 159658, `coex-desk-close` 159673, `coex-channels` 159698 online; one added restart per service (cumulative 3), PM2 saved. Backup before release: `/srv/coex/shared/backups/coex-2026-10-22-0913.archive.gz` (483K) and `files-2026-10-22-0913.tar.gz` (14M), server timestamp +04. Existing runtime secrets/settings retained; no new secret/configuration change.

Public HTTPS checks: `/login`, `/privacy`, `/terms` return 200 and contain final tightly cropped theme-aware inline COEX wordmark. Public wordmark, monogram, SVG browser icon, Apple icon and favicon **all five SHA256 hashes match** local release files. `/integrations/teams/create` returns 200 with intended framing CSP/no-referrer headers. Invalid form token rejected 403; well-formed unsigned Connector invoke rejected 401. No live task created and no email/chat sent for verification.

Includes one-screen Space/Folder/Assignee/Date/Time controls with eligible creator default and existing Asia/Dubai office-time semantics; new product branding/icon set and simplified Teams release wording. **No logo entry in What’s new**, as explicitly requested. Claude follow-up inline component from `d455107`/`3febced` incorporated with corrected local canvas/sizes. Browser/native signed-in dashboard visual acceptance and actual Microsoft-signed Teams message-to-task pilot remain pending; HTTP/security checks are not that acceptance.

Branded Teams installer `/Users/syedali/Downloads/COEX-Teams-1.0.1.zip` validated against Microsoft schema. SHA256 `004ec5edd9e1289843143c0ba9352c8339e98036e32eb91a5bf4cef404ac09d3`; old 1.0.0 package preserved. Single-screen server change uses existing valid domain; installation/update to 1.0.1 supplies new Teams artwork. No Teams app upload/install performed. Next: install/update and test real message action, creator default, destination privacy, chosen date/time and one saved task/source link.

Developer guides: `docs/MICROSOFT-TEAMS.md`, `docs/BRANDING.md`; release evidence: `ai/RELEASE-2026-10-22-TEAMS-BRAND.md`. This completed outcome supersedes prior local-only/pending rollout entries. Separate `projects/` untouched/untracked. A subsequent docs-only merge/pull records this outcome; no application rebuild or extra PM2 restart needed for those Markdown-only changes.

## Logo quality follow-up — 22 October 2026

Tightened wordmark SVG vertical bounds and fixed explicit proportional display sizes/object-contain after owner reported poor local quality. Sidebar/mobile 176px, desktop login 224px; artwork/colours unchanged. Focused lint, diff checks and production build (71 pages) passed. Local preview 3106 restarted. Signed-in dashboard not visually inspected: native browser control unavailable. See docs/BRANDING.md and FEEDBACK.md. No What’s new branding entry, commit or deployment.

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

## Release complete — 21 October 2026

John authorized the full reviewed COEX bundle, GitHub upload and app-server release. PR #24 merged as `ad6b8a6c5bd70df876e90709e2f33d96036ca851`; CI green, backup completed, server pull/install/native build/restarts successful. Four expected PM2 processes online with no duplicates; clean checkout and HTTPS/new public assets verified. Documentation follow-up records this outcome.

Validation: full workspace types/lint, formatting, 227 unit tests and local/server production builds passed; focused database and image browser evidence in the release/QA notes. No new full DB-suite all-clear.

Remaining: earlier QA findings in compact context, tiny-image 0 KB display; full database regression if needed for follow-up changes. Separate dOne project files remain untracked and excluded.

Read [release evidence](RELEASE-2026-10-21.md), [deployment status](../deploy/DEPLOYMENT-STATUS.md), and [compact context](CONTEXT-2026-10-21.md). Await next user task; do not infer new release authority from this completed run.

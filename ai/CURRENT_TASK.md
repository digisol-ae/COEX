# COEX — Current AI Task

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

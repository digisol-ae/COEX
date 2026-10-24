# Worktello (formerly COEX) product branding

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

## Source and owner decision — 22 October 2026

Owner asked to apply Claude’s new logo across the application and explicitly excluded this branding work from What’s new. Source branch `origin/claude/sleepy-faraday-ijs3cj`, commit `93b892bf4866b43e7e5698822d3ece9bdbe27e8a` adds only `coex-logo.svg` and `coex-monogram.svg`. Branch was fetched; only these assets were imported to preserve ongoing Teams changes. Claude marked artwork draft; owner explicitly requested implementation. A later fetch found Claude’s theme-aware follow-up `d455107` and handoff `3febced`. Its inline `components/ui/coex-logo.tsx` was imported and retains the tighter local canvas; BrandLogo delegates wordmark rendering to it, so the dot follows theme tokens. Only this component was imported from the follow-up; no wholesale branch merge or handoff overwrite.

Wordmark is red lowercase coex with a pale dot. Monogram is white C/dot on a red rounded tile. Source colours/artwork preserved. Wordmark viewport expanded from `40 200 1440 410` to `-8 257 1496 328` because the original cropped the left C stroke; this changes canvas bounds only. A follow-up quality review removed excess vertical canvas padding and set explicit display widths/heights with object-contain, keeping lettering crisp and proportionate instead of undersized inside its box.

## One shared component

`apps/web/src/components/brand-logo.tsx` renders the wordmark or `mark` variant with accessible COEX alt text. Used by desktop sidebar, desktop/mobile icon rail, mobile navigation, shared sign-in/password-recovery layout, customer portal, public policies and Teams create form. Tenant names, user initials/Space monograms and legal operator **Digisol LLC-FZ** keep their own meanings; they are not product-logo assets.

- `apps/web/public/brand/coex-logo.svg`: editable vector wordmark.
- `apps/web/public/brand/coex-monogram.svg`: editable vector icon.
- `apps/web/src/app/icon.svg`: browser SVG icon derived from monogram.
- `apps/web/src/app/favicon.ico`: legacy browser icon, 16/32/48px PNG-compressed ICO entries.
- `apps/web/src/app/apple-icon.png`: 180px touch icon.
- `scripts/generate-brand-icons.mjs`: regenerates all browser icons from the source monogram. Run `node scripts/generate-brand-icons.mjs` after editing the monogram.
- `scripts/package-teams.mjs`: generates Teams 192px colour and 32px white-on-transparent outline icons from the same monogram. Removes the red tile only for the outline. Package version advanced to 1.0.1 so installed apps can receive new artwork.

`apps/web/src/components/ui/coex-logo.tsx` is Claude’s theme-aware inline wordmark; it renders the high-density transparent letter master plus theme-aware vector dot fills. Static SVG remains the editable source/export asset.

Old `logo-long.png` and `monogram.png` retained as historical assets; active app logo references now use BrandLogo. Do not replace arbitrary initials components with product branding.

## Local QA and artifacts

Web typecheck, focused ESLint, formatting/diff checks and production Webpack build passed (71 pages including browser icon routes and single-screen Teams routes). The Teams single-screen logic passed 41 unit files / 255 tests before this visual-only branding change; no new unit tests were added just to mirror static logo markup. Native SVGs were raster-rendered for inspection; wordmark cropping fixed and inspected. Apple 180px, Teams colour 192px and outline 32px dimensions and alpha verified; favicon contains 3 entries. Public local page/icon endpoints returned 200, shared logo URLs found on login/privacy/terms, Teams dialog framing/referrer headers checked. Desktop and actual 390px mobile login screenshots inspected. Mobile viewport and document scroll width both 390px, logo images loaded. Headless Turnstile challenge did not load; no CAPTCHA/authentication acceptance or sign-in attempt claimed. Authenticated sidebar/customer session visual acceptance remains separate from shared-source/HTTP checks.

New package: `/Users/syedali/Downloads/COEX-Teams-1.0.1.zip`; previous 1.0.0 ZIP preserved. Files in `/private/tmp/coex-teams-package-1.0.1/` are reproducible build artifacts. Screenshots in `/private/tmp/coex-brand-login-desktop.png` and `/private/tmp/coex-brand-login-mobile-390.png`.

These branding and Teams single-screen changes remain local, uncommitted and undeployed. Last live application still has the previous logo/two-step Teams flow. No live task created or Teams package installed. Separate untracked `projects/` preserved. No branding entry in What’s new, per owner.

## DigiSol operator attribution — 22 October 2026

The shared signed-out shell intentionally reuses `public/brand/logo-long.png` (3671×1240 transparent DigiSol wordmark) at 96px proportional width beneath “Powered by DigiSol”. This is the exception to historical-only DigiSol asset use above; Coex product logos remain unchanged. Desktop rail and mobile/tablet footer replace the former visible company text. Legal policies retain Digisol LLC-FZ. `auth-shell.tsx` controls this responsive JSX/TypeScript layout; Markdown guides record rationale, QA and handover. No branding entry in What's new.

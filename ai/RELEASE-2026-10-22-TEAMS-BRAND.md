# Teams single-screen form and COEX branding release — 22 October 2026

## Single-screen Teams and COEX branding deployed — 22 October 2026

Owner-authorised application rollout completed. PR #28 merged as `e70f8c0f166beaa53fd7e8eb22662d4b633ab5bf` (feature commit `1b95fc8`). PR CI https://github.com/digisol-ae/COEX/actions/runs/39727006511 and merged-main CI https://github.com/digisol-ae/COEX/actions/runs/39727214405 passed. Workspace types/lint, formatting, **41 unit files / 255 tests**, final CI build and server native Turbopack build (**71 pages**) passed. Production-only dependency audit: **0 vulnerabilities**; overall dependency audit retains 8 development findings (2 moderate, 6 high), no forced upgrades.

Server `/srv/coex/app` clean at application SHA after release. Exactly one each `coex-app` PID 159645, `coex-mail` 159658, `coex-desk-close` 159673, `coex-channels` 159698 online; one added restart per service (cumulative 3), PM2 saved. Backup before release: `/srv/coex/shared/backups/coex-2026-10-22-0913.archive.gz` (483K) and `files-2026-10-22-0913.tar.gz` (14M), server timestamp +04. Existing runtime secrets/settings retained; no new secret/configuration change.

Public HTTPS checks: `/login`, `/privacy`, `/terms` return 200 and contain final tightly cropped theme-aware inline COEX wordmark. Public wordmark, monogram, SVG browser icon, Apple icon and favicon **all five SHA256 hashes match** local release files. `/integrations/teams/create` returns 200 with intended framing CSP/no-referrer headers. Invalid form token rejected 403; well-formed unsigned Connector invoke rejected 401. No live task created and no email/chat sent for verification.

Includes one-screen Space/Folder/Assignee/Date/Time controls with eligible creator default and existing Asia/Dubai office-time semantics; new product branding/icon set and simplified Teams release wording. **No logo entry in What’s new**, as explicitly requested. Claude follow-up inline component from `d455107`/`3febced` incorporated with corrected local canvas/sizes. Browser/native signed-in dashboard visual acceptance and actual Microsoft-signed Teams message-to-task pilot remain pending; HTTP/security checks are not that acceptance.

Branded Teams installer `/Users/syedali/Downloads/COEX-Teams-1.0.1.zip` validated against Microsoft schema. SHA256 `004ec5edd9e1289843143c0ba9352c8339e98036e32eb91a5bf4cef404ac09d3`; old 1.0.0 package preserved. Single-screen server change uses existing valid domain; installation/update to 1.0.1 supplies new Teams artwork. No Teams app upload/install performed. Next: install/update and test real message action, creator default, destination privacy, chosen date/time and one saved task/source link.

Developer guides: `docs/MICROSOFT-TEAMS.md`, `docs/BRANDING.md`; release evidence: `ai/RELEASE-2026-10-22-TEAMS-BRAND.md`. This completed outcome supersedes prior local-only/pending rollout entries. Separate `projects/` untouched/untracked. A subsequent docs-only merge/pull records this outcome; no application rebuild or extra PM2 restart needed for those Markdown-only changes.

Owner explicitly requested production deployment of the current reviewed local changes. Scope: one-screen Teams dialog (separate Space/Folder/Assignee/Date/Time, creator default), simplified What’s new Teams copy, COEX wordmark/monogram across app and browser/Teams icons. **No logo entry in What’s new**, per owner. Separate untracked `projects/` excluded.

## Implementation and handover

- `docs/MICROSOFT-TEAMS.md`: single-screen dialog, read-only signed-draft choice loader, Microsoft-signed creation, permission/duplicate guards, Asia/Dubai task office time, deployment and remaining Teams acceptance.
- `docs/BRANDING.md`: source assets from Claude commit `93b892b`; theme-aware inline follow-up from `d455107`/`3febced`; corrected canvas, explicit proportional sizes, all app placements and browser/Teams export scripts.
- `.tsx` files implement UI; `.ts` files handle services/API/validation; `.mjs` files regenerate icons/packages; `.md` files hold decisions/QA/handoff; `.json`/lockfile records public metadata and exact dependencies. No environment secrets in source or ZIP.

## Pre-release evidence

- Fresh workspace typecheck/lint, 41 unit files / 255 tests and formatting/diff checks passed. Final inline theme component passed focused typecheck/lint; prior local production build passed 71 pages. PR CI and server build will validate the complete final commit before release is called complete.
- Desktop and 390px mobile logo layout checked before inline theme follow-up; actual mobile scroll width 390px, logo loaded. No signed-in dashboard/Teams end-to-end visual acceptance claimed. Headless CAPTCHA could not load; no sign-in/task creation attempted.
- Teams package `/Users/syedali/Downloads/COEX-Teams-1.0.1.zip` prepared; schema/colour 192px/outline 32px/alpha checks passed. SHA recorded after calculation. Installer not uploaded/installed by this release.
- Server preflight: clean `main` at `f12a9cfbc19d8e06a40917c158214a3f2dea1353`, four expected PM2 services online, cumulative restart count 2.
- Pre-release backup succeeded (server 22 Oct 09:13 +04): `/srv/coex/shared/backups/coex-2026-10-22-0913.archive.gz` and `files-2026-10-22-0913.tar.gz`. Existing Teams runtime settings retained; no new credentials required.

Rollout in progress. Append merged SHA/CI, server health and public content/assets/authentication checks after verification. Actual Teams installation and signed message-to-task pilot remain pending and must not be inferred from HTTP checks.

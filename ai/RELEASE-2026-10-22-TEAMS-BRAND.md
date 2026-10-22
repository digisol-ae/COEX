# Teams single-screen form and COEX branding release — 22 October 2026

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

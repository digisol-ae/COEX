# Teams pilot release — 22 October 2026

Owner authorised GitHub/server rollout and guided explanations. Scope: Teams selected-message task action, packaging script, public legal pages, login legal links and documentation; unrelated `projects/` excluded.

Local checks: full workspace typecheck/lint passed; 40 unit files / 249 tests passed. Production Webpack build passed with 67 pages before the release-note-only addition. Policy signed-out HTTP 200 checks passed. Actual Microsoft-signed production invoke and Teams UI end-to-end remain pending installation/pilot.

Server preflight: clean main at `30b6255a5c5c99891f43187324c7c1e00483134b`; exactly four expected PM2 processes online. Existing Entra issuer matches owner-supplied directory UUID; client/secret presence checked without reading them to output. Eight active accounts linked. DigiSol tenant `6aae5ff8af8b7c63d6ce36d0` confirmed. Backup and release execution in progress; do not infer completed deployment from this preflight.

Public registration: application ID `0ee8f3f6-879a-4cf0-95d0-9321696f4473`, directory ID `3788e905-c187-4e8b-bafb-84b7e0ec3f1c`. Server draft secret is generated privately; never include it in docs, commits or ZIP.

## File types for handover

- `.tsx`: React screens/components with TypeScript. Legal route `page.tsx` files contain policy text; shared `legal-page.tsx` is their layout.
- `.ts`: typed services, endpoint `route.ts`, configuration and tests. Teams service handles linked identity, destination access and existing task creation. Protocol code verifies signatures and signed form drafts.
- `.md`: readable guides, decisions, validation and handoff. Start with `docs/MICROSOFT-TEAMS.md` and `docs/LEGAL-PAGES.md`.
- `.mjs`: executable Node script. `scripts/package-teams.mjs` generates manifest/icons/ZIP from public registration values.
- `.json`: structured app metadata such as the generated Teams manifest; no secrets belong in it.
- `.env`: server-only runtime settings/secrets; never commit, print or package.
- `.zip`: Teams installation package with manifest and icons, not application server source.

Deployment outcome, SHA/CI/backup evidence and remaining pilot steps will be appended after verification.

## Teams backend and policy deployment verified — 22 October 2026

Owner authorised complete rollout with guided explanations. Application PR #26 merged as `77e84585ce0626aa8f9dbcddf5bb2518ec5bb5ab`; PR CI https://github.com/digisol-ae/COEX/actions/runs/39721227941 and main CI https://github.com/digisol-ae/COEX/actions/runs/39721496951 passed. Local full workspace types/lint, 40 unit files / 249 tests, formatting, Microsoft Teams manifest schema and local/server builds passed; server native Turbopack build generated 67 pages.

Server `/srv/coex/app` clean at application SHA after deploy, four expected PM2 processes online with no duplicates and one additional restart each (cumulative restart count 2). Backup before release: `coex-2026-10-22-0813.archive.gz` (481K), `files-2026-10-22-0813.tar.gz` (14M), under `/srv/coex/shared/backups` (server timestamp). Teams environment configured without exposing credentials; draft secret generated privately, prior environment backed up mode 600. Existing Microsoft sign-in issuer matches directory; active linked-account count 8. Production dependency audit: 0 vulnerabilities; all-dependency report has 8 development findings (2 moderate, 6 high), no forced upgrades.

Live verification: https://coex.digisol.ae/privacy, /terms and /login return 200; operator Digisol LLC-FZ, contact info@digisol.ae and public policy links verified. Teams endpoint returns 401 for well-formed unsigned invoke (configured and refusing unauthenticated access). No real Teams invoke/task creation yet. ZIP `/Users/syedali/Downloads/COEX-Teams-1.0.0.zip` prepared; SHA256 `2b0fe5e748e09a271c6bb5f4d536fd65d52dbcef0b573d7f54fd7e9a150ce72d`. Microsoft schema validation passed, Developer Portal/client installation acceptance remains pending.

Next: user installs ZIP through Teams approved custom-app process, then validate actual message action, linked staff identity, destination/eligible assignee, one saved task/source link and duplicate prevention. Native browser automation unavailable; no visual/Teams end-to-end claim. Public policy deployment completes; **Teams installation and functional pilot remain open**. No separate `projects/` files committed. File-type explanations are in `ai/RELEASE-2026-10-22-TEAMS.md`; implementation/operating guides in `docs/MICROSOFT-TEAMS.md` and `docs/LEGAL-PAGES.md`. Subsequent docs-only pull requires no application rebuild/restart.

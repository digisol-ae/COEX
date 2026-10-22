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

# COEX public legal pages

## Owner-approved details — 22 October 2026

- Legal operator: **Digisol LLC-FZ** (brand: DigiSol).
- Privacy/terms contact: **info@digisol.ae**.
- Effective/updated date: **22 October 2026**.
- Privacy route: `/privacy`; Terms route: `/terms`. Both are outside the authenticated `(app)` group.
- Requested by the owner for the COEX Teams integration. These pages describe the service; they do not assert legal certification, a specific statutory retention period, worldwide compliance or an invented jurisdiction/liability cap.

## Where to amend or rebuild

- `apps/web/src/app/privacy/page.tsx`: authoritative privacy copy and metadata. Includes workspace information, Teams selected-message action, provider access, storage/security, archive/retention/deletion, functional cookies and requests.
- `apps/web/src/app/terms/page.tsx`: authoritative terms copy and metadata. Existing written agreements take precedence; authorised use, confidentiality, integrations, suspension and mandatory legal rights covered.
- `apps/web/src/components/legal-page.tsx`: shared public layout, effective/updated date, navigation and operator footer. Keep the text readable without sign-in and avoid commercial/store links on these pages.
- `apps/web/src/app/login/auth-shell.tsx`: footer links shared by sign-in and account recovery screens.
- `scripts/package-teams.mjs`: manifest publisher `Digisol LLC-FZ`; policy URLs default to `/privacy` and `/terms` on `COEX_APP_URL`. HTTPS overrides remain available.
- `docs/MICROSOFT-TEAMS.md`: registration/configuration guide and activation checks.

If wording or practices change, review both documents for consistency, update the shared last-updated date (separate it from the effective date where appropriate), and update this handoff. Do not promise permanent deletion where the application only archives or hides records. A Teams app uninstall does not delete already-created COEX tasks. Do not claim Azure Bot Global residency defines all storage locations. Confirm real provider locations/retention arrangements before adding more specific promises.

## Verification — local only

Web TypeScript, focused ESLint, formatting and production Webpack build passed (67 pages). A temporary production server on port 3104 returned HTTP 200 for `/privacy`, `/terms` and `/login` without cookies; both policy pages include the legal operator, contact and date; all three pages contain the policy navigation links. No database writes or actual Teams task creation. Native browser control remains unavailable, so visual/mobile/theme acceptance is not claimed.

Teams package regenerated at `/private/tmp/coex-teams-package/coex-teams.zip` using the owner-provided public application ID. Manifest contains `https://coex.digisol.ae/privacy` and `https://coex.digisol.ae/terms`. This is a local artifact, not a deployed site or installed app. Do not upload until both production URLs are publicly reachable and the manifest is validated in Developer Portal.

The Azure Bot/Teams channel setup is user-reported in the Teams guide. No commit, GitHub push, server deployment, legal certification or Teams installation performed with this change.

## Reference

Microsoft's [Teams validation guidelines](https://learn.microsoft.com/en-us/microsoftteams/platform/publishing/office-store-approval) require public privacy and terms pages, contact details, and disclosure of storage/retention/deletion and security controls. Meeting these content points alone does not establish store approval or legal compliance.

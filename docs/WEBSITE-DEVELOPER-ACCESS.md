# Independent website development

Website source now lives in the private [worktello-website repository](https://github.com/digisol-ae/worktello-website). It is a clean snapshot of the supplied public landing design and assets, without COEX history, application services, tenant data, database access or production credentials. Developers work on website branches and request owner review before release. No developer has been invited by this change.

The owner Website Manager remains in this app at `/website-manager`. The application owns draft reads, publication, history, media authorization and audit. Every private DTO read executes `websiteEditor`, which rechecks the stored active platform_admin role. Ordinary tenant administrators and permission overrides cannot obtain preview access. Public DTOs contain only published content and provisioning defaults.

## Contract and ownership

The application exposes three read-only versioned endpoints:

| Endpoint                  | Response                                                                           | Access                                         |
| ------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------- |
| `/api/website/v1/content` | schemaVersion1, published content or null, trialDays/storageLimitBytes             | Public, no-store                               |
| `/api/website/v1/entry`   | null or whitelisted dashboard/portal/workspace-status destination                  | Current session only, private/no-store         |
| `/api/website/v1/preview` | schemaVersion1, draft (or published with version=published), provisioning defaults | Stored active platform owner, private/no-store |

The website has no database or authentication keys. A fixed owner-configured app origin receives only the `coex_session` cookie for entry/preview checks. It never receives unrelated cookies, forwarded headers or a user-controlled upstream URL. Responses are not redirected or cached. No private error falls back to public content. Anonymous development uses bundled public defaults without an app connection.

The website is the renderer for both public `/` and protected `/website-preview`; the same-origin manager iframe continues to receive unsaved owner edits through parent/child-validated messages. Plain anchors cross to application routes, avoiding cross-runtime RSC navigation. Website static chunks use `/marketing/_next/static/`; application chunks remain `/_next/`. Images are unoptimized so private media cannot enter a public optimizer cache. `/api/website-media/*` always stays with this application.

Keep section IDs/content keys stable. New editable sections or schema changes require coordinated owner review in both repositories. Additive public contract changes must retain v1 compatibility; private metadata must never be added to the public DTO. Existing in-app renderer remains a rollback fallback until the independent deployment is accepted.

## Release controls

Keep hosting on the current Contabo VPS, with separate loopback processes and immutable release folders. No new CMS, database, paid platform or public server port is needed. Candidate website/app contract builds must pass CI, local types/tests/build, desktop/mobile visual checks and private-access checks before Apache routes change. Website developer access does not imply CMS ownership or production SSH. There is no production deployment triggered by a website push.

Proxy exact `/` and `/website-preview`, public `/website/` assets, and the dedicated website static prefix to the website process. All other routes remain on the app. Preserve session/auth/action keys, storage and workers. Retain old app/proxy configuration for rollback; rollback changes routes/code, not business data.

The COEX repository was found public during setup. A separate private website repository cannot hide already-public application source. Changing COEX visibility requires the owner's separate decision and has not been assumed by this implementation.

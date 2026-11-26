# Website content editor — 26 November 2026

Implementation is local; production has not changed.

Setup → Website Content offers plain-text landing copy, primary button links, FAQs (add,
remove, reorder), SEO/social metadata, existing website raster image replacements, saved
private previews at desktop/mobile widths, explicit publication, and restore to a new draft.
The supplied Figma layout and illustrations remain in place. Uploaded media is not supported
in this implementation; images are restricted to an explicit catalogue of existing website
assets, so no private attachment keys or external image fetches are accepted.

Every management service read and mutation calls requirePlatformAdministrator(), which
rechecks the stored active platform_admin role. Tenant permissions cannot grant access.
The preview route uses that same service guard. Navigation also filters by role. Public reads
select only the published snapshot; signed-in home redirects and provisioning values remain.

Content revisions use compare-and-swap inside MongoDB transactions. Each operation appends
an immutable version and an audit event in that transaction. Restore changes only the draft.
An isolated local replica set was used for tests, never the production database.

Validation completed:
- Nine database tests: draft isolation, publication/restore, stored role denial, inactive/deleted
  owner denial, stale writes, concurrent writers, transactional audit rollback, unsafe links/media.
- Two unit tests: navigation role restrictions and executable URL/private media rejection.
- Full unit suite: 485 tests passed.
- Signed-in local browser: owner editor, save, private desktop/mobile preview, explicit publish,
  history and restore-to-draft success. Anonymous preview redirects to login.
- Type checks, lint and initial production build passed; final checks are recorded in the PR.

QA runtime: localhost:3112, isolated coex_test_website_ui database on test replica set port27029.
The local fixture contains QA-only copy and must never be copied into production. No app
sessions, passwords, production content or services were changed.

Release review notes: the image selector currently works with existing raster assets only;
SVG/generated illustration internals retain their supplied design copy. Content fields are keyed
by original text, so repeated identical labels change together. A separate upload workflow or
independent per-occurrence editing requires an additional implementation.

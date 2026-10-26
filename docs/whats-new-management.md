# What’s New Management

Administrators with `tenant.manage` can open **Setup → What’s New Management**, including the existing Setup popup, or `/setup/whats-new` directly.

Dates and main topics expand independently in one continuous list, with all topics for the same date grouped under a single date heading. Each topic retains its own Publish / Publish changes action; publishing one never publishes the other drafts for that date. Add/edit its title, release date, sections and paragraphs; reorder topics within a date, sections and paragraphs; preview; save a private draft; publish changes; unpublish; or delete after confirmation. New topics start as drafts. Editing a published topic keeps its previous published text visible until **Publish changes** is selected. The first published topic in display order is treated as the latest update.

The staff What’s New drawer displays the published snapshot as nested collapsible dates and main topics with paragraphs, without separate topic boxes. A publication of the latest topic creates a new acknowledgement revision. Draft saves do not. Acknowledgement validates the revision actually displayed and reports a failed save instead of dismissing the drawer as though it succeeded.

## Storage and scope

`ReleaseContent` is isolated by tenant. Reads initially use the existing `release-notes.ts` history without a database write or migration. The first management mutation copies that history into the tenant’s managed collection. After that, this workspace’s history is maintained in the management screen; future edits to the built-in source array do not merge into an already-managed workspace. Other tenants retain their own history. Permissions are checked in the page and every mutation action. Mutations are audited, and version checks reject concurrent/stale saves.

## Validation — 26 October 2026

- Production build, workspace typechecks, focused ESLint and diff whitespace checks passed.
- Nine focused tests passed across `release-content.test.ts` (unit and database) and `release-content-actions.test.ts`: draft privacy, republishing revisions, ordering, hiding/deleting content, validation, tenant isolation, concurrent first writes and updates, management permission gating, conflicts and stale/failed acknowledgements.
- Database tests ran against a separate disposable MongoDB on port 27126, using a `coex_test_` database. Browser QA used a separate synthetic tenant/database and a production-mode app on port 3112. Existing port 3110 and live records were not used.
- Browser verified Setup tab navigation, collapsed topics, editing, preview, saving a new draft, publishing, expanding the published drawer topic, acknowledgement and reload persistence.
- Ordinary-agent browser access QA stopped at the sign-in security check; permission enforcement is covered by the server-action test. Mobile and dark-theme visual QA were not exercised.
- Screenshots: `outputs/qa/whats-new-management-20261026/management.png` and `drawer.png`.
- Temporary QA server and MongoDB were stopped afterward. No commit, push or live deployment was performed. Pre-existing contract/release-note edits were preserved.

## Continuous layout revision

Same-date pushes now share one date heading in both Management and the staff drawer, including non-adjacent source entries. Date grouping leaves stored topics, draft/published snapshots and acknowledgements intact. Date headings use subtle separators; topic content flows underneath without cards. Topic reordering stays within its date. Focused tests cover grouping across separate pushes and independent per-topic publication.

Revision validation: 10 focused unit/action tests, workspace typechecks and focused ESLint passed. The production build passed with `npm run build -- --webpack`; Turbopack could not bind its build-worker port under the current sandbox. The existing isolated preview on localhost:3100 was restarted with the rebuilt app. Browser QA confirmed five topics under a single 25 October date, independent topic expansion, per-topic publication controls, and collapsing/reopening the entire date without losing the topic expansion. Screenshot: `outputs/qa/whats-new-management-20261026/continuous-management.png`. The preview and management tab remain open for the user. No live deployment.

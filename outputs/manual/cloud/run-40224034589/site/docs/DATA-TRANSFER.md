# Import and export

## Guided templates, contact import and match review — 25 October 2026

Implementation on `codex/import-review-contacts`; production deployment is not yet completed. The previous live version silently skipped matches and did not support contacts. The live AUTH_SECRET configuration issue was fixed separately, with 111 customer creations and 13 matches skipped in that earlier authorized import. Those 13 require business review; they are not automatically re-imported by this change.

Open **Setup → Import and export**. Staff need `tenant.manage` plus the module read and manage permissions. Contacts use customer permissions. Customer-facing accounts cannot transfer records. Task exports retain private Space/Folder boundaries.

1. Choose Tasks, Tickets, Customers, Contacts, Leads, Products or Contracts.
2. Download the template. Every file has two marked examples and the page lists required fields, allowed values, date/amount/country/URL formats and matching rules. Delete both example rows; retain headings. Any non-empty `_example` cell blocks that row and the entire import preview. Empty marker columns are accepted.
3. Import customers before contacts; customers/products before linked contracts/tasks/tickets. For contacts use `customer` (one exact customer name) or `customerId` (the `_id` from a customer export). If both are supplied they must agree. IDs remain tenant-scoped. Repeated customer names need an ID.
4. Upload and preview. No records are changed during preview. Invalid rows block the entire import. Each possible match identifies the existing record or previous CSV row, the matching fields, and (for customers/contacts) existing/incoming values.
5. Decide every match. **Skip** is explicit. Customers/contacts additionally offer **Create separately** and **Update a specific existing matching record**. Shared email addresses do not prove two businesses are the same. File-only matches cannot be updated: combine rows or choose skip/separate creation. Other modules support explicit skip; change their matching fields to create a different record. Product codes stay unique.
6. Update changes non-empty CSV fields and preserves blank existing fields; it does not move a contact between customers. `false` explicitly clears primary status. A primary contact becomes the customer's default reply recipient and demotes other primaries. Portal-linked emails cannot be changed through imports. Importing contacts does not provision portal users.
7. Preview again after changing decisions. The signed 15-minute proof binds the file, tenant, account, record type, choices and match snapshots. Changing a destination/value/decision invalidates the old proof. Two rows cannot update the same existing record in one import. Review the create/update/skip totals, then confirm.
8. Read created/updated/skipped/failed results; download the review report. Runtime errors may leave a partial import. Retry only failed rows, with a fresh preview and explicit match decisions. No whole-file transaction or exactly-once retry guarantee is claimed.

Limits: 500 rows / 2 MB per import, 10,000 core records per export. Template headings are case-sensitive. Unknown columns fail validation. Exported `_id`, `_number`, `_status`, `_owner`, `_assignees`, `_folder` metadata is read-only. Contacts export customer names and IDs, name/title/email/mobile/primary status. Notes, portal accounts, locations and custom fields are not included in contact import/export.

Imports use the normal services, permissions, tenant scoping, numbering/audit and alert rules. A tenant/module database lock serializes imports; crashed locks expire after 30 minutes. Matching records are rechecked before writes. New/changed matches fail the affected row for renewed review rather than silently skipping it. All business exports/reports are private; spreadsheet formulas are neutralized.

Tasks start unassigned in the first column, tickets New, leads New with importer ownership, contracts Draft, customers/products/contacts active. Exports omit attachments, conversation history, custom fields and detailed service/pricing configuration. This is not a complete backup/restore format.

## Verification

- Full unit suite: 55 files / 384 tests passed. Workspace types, lint, CI formatting and 75-page production build passed.
- Disposable local Docker database only: `scripts/check-import-review.ts` verifies all seven example files, preview no-write, shared-email review, skip/separate/update, file/name duplicates, blank preservation, stale/tampered proof rejection, tenant isolation, contact customer/mobile matching, export, ambiguous references, primary demotion and portal email protection.
- `scripts/check-docker-transfer.ts` was updated for explicit skip decisions and contacts; its historical shared Docker fixtures were not used for this change.
- Local UI browser QA was declined by the browser permission gate. Do not claim desktop/mobile interaction or production acceptance from service tests.
- No new business import or update was made on production for this implementation.

Production prerequisite: a private non-empty AUTH_SECRET must be available to the running web app. Check an authenticated live preview after deployment; HTTP 200 at login does not validate import configuration.

# Staff/customer account separation — 28 October 2026

Status: implemented and checked locally. No production release, commit, push or live account migration.

## Findings

The local Task assignee filter already used the staff-only lookup added during performance work. That fix had not been deployed by this agent. The remaining mixed administrative Users list deliberately retained all accounts under the previous scope; the latest feedback requires separate staff/customer administration too.

An additional backend loophole allowed an already-saved customer assignee to pass the “retain historical assignment” exception. This is now rejected. Historical suspended/deleted staff can remain assigned without treating customer accounts as staff.

## Changes

- Added one explicit `STAFF_ROLES` allowlist: platform administrator, tenant administrator, manager, senior agent and agent. Staff queries use that allowlist instead of merely excluding `client_contact`, so unknown/imported roles do not enter staff choices.
- Applied the allowlist to the shared staff lookup and assignment validation, Teams/Outlook people choices, CRM ownership, internal mentions/alerts, contract staff recipients and the staff email exclusion used by ticket contact discovery. Customer contacts and ticket requesters remain their own CRM/customer flows. CC email suggestions may intentionally contain both customer and Team recipients, labelled by source; they are not assignee choices.
- Users administration defaults to **Worktello users**. **Customer portal accounts** is a separate view and separate database role filter. Neither list includes the other account type. Both retain tenant/deletion boundaries and the 10-record display behavior.
- Worktello Add user and Role selectors offer staff roles only. Customer login provisioning remains through the customer/contact flow. Customer accounts cannot be converted to/from staff roles through the ordinary role-change service, nor assigned staff permission overrides through the staff access service. Existing customer status/password management stays available in the separate customer account view.
- New assignments must be active staff in the same tenant. Customer IDs are rejected even if they were previously saved on the item. This does not automatically rewrite historical production assignments or alter any live credentials.

## Verification

- Synthetic local review database contains 12 staff and 420 customer accounts, created by guarded/idempotent `scripts/seed-account-separation-local.ts`. The script refuses every URI except `mongodb://127.0.0.1:27020/worktello_feedback_local` and does not change existing credentials or start delivery workers.
- Browser at localhost:3111: Task assignee filter has exactly 12 staff options and zero customer options. Worktello users reports 12. Separate customer view reports 420, initially renders 25 customer rows, contains zero synthetic staff rows and has no staff Add user control.
- Broad affected suite: 573 tests passed across 75 files. After adding direct mutation regressions, Tasks/Tickets/Portal/account suite: 118 tests passed; final account/Portal boundary tests: 18 passed. These are overlapping runs, not additive totals.
- Boundary regressions cover 12 staff/420 customers; suspended history; foreign tenants; deleted staff; an unknown imported role; separate administrative queries; direct customer assignment attempts for Tasks and Tickets; retained customer IDs; blocked staff/customer role conversion and staff permission overrides. Existing Portal account provisioning/isolation tests still pass.
- Root typecheck and optimized local webpack build checked separately. Production is not claimed fixed by local checks.

## Production boundary

Earlier production diagnostics found the broad 432-account lookup. This turn verifies the corrected local application, not a new production deployment. Until a reviewed release includes these changes and the deployed Task filter is checked as an affected agent, do not tell the team the live defect is resolved. Keep requesters, contacts, customer login accounts and staff assignments separate during release verification; do not delete or recategorize customer records merely to hide the selector defect.

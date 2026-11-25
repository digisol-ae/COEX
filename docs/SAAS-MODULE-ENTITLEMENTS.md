# Workspace module restrictions

25 November 2026 — implemented locally; no production deployment.

## Modules and ownership

| Module | Included capabilities |
| --- | --- |
| Tasks and time (`tasks`) | Tasks, spaces, folders, My desk, Gantt, timers, timesheets, activity reports, Teams/Outlook/Copilot task operations |
| Support (`tickets`) | Tickets, queues, saved replies, customer portal, customer resources, support intake and WhatsApp/channel operations |
| Sales CRM (`crm`) | Products, leads, opportunities, pipelines, contracts, agreements and signing |

Company identity, users, security, customer organisations, contacts and locations remain shared
foundations. Shared customer notes remain available; timeline entries linked to unavailable sales,
task or support records are omitted. Support can therefore work without Sales CRM or Tasks/time.
Time on a ticket requires both Tasks/time and Support. Disabling a module preserves its records.

Only the platform owner may change modules in Setup → Tenants → Manage → Module access.
Published plan versions also record their modules. Effective access is the intersection of the
plan snapshot and tenant flags; setting a tenant flag cannot enable an excluded plan module.
Old tenants and old plan snapshots default to all modules. No trial allowances were changed.

Module changes and audit entries commit together. A manual subscription replacement that detaches
the catalogue snapshot preserves its effective restrictions as tenant flags; it does not implicitly
restore excluded modules. An explicit owner change or new plan is required to change access.

## Enforcement

- The shared web/Express session resolver intersects role permissions, grants and denials with
  effective module allowances on every new request. UI permission checks use that resolved list
  directly, without reconstructing role grants. Menus, quick creation, search and notifications
  inherit the filtered permissions. Module-specific Setup tabs also require their module access.
- Service entry guards check current tenant allowances independently of browser permissions.
  This covers task, time, ticket, resource and sales operations, attachments and data transfer.
  A platform role does not bypass module allowances when operating in a restricted tenant.
- Mixed surfaces omit unavailable records and widgets: dashboard, My work, shared customer
  timelines, linked task/ticket details, time reports and CSV exports. Customer/Support pages
  avoid calling Sales or Tasks services when those modules are unavailable.
- Portal tenant/account resolution and every portal data operation check Support. Existing
  resource and signing capability links pause when their module or workspace access is off;
  no verification token is consumed and no code is queued through the paused link. Restoring
  the module restores an otherwise still-valid link; its original expiry still applies.
- Teams bot/form/tab, Outlook and Copilot task operations require Tasks. Channel authentication,
  intake, outbox leasing and delivery require Support. Mailbox discovery/polling stops before
  progress changes; pending inbound channel work remains pending. CRM reminders, daily reports
  and automatic desk close skip unavailable workspaces/modules.
- Newly queued module email is refused when disabled. Existing module email is deferred before
  SMTP, kept pending and given its attempt back. A one-minute delivery deferral avoids paused
  tenants starving other mail. Account security/trial-registration messages remain independent.
  Old mention emails without a module marker pause conservatively if any module is unavailable.
- Running timers must be stopped before their module is disabled, including assignment of a
  restrictive plan. Timer admission and module/plan changes serialize through the tenant document
  so a concurrent start cannot leave a running timer behind an access restriction.

A module check controls product availability, not record ownership. Tenant, staff-role,
contact/customer, private-space and file checks remain independently required. An in-flight
operation already admitted before a change may finish; subsequent service entries recheck access.
This stage does not constitute a complete tenant-isolation or production-security audit.

## Verification

Database tests exercise plan/tenant intersection, legacy defaults, existing sessions, permissions,
direct service read/write denial, platform/admin boundaries, foundation access, combined views,
background no-op behaviour, queued email deferral, audit rollback, manual overrides and racing
module changes/timer starts. Public-link tests cover resource OTP and contract signing pauses.
Teams tests explicitly cover both bot creation and tab reads against an excluding plan snapshot.

Existing isolation fixtures now create real tenant records before using a context; missing or
unavailable tenants fail closed. Unit tests for Gantt and desk orchestration mock the module
boundary; real entitlement decisions are covered by the database tests.

Final verification: production QA build, workspace type checks, changed-file lint and diff checks
passed. Full suite: 871/872 tests passed; the sole failure is the existing signed-contract
`refuses a PDF for tampered evidence` test. Targeted module/Teams integration tests passed 50/50;
mixed module/customer tests passed 20/20 after the final service changes. Final preview/sidebar
changes were verified with the rebuilt application in the browser.

Browser acceptance saved Support-only access for `subscription-qa-company`, confirmed Save → Close,
verified the separate owner workspace retained its modules, and signed in as the restricted
tenant administrator. Support list, preview, full ticket, queue settings and allowance display
worked. Tasks, Contracts and platform tenant-management URLs redirected with denial; the time
API refused access. My desk, task/time/sales menus and ticket time widgets were absent.

Screenshots: `outputs/qa/modules/owner-support-only.jpg` and
`outputs/qa/modules/restricted-support-workspace.jpg`. Only isolated `coex_test_subscription_ui`
fixtures were changed; no mail worker, real inbox, payment provider or production system was used.

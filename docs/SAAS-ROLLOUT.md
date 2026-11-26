# Worktello subscription rollout

Agreed scope, 25 November 2026: public Worktello registration; approval required initially;
verified automatic registration later; an isolated tenant per subscribing company; a 30-day trial
starting after approval and provisioning; owner-controlled extensions; configurable storage starting
at 2 GB; tenant-bound customer portals; recurring subscriptions and payment integration later.

## 26 November deployment checkpoint

The foundation and follow-up are live. Current source/runtime, tested backup restore, writer-safe
storage reconciliation, forwarded-IP hardening, pending owner recovery and registration/provider
boundaries: [release record](../ai/RELEASE-2026-11-26-BACKLOG.md). Public registration remains closed,
manual approval retained, payments/future automatic activation deferred. Earlier implementation
labels below record their original phase rather than the current runtime.

## First implementation: tenant commercial controls

Local implementation, not deployed:

- Setup → Tenants is restricted to actual platform administrators, including service-level checks.
- New tenants receive a trial and storage allowance from platform defaults: 30 days and
  2,000,000,000 bytes. Owner changes to these defaults affect future tenants only.
- Tenant, first administrator, default support queue, and creation audit records are provisioned
  in one MongoDB transaction. A replica set or transaction-capable cluster is required.
- Existing tenants retain legacy access. Existing storage receives the default allowance unless
  an allowance was explicitly stored. Check their usage and set suitable allowances before release.
- Owners can change individual storage allowances and extend trials, with a mandatory reason
  and audit entry. An allowance cannot be reduced below current usage. Extensions add days to
  the later of now or the current expiry. Suspended accounts are not reactivated by an extension.
- Tenant administrators see their usage and trial date in Tenant settings; these values are not
  accepted by ordinary tenant settings updates.
- Tenant-admin sessions cannot carry another tenant's identity or impersonation target. Permission
  overrides cannot grant platform powers, and tenant administrators cannot create or promote
  platform administrators.
- Expired sessions remain identifiable for the access-paused screen and sign-out. Staff and portal
  actions, Express APIs, Teams task entry, inbound email, and WhatsApp intake enforce access
  checks. CRM reminders and daily reports skip unavailable tenants before claiming work.

## Storage accounting

The quota applies to files in the private tenant store, including task/ticket attachments, customer
resource uploads, imported Outlook files, and stored report attachments. Compressed images count
their actual stored bytes. Database records, inline branding data, transient generated downloads,
logs and backups are outside this file quota.

The first quota operation counts pre-existing physical files under the tenant's storage directory.
MongoDB compare-and-set initialisation and atomic byte reservations prevent concurrent uploads
from overspending. Failed writes refund reservations after cleanup. Partial ticket-upload batches
are removed on failure. File removal refunds actual bytes once, even if two removers race.
Archiving a record does not free storage while its files remain retained.

All application replicas and workers must use the same persistent storage backend. The current
adapter is local disk: separate, unshared replica disks are not supported. Before horizontal
scaling, implement a shared object-storage adapter with durable object accounting. Writes or
deletions performed outside this adapter require reconciliation. Process crashes can leave
conservative reservations or orphan files; add an auditable reconciliation job before public launch.

## Public applications and owner approval

Implemented locally, not deployed:

- The public home page offers Log in and Apply for a trial. `/register` explains email verification
  and approval before access. Existing staff login is `/login?view=staff`; existing customer login
  is preserved. Signed-in users return to their own workspace, portal or access-paused screen.
- Applications default to closed. In Setup → Tenants, the platform owner can open them after
  configuring outgoing email in the owner's workspace, `COEX_APP_URL` (the public origin, e.g.
  `https://worktello.com`) and an `AUTH_SECRET` of at least 32 characters. Registration messages
  use that designated platform workspace's Admin sender, falling back to its standard sender.
  Email configuration readiness does not establish real SMTP delivery.
- Submission stores company, requested identifier, administrator name and email. No workspace or
  user is created. A random, hashed verification token lasts 24 hours. A confirmation button on
  the email link submits the application for review; GET requests do not consume the link.
- Only verified pending applications can be approved or rejected by an actual platform owner.
  Approval creates the tenant, invited tenant administrator, support queue, activation email and
  audit records in one MongoDB transaction. The configured trial begins at approval. Rejection
  requires an explanation, queues it by email, and creates no workspace. Repeated concurrent
  approval cannot create duplicate tenants.
- The first administrator receives a 48-hour, single-use activation link and chooses a password.
  No initial password is sent or displayed to the platform owner. The account cannot sign in until
  activated. A rate-limited activation-email request replaces expired links and invalidates the
  previous token. Password policy and tenant status are checked during activation.
- Public submission and link reissue use distributed hourly rate limits: 10 per IP and 3 per email,
  plus a ten-minute verification resend cooldown, honeypot and the existing optional Turnstile
  integration. Identifier keys are HMAC-hashed; rate records expire automatically. The reverse
  proxy must replace forwarded client-IP headers and prevent direct untrusted access to the app.
- Existing-account and duplicate-application responses are deliberately generic. Abandoned
  unverified applications expire after three days. Rejected applicants may resubmit after the
  resend cooldown. Slugs are reserved by tenants at approval, not by unverified applicants.
- Owner review shows the latest 100 applications; applicant tokens and credential hashes never
  appear in that list. Review decisions and registration settings are audited. The automatic-mode
  field remains reserved: all verification still requires approval, even if that field is set.
- The outbox and email worker handle verification, approval and rejection delivery. Transactional
  changes roll back if email cannot be queued. No payment provider or subscription charging is
  enabled by these changes.

Registration database coverage passed alongside the existing SaaS foundation tests (25 checks).
The full regression suite passed 827/828; the same separately modified signed-contract evidence
case remains failing. Workspace type checks, changed-file lint and the production build passed.
Browser acceptance passed for the public landing page, submission, email confirmation, pending
review, owner approval and activation-link landing page. Synthetic intake left the platform as
the only tenant until approval; approval then created one invited administrator and one isolated
trial tenant, ending on 25 December 2026 with 2 GB storage. Password entry and first login were
covered by database tests rather than entering a new credential through browser automation.
All notification messages remained in the isolated test outbox; no real inbox delivery was tested.
Screenshots are in `outputs/qa/registration/` (`landing.jpg`, `submitted.jpg`, `pending.jpg`,
`approved.jpg`, `activation.jpg`). The temporary server and local test database were shut down.
Public registration remains closed by default and no production configuration was changed.

## Tenant-specific customer portals

Implemented locally, not deployed:

- Company portal entry is `/portal/<tenant-slug>`, with scoped new-ticket, ticket-detail and
  profile pages. Login, email-code sign-in, activation and recovery carry `?tenant=<slug>`.
  The server resolves that slug to an active, non-deleted company with support enabled before
  looking up a customer account. An invalid explicit scope never falls back to global email.
- Password and email-code sign-in select a `client_contact` account in the requested company.
  The same email can have independent accounts in multiple companies. Global legacy auth
  still refuses ambiguous matches. Staff password/Entra sign-in and staff recovery explicitly
  exclude customer portal memberships.
- Each canonical data page checks that the signed-in customer belongs to the requested tenant
  before reading any records. A different signed-in tenant or staff account must explicitly sign
  out before using the target customer portal. Changing the URL cannot switch session context.
- New-ticket, reply and profile forms carry a tenant stamp checked against the current session.
  An old form cannot silently create records in another company after an account switch.
  Existing contact, customer, ticket visibility and attachment checks still apply. Notifications,
  profile links, logout and new ticket URLs preserve the authenticated company.
- Existing generic `/portal`, `/portal/new`, `/portal/profile` and ticket bookmarks redirect to
  the authenticated customer's canonical portal. Unknown company links show no private records.
  New identifiers `new`, `tickets` and `profile` are reserved to avoid legacy-route collisions.
- Contact provisioning creates an invited customer account with no password, links it to the
  contact and queues a company-specific invitation in one transaction. It does not repurpose
  existing staff accounts. If email is unavailable, the owner receives the activation page and
  must configure outgoing email so the contact can receive its verification code.
- Activation and reset tokens are checked against the chosen tenant during consumption as
  well as issuance. Newly issued customer code and recovery emails include canonical company
  links, including when a unique customer started through an old generic page. Codes are
  single-use and retain their existing attempt/cooldown limits.
- Express password login and recovery routes accept the same optional `tenantSlug` selection;
  the web and API continue to use the same authentication services.

This stage retains one account row per tenant/email; it does not merge accounts, passwords,
customer organisations or tickets across companies. A central identity with multiple memberships
and shared SSO needs a separate explicit migration; email equality alone must never merge access.
Company customers are invited by their support team; there is no public customer self-enrolment
into an arbitrary company. Public trial registration remains for subscribing companies only.

## Manual subscriptions and staff seats

Implemented locally, not deployed:

- Platform owner: Setup → Tenants → Manage → Subscription assigns a custom plan label,
  staff-seat limit, active/past-due/canceled status, inclusive UTC access end date and required
  reason. The existing settings drawer keeps the editor separate from the tenant table.
- Subscription changes and their audit entry commit together. Past due and canceled pause
  access immediately; active subscriptions expire through the existing shared session check.
  A manual renewal restores access without deleting records. There is no automatic grace period.
- Occupied seats are active and invited staff, including administrators. Suspended or deleted
  staff release capacity; customer portal memberships are counted separately and are not billed
  as staff seats. Creation and reactivation enforce the limit on the server.
- Admissions, suspensions and plan changes serialize through a tenant write in MongoDB
  transactions before counting staff. Concurrent requests cannot both consume the last seat.
  A downgrade below occupied seats is refused. Invited staff activation uses its reserved seat.
- Tenant settings display the plan, occupied staff seats, portal memberships, storage and paid
  access end date. Only the platform owner can change commercial terms. Existing tenants and
  new trials have no seat cap until explicitly configured; no guessed trial seat limit was applied.
- A plan is currently an assigned label and allowance, not a reusable price catalogue. Storage
  remains independently configurable. No charges, invoices, payment integrations or external
  notifications are created. Provider reference fields are retained for the later billing adapter.

Verification on 25 November: focused subscription, SaaS and portal suites 29/29 passed;
full suite 845/846 passed. The only failure remains the separately modified signed-contract
`refuses a PDF for tampered evidence` test. Workspace type checks and scoped lint passed.
Production QA build passed. Browser acceptance verified assigning a plan, seats and access date,
Save → Close → Save after editing, repeated saving and persistence after reload. Screenshot:
`outputs/qa/subscriptions/owner-subscription.jpg`. Only disposable local fixtures were used.

## Reusable plan catalogue

Implemented locally, not deployed:

- Platform owner can publish immutable plan versions identified by code/version, with a name,
  workspace price, supported currency, monthly/annual interval, staff seats and storage. Prices
  are stored as integer minor units using the currency's decimal precision. No prices are seeded
  or assumed. Publication and archival write an audit entry in the same transaction.
- Manage → Assign catalogue plan snapshots the selected version into the tenant and applies its
  seats/storage plus an explicit inclusive UTC access end date. It activates manual paid access;
  it does not collect money or calculate an invoice. The owner must supply a reason.
- New versions do not change existing subscribers. Archived versions stop accepting assignments
  but existing snapshots survive. Assignment and archival serialize through the plan document;
  assignment also locks the tenant to protect seat/storage downgrade checks against concurrent
  admissions and uploads. Its audit and changes commit together.
- Tenant settings show the version and agreed price. Manual renewal with the same plan name and
  seats retains the snapshot. Replacing those with custom terms detaches it; an independent
  owner storage override can differ from the published allowance and is separately audited.
- The subsequent module-restriction stage adds module selections to published plan versions;
  see `docs/SAAS-MODULE-ENTITLEMENTS.md` for its enforcement and verification boundaries.
  Trial plan/seat defaults remain unchanged.

Catalogue verification on 25 November: focused catalogue/subscription/SaaS coverage 28/28
passed; full suite 854/855 passed. The only failure remains `refuses a PDF for tampered evidence`
in separately modified signed-contract code. Production QA build, workspace type checks and scoped lint passed.
Synthetic browser acceptance published `qa-standard` v1 at AED 49.95/month with five staff
seats and 5 GB, assigned it, verified persistence after reload, archived it and confirmed that
it disappeared from assignment choices while the tenant retained its terms. Screenshot:
`outputs/qa/plans/catalogue.jpg`. These are synthetic local prices, not approved sales pricing.
No production data, public pricing, customer email, charge or deployment was changed.

## Module restrictions

Implemented locally, not deployed. See `SAAS-MODULE-ENTITLEMENTS.md` for module definitions,
service/integration/worker coverage and public-link behaviour. Plan versions now include Tasks/time,
Support and Sales CRM selections. Effective allowances intersect the assigned snapshot with owner
settings; tenant administrators cannot override them. Customer organisations/contacts remain shared
foundations. Existing snapshots default to all modules. Payments remain explicitly deferred.

Module verification: full suite 871/872 passed (only the existing signed-contract evidence test
fails); final QA production build, workspace types, changed-file lint and diff checks passed.
Browser acceptance confirmed Support-only operation, hidden disabled menus/widgets, direct route
and time API denial, owner-only controls, working Support queue settings without Sales CRM and
read-only effective allowance display. Evidence: `outputs/qa/modules/owner-support-only.jpg` and
`restricted-support-workspace.jpg`. No production data or deployment changed.

## Remaining rollout stages

1. Optional trial plan/seat defaults and additional metered usage limits once their commercial
   definitions are agreed. Module restrictions are implemented above; no trial defaults changed.
2. Payment provider integration (deferred by the owner): hosted checkout, verified and idempotent webhooks, invoice /
   subscription reconciliation, renewals, cancellation and an explicitly chosen payment grace
   policy. Enable automatic registration only once verified provisioning is complete.
3. Release review: full tenant isolation audit beyond the session fixes, public signing/shared-link
   expiry policy, background-work boundaries, backup/restore and storage reconciliation, monitoring,
   staging and deployment. Verify registration email in a real inbox, production domain and sender
   configuration, CAPTCHA and proxy settings before opening public applications. No claim of
   complete SaaS readiness at this stage.

The original task/ticket Save → Close interaction remains a separate UI requirement; the tenant
commercial control uses it, but the original task and ticket forms are not changed in this phase.

## Verification

Use an isolated MongoDB replica set and `MONGODB_TEST_URI`. The test helper forces database names
to `coex_test_*`; do not run manual QA against a live tenant. No test customer emails are needed.

Focused coverage includes existing-file accounting, simultaneous upload admission, failed-write
refunds, batch rollback, concurrent deletion refunds, cross-tenant file denial, platform-role
escalation, trial expiry on an existing session, extensions, transactional provisioning rollback,
and Teams access after expiry.

The checkout already contained unrelated signed-contract and branding changes before this work.
Keep their review and release evidence separate from these tenant controls.

Earlier foundation verification on 25 November: focused suite 85/85 passed; full suite 813/814 passed. The remaining
failure is `tests/database/agreement-signature.test.ts` → `refuses a PDF for tampered evidence`,
in the separately modified signed-contract code. Those changes were left untouched. Type checks,
lint for changed files and `git diff --check` passed. The production build passed with
`npm run build -- --webpack`; Turbopack could not bind its CSS worker port in this environment.
Browser acceptance for these commercial controls passed after the local-site permission was
enabled. Synthetic local tenants verified a storage increase from 2 GB to 5 GB, persistence across
reloads, Save → Close → Save, invalid required-field handling, repeated saves, and trial extensions.
The tenant administrator saw only its own allowance and was redirected away from a direct
platform-management URL. Expiring the trial blocked an existing session; a seven-day owner
extension restored access. Two UI bugs found during acceptance were fixed: invalid forms must
not reuse the previous saved state, and the operation selector must stay aligned with its fields
after a successful extension. The final QA production build and changed-component lint passed.

Screenshots: `outputs/qa/saas/owner-storage-saved.jpg`, `tenant-allowance.jpg`,
`trial-expired.jpg`, and `trial-extended.jpg`. The isolated QA build uses optional CAPTCHA settings
consistently disabled for synthetic local accounts; production configuration was not changed.
This is acceptance of the first commercial-controls stage, not the full public SaaS rollout.
No production tenant, deployment, domain, payment provider or customer email was changed.

Tenant portal verification on 25 November: production QA build passed with Webpack; workspace
type checks, scoped lint and `git diff --check` passed. Full suite: 837/838 tests passed; the only
failure remains the separately modified signed-contract test `refuses a PDF for tampered evidence`.
The portal coverage includes independent accounts sharing an email, staff exclusion, scoped
activation/OTP/recovery, invitation provisioning, stale forms and ticket/attachment isolation.

Synthetic browser acceptance verified company login, Alpha ticket creation, explicit sign-out
before changing companies, refusal of Alpha's password in Beta, Beta's own ticket list, a 404 for
Alpha's ticket under Beta, and refusal of a stale Alpha submission after switching to Beta.
Company-specific email-code login completed and opened only Beta's ticket list. Account-menu
recovery opened the Beta-scoped form, confirmed the request and queued a Beta-scoped reset link
in the isolated outbox. Password reset consumption is covered by database tests; no new password
was entered through the browser. No mail worker was run and real inbox delivery remains unverified.

Portal screenshots: `outputs/qa/tenant-portals/company-login.jpg`, `alpha-ticket-created.jpg`,
`company-switch-blocked.jpg`, `stale-form-blocked.jpg`, `beta-own-tickets.jpg` and
`company-recovery.jpg`. The temporary seed script and generated TypeScript configuration edits
were removed after QA. No production deployment or configuration changes were made.

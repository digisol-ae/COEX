# Customer portal — local implementation, 18 Oct 2026

## Access and workflow

- Same-site entry: `/portal`. Public landing explains support access; existing password sign-in at `/login` sends a `client_contact` to `/portal` instead of the staff dashboard. Staff stay in the staff application.
- Administrator: Customers → select customer → Contacts → **Create portal account** (requires `user.manage`). Contact must be active, have an email and belong to an active customer. A fresh client account is linked through the existing `Contact.userId` and `User.organisationId` fields. The temporary password is returned once to the administrator for secure sharing; no invitation email is sent automatically. Existing email accounts are not repurposed.
- Customer: My tickets → Raise ticket → subject/message and optional attachments. Tickets use the tenant's active default queue, normal priority and the authenticated contact/company; the browser cannot choose another customer/contact/queue. Configure a default queue in Setup → Queues first.
- Own tickets only, confirmed by John. Includes tickets linked to the contact and legacy requester-email tickets only when the same company matches and no different contact is linked. Search, status filter and 25-per-page pagination apply inside that scope.
- Ticket page shows public customer/support messages and safe attachment thumbnails/downloads. Customer can reply, attach/paste images and preview before sending. Pending/resolved tickets reopen on customer response; closed or merged tickets ask for a new ticket.
- Staff receive existing new-ticket/customer-replied notification behavior. Customer replies update unread/customerActivityAt and do not count as the staff's first response.

## Security boundaries

- Account, role, status, ticket permission, tenant, contact link/email, contact status and company status are rechecked by the portal service on every operation. No signup or email-only claim creates access.
- Own-ticket scope is applied server-side to list, direct detail, reply and attachment operations. Another contact in the same company has no access. Bad/direct foreign IDs return not-found.
- Portal projections include only public messages, excluding system events/internal notes and their attachments. Storage keys, engineering links, staff timers and CRM internals are not included.
- Staff pages/actions and Next/Express staff APIs explicitly reject client-contact sessions, independently of broad permission overrides. Portal uses a separate shell without staff navigation.
- Existing image processing and 3 MB/file, 10 MB/message limits apply; portal also caps at 10 files. Messages are validated before creating records. If an attachment fails after a message is saved, the customer sees a saved-message warning rather than being told to resend and duplicate the message.
- Account creation and replies use existing audit records. Suspending the user or archiving/unlinking the contact removes access on the next operation. Existing reset-password workflow is linked from the portal.

## Verification

- Production build passed; all workspace typechecks passed during implementation.
- Portal database suite: 10 passed in `coex_test_portal_1018`. Covers identity/default routing/inbound flow, same-company and tenant isolation, internal notes/attachments, staff public replies, resolved reopening, closed handling, invalid IDs, contact/user revocation, oversize validation, provisioning boundaries, legacy email scope, permission denial and disabled tenant module.
- Staff/portal HTTP boundary unit suite: 2 passed. Final full unit run: 31 files / 195 tests passed. Focused ESLint, formatting and diff checks passed.
- Isolated production-mode browser QA used synthetic data in `coex_test_pui_1018` at `127.0.0.1:3101`, with separate cookies/storage from regular localhost:3100. Verified password sign-in → customer list, another contact absent, create ticket + image upload, protected thumbnail/full preview, send reply, refresh/reopen persistence, direct foreign ticket 404, staff Dashboard redirect, public staff reply visible and internal note absent. No actual customer account/ticket was used. QA server and temporary launcher removed after verification; synthetic DB retained, no shared database cleared.
- Existing Users/CRM UI can provision accounts; no real account was provisioned in this run. Real mailbox delivery, real-device/theme acceptance and production deployment remain separate checks.

No database migration is needed: contact/account links already exist in the models. No push, merge, deployment or external message sent by the agent.

## CAPTCHA (Cloudflare Turnstile)

Login (shared staff/customer password form), customer Raise ticket and Send reply use a shared Turnstile widget and server verification before authentication or ticket mutations. Microsoft SSO is unchanged. Tokens must pass Siteverify, expected action and explicit hostname allowlist; verification outages fail closed when configured. Tokens refresh after each submission, including failed validation.

Activation pending: John does not yet have a Cloudflare account. No Cloudflare account/widget created and no live CAPTCHA acceptance claimed. With both keys absent the integration is inactive and existing forms continue normally; partial key configuration fails closed.

1. Create a Cloudflare account, open Turnstile and add a Managed widget for the COEX hostname. Website DNS does not need to move to Cloudflare.
2. Set these environment variables (never commit actual secrets):
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: widget public site key (required at build time).
   - `TURNSTILE_SECRET_KEY`: private secret, server only.
   - `TURNSTILE_HOSTNAMES`: comma-separated allowed hostnames, without scheme or port.
3. Rebuild and restart. Verify a real browser submission, rejection of missing/expired tokens, and retry after a form error. Use a separate widget/official testing keys for local QA; never deploy testing keys to production.

Reference: https://developers.cloudflare.com/turnstile/get-started/

Password login includes opt-in **Remember me on this PC for 60 days**. Remembered cookies and server sessions share a 60-day expiry; unchecked cookies end with the browser session (server limit remains 30 days). Signout, suspension and password reset still revoke sessions. Microsoft SSO session policy is unchanged.

## Customer account menu

Shared avatar menu provides Edit profile, Reset password, per-account/browser notification opt-in and Sign out. `/portal/profile` edits only the authenticated customer’s name/job title. Notifications use `/api/portal/notifications` with active contact identity and own-ticket filters; only public support replies generate generic alerts while COEX is open in another tab. No closed-browser push. Tutorials is disabled and labelled Coming soon; no customer publication/player enabled yet.

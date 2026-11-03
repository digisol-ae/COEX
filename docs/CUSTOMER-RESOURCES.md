# Customer resources

Status: implementation prepared for review on `codex/customer-resources`; not deployed.

## Agreed workflow

- Staff maintain a reusable library at Support → Customer resources. Add documents or HTTPS video links with a title, description, product/module and category; draft, publish or archive each item.
- Select one to twenty published resources and an existing customer/contact. Review the email subject/message and expiry before sharing. The default expiry is **72 hours**, customizable per share between one hour and 365 days.
- A dedicated email contains both the resource link and an **eight-digit, single-use OTP**. No Worktello account, password or customer sign-in is required.
- The initial unused OTP expires with the link. After successful verification, this browser retains access until the original link expiry or revocation. Another browser can request a fresh OTP by email; that replaces the unused code but does not extend access or end already verified browser sessions.
- Sharing from a ticket uses its server-resolved customer reply address, sends the dedicated link/OTP email, and adds a public reply with the resource link. The OTP is **never posted in the ticket conversation or its CC notification**. The ticket must belong to an existing customer and the sharing agent must be allowed to access/reply to it.
- Sharing history shows queued shares, recipient, expiry, OTP verification and downloads. Verification does not establish that a document was read or a video watched. Revoke access to stop future page/file requests from every browser immediately.

## Files and video

Documents: PDF, Word (DOC/DOCX), Excel (XLS/XLSX), PowerPoint (PPT/PPTX), plain text, PNG/JPEG/WebP; maximum 20 MB each. Content type is derived from extension and file signatures, never the browser-supplied MIME type. Executable/HTML/SVG formats are refused. Office files download; PDF preview uses a bundled PDF.js worker and canvas renderer with previous/next page controls and bounded canvas dimensions. No third-party document viewer receives private document URLs. Raster images/text can open directly; every file also has a download option.

Video links use the existing provider validator: YouTube/Vimeo embeds or direct HTTPS MP4/WebM. Provider permissions and source availability still apply. Original file links/videos are shown only after resource verification. HTTP links, credentials in URLs, unsupported embed providers and arbitrary frames are refused. PDFs cannot run document JavaScript through the canvas viewer.

A share snapshots selected titles, descriptions and content references. Editing metadata does not silently replace what was shared. To replace a document/video, create a new resource and archive the old one. Archiving or moving a resource back to draft removes it from existing shares; republishing makes its original snapshot accessible again while those links remain valid.

## Access model

`resource.read` and `resource.share` are available to staff roles. `resource.manage` defaults to managers and administrators. Customer accounts have none of these permissions. Direct customer-directory lookup/sharing additionally respects `customer.read`; ticket sharing checks the agent's access to that ticket instead. Every library/recipient/history query is tenant-scoped.

Resource files use the existing private file store, not public assets. A cryptographically random link token locates one share. It does not authorize documents without a separate verified browser credential. Share and browser tokens are SHA-256 hashed in the database; verification data uses a context-bound HMAC. The email outbox necessarily contains the link and OTP for delivery; neither is copied to audit logs/history. Verification claims are atomic to prevent concurrent OTP reuse. Each challenge permits five guesses; resend is limited to once per minute and ten emails total per share.

Browser access uses a per-share HttpOnly, SameSite cookie scoped to that link's path and exact original expiry. Production/HTTPS cookies are Secure. It never creates or modifies a Worktello login session. Page and download requests recheck expiry, revocation, tenant activity, selected resource membership and publication status. Sensitive responses are not cached; external links/embeds use no-referrer handling. POST routes validate the configured application origin.

## Implementation map

- Models: `packages/shared/src/resources/models.ts` (Resource, ResourceShare, ResourceAccess).
- Rules/services/HTTP/PDF preview: `apps/web/src/modules/resources/`.
- Staff library/actions: `apps/web/src/app/(app)/support/resources/`.
- Upload/recipient/private staff file endpoints: `apps/web/src/app/api/resources/`.
- Customer page, verification and protected file endpoint: `apps/web/src/app/shared/resources/`.
- Ticket entry: the ticket composer's Share resources tab beside Reply to customer and Internal note, with a preview of its recipient and public-reply behavior.
- Email uses `resource_share` in the existing outbox with the standard sender. The existing email worker delivers it; requests do not call SMTP synchronously. Duplicate share submissions use a tenant-unique request key. If queueing/ticket posting fails, the share fails closed and is revoked.

## Review and rollout boundary

No data migration, production deployment, account change, real email delivery or live customer upload has occurred. New collections and permissions are additive. Production requires the feature's web build, normal shared storage/AUTH_SECRET/public URL configuration and a working email worker. Retain a prior release for rollback. Private uploaded files must not be copied into Git, screenshots or public routes.

Local verification and limitations: [QA record](qa/CUSTOMER-RESOURCES-2026-11-03.md).
PDF renderer integration follows the [official PDF.js examples](https://mozilla.github.io/pdf.js/examples/); assets are bundled locally rather than loaded from a CDN.

Customer document viewing stays in the shared-resource page: View document expands a protected PDF, image or plain-text preview. Downloads remain a separate action; Office files use download.

All customer resource states (email-code verification, verified content, expired/revoked links) show the same Powered by DigiSol logo and copyright branding as the sign-in page. The shared branding component keeps these surfaces consistent.

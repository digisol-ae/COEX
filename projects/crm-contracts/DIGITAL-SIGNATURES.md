# Customer signing inside Worktello

Requested 3 November 2026: send contracts directly from Worktello for customer digital signature. Owner selected signing inside Worktello rather than an external signing service. This explicitly extends the previous project boundary excluding electronic signatures.

## Local implementation

Contract detail → Signatures → select an active customer contact → review saved agreement → Send for signature. Sending requires `contract.manage`, a saved reviewed draft, its current revision and a signer belonging to the same customer. Read/history/download require `contract.read`.

A private 256-bit email link opens the full agreement without a Worktello account. The customer enters their full name and explicitly confirms that they read the agreement, are authorised to sign and intend to sign electronically. The link expires after 14 days; staff can cancel it. A request contains its own immutable agreement wording, SHA-256 digest, draft revision, signer identity, consent wording and timestamps. Signing atomically records the typed name, server timestamp and user agent. Concurrent signing, replay and cancellation cannot overwrite the accepted record. This is email-link electronic acceptance; it does not use a certificate-backed digital signature or independently verify the signer's identity or authority.

The customer can download a portable HTML signed copy or use Print / Save PDF. Staff can download the signed HTML after the public link expires. Unicode wording is preserved and all customer text is escaped. Microsoft 365 document links remain supported. Signature status and commercial contract activation remain separate.

History shows invitation email queued/sending/sent/failed independently of signature status. SMTP delivery uses the existing outbox/worker; a queued invitation does not establish delivery. Only one pending request per contract is allowed. To replace a pending request after editing, cancel it and send the newly reviewed revision. Old signed snapshots remain available.

## Verification and release

- Targeted database/unit checks: 12 passed, using isolated MongoDB on loopback port 27020 and test-prefixed databases.
- Coverage includes tenant/customer isolation, reviewed/stale revisions, frozen snapshots, disabled email, explicit consent, malformed/expired/cancelled links, duplicate invitations, signing concurrency/replay, escaped Unicode export, and separate commercial status.
- All workspace type checks and an isolated optimized production build passed.
- Browser QA passed: staff invitation confirmation/queue state, customer consent/signing, signed status in both views, and signed-copy download. Screenshots are in `outputs/qa/agreement-signature/`. Browser verification used only synthetic records in `worktello_signature_qa`, local port 3126, and queued `example.test` email; no delivery worker is started for this database.
- No push or production deployment. Production release remains a separate authorised step.

## Implementation pointers

- `packages/shared/src/crm/models/agreement-signature.model.ts`
- `apps/web/src/modules/crm/services/agreement-signature.service.ts`
- `apps/web/src/modules/crm/signed-agreement.ts`
- `apps/web/src/app/(app)/contracts/[id]/signature/`
- `apps/web/src/app/sign/[token]/`
- `tests/database/agreement-signature.test.ts`

The public token lookup is an intentional narrow unauthenticated database boundary: no tenant/customer/contract IDs are accepted from a public caller. All staff operations use tenant-scoped access. Public pages and downloads disable indexing/referrers/caching and embedding. Signing evidence is committed on the request itself; staff request/cancel actions additionally write the normal contract audit log. Bearer links necessarily appear in the protected email outbox; they are hashed in signature records and excluded from staff history and signed exports.

## Tenant letterhead and dated tracking — 3 November follow-up

The owner required tenant letterhead and traceable sends at different dates/times. Configure Contract letterhead in Setup → Tenant settings: tenant name, embedded uploaded logo, address, contact details, footer and colour. New invitations require a logo and address. The customer page, staff preview, signed HTML and draft Print / Save PDF use the letterhead. Uploaded raster logos are validated, resized and embedded; exports do not depend on a remote image remaining available. Each new request freezes its own letterhead and hashes the complete letterhead plus agreement. Later branding edits do not rewrite a sent or signed copy. Earlier signed records are preserved; earlier pending links without letterhead must be cancelled and reissued.

Contracts → Signature tracking lists every request across the tenant, with independent reference, contract/customer, revision, requester, recipient, requested time, email delivery state/sent time, signing state/signed time, cancellation time and expiry. Status filters cover awaiting signature, signed, expired and cancelled. Both the global tracker and per-contract history are paginated (20 per page), preserving access beyond the earlier 50-record window. Times explicitly use the tenant timezone. Different contracts can be pending concurrently; one current pending request per individual contract remains enforced.

Validation: 16 targeted tests passed, including frozen tenant branding, letterhead-required sends, independent requests/revisions across contracts, timestamps/status filtering, pagination and tenant isolation. All workspace type checks and optimized production build passed. Synthetic browser QA verified logo upload/settings persistence, letterhead signing/download, frozen branding after settings changed, and the dated tracking ledger/status filter; evidence is recorded in `outputs/qa/agreement-signature/`. No push, production deployment or real customer communication.

## Capture and evidence extension

The owner subsequently required draw/upload/style capture, mobile/tablet optimisation, UAE and international business scope, and stronger evidence/privacy controls. See [Signing options and evidence](EVIDENCE-CONTROLS.md) for the current implementation and assurance limits. This supersedes the earlier private-link-only access and typed-only signing descriptions above. Public document viewing and download now require a short-lived mailbox-verified session.

# Signing options and evidence controls

3 November 2026. Scope: UAE and international business contracts. The owner corrected an earlier interpretation: do not describe the intended scope as only UAE or only ordinary agreements. The owner authorised proceeding with native signing and evidence controls for now, while researching credible open-source or lower-cost services. No provider subscription, deployment or real customer sending is authorised by this note.

## Customer options

- Draw in a touch-enabled box with a finger, stylus, mouse or trackpad; clear and redraw.
- Upload a PNG, JPEG or WebP signature image, with preview and a 2 MB limit.
- Type a full name and choose a script, classic or simple visual style, with preview. This is also the keyboard-accessible alternative to drawing.

The final acceptance checkbox is always explicit. The capture UI uses readable mobile inputs and controls at least 48 px high, a full-width drawing area, responsive image previews and no external signature-font requests. The drawing bitmap is preserved across changes in viewport dimensions. Raw strokes, timings and pen pressure are not retained. A signature is associated with one agreement, rather than silently stored as a reusable identity/profile.

## Implemented controls

- A private expiring 256-bit invitation is required. Before any agreement content, signature or public signed download is disclosed, the invited mailbox must be verified using a six-digit code.
- Codes expire after 10 minutes. Atomic counters limit five guesses per issued code, a 60-second resend cooldown and five code issues per 30-minute window per request. Codes are stored as keyed hashes; the protected email outbox necessarily contains the delivery message. Successful codes cannot be replayed.
- Verification creates a 30-minute, HttpOnly, SameSite=Strict browser cookie scoped to that signing link; Secure is set in production. The matching server token is hashed. A link alone does not grant document access. Cancellation/expiry still invalidates access.
- The agreement wording and embedded tenant letterhead are frozen per request and hashed together. The signed name, invitation email, document hashes, server signing time, signature method/style, signature-image digest, original email-verification timestamp, consent, browser information and privacy-notice version are bound into a keyed HMAC completion record. A later verification to download a signed copy does not rewrite the original signing-verification time.
- Drawn/uploaded images are decoded with pixel/byte limits, resized, re-encoded without metadata, checked for blank/unreadable content and stored using the existing AES-256-GCM secret-box mechanism. SVG/active-content uploads are rejected. Images are decrypted only for authorised display/export.
- Public reads verify completion evidence; staff reads/downloads require contract permissions and tenant scope. Exports preserve the chosen signature appearance and tenant letterhead. Public caching, referrers, indexing and embedding remain disabled.
- The privacy notice describes signing information, purposes, access, mailbox verification limits, and retention/data-request handling. Its signing-notice version is saved with each new request. Invitation expiry does not delete contractual evidence; the existing organisation-directed retention policy continues to apply.

## Assurance limits and release work

These are native electronic-signature controls, not a claim of DocuSign equivalence, ISO certification, SOC assurance, universal enforceability or qualified electronic-signature status. An HMAC is a server-authenticated integrity check, not an independently verifiable signer certificate, trusted timestamp or PKI-sealed PDF. An emailed code proves mailbox access, not independently verified identity/authority. It is not an independent second factor if the invitation and code reach the same mailbox. Downloaded HTML/print-to-PDF is not a certificate-signed PDF.

Before production, review actual hosting/database/backup encryption and location, privileged access and logging, protection/redaction of bearer URLs and codes, key custody/backup/rotation and re-encryption, retention and data-request procedures, mail worker delivery, accessibility and real touch/stylus behaviour. Preserve the signing encryption/HMAC key: rotating it without migrating historical images and receipts will make them unverifiable or unreadable. The current implementation uses COEX_ENCRYPTION_KEY, falling back to AUTH_SECRET. No production infrastructure assurance is established by local tests.

For contract types/countries requiring stronger identity or qualified signatures, use an appropriately accredited provider and determine the applicable signing assurance level. An embedded provider experience can keep customers within Worktello. The native implementation is not a substitute for that review.

## Provider candidates checked on 3 November 2026

| Candidate | Official findings | Relevance |
| --- | --- | --- |
| DocuSeal | Open-source self-hosting is available; integrated production API/embedding requires Pro. Published pricing starts with a $20/month Pro seat and $0.20 per completed API/embedded document; on-premises integration also has usage charges. | First candidate for a low-volume embedded pilot. Tenant/admin seats, certificates and any stronger assurance requirements need a concrete quote/review. |
| Documenso | Self-hosting, API and embedding are documented. Hosted Teams is advertised at $40/month with $480 yearly billing and embedded signing/API automation; white-label Platform is advertised at $250/month with $3,000 yearly billing. Self-hosting requires configuring a signing certificate and operating the infrastructure. | Alternative for a self-hosted evaluation; verify applicable licensing, support, certificate trust and operational obligations. |

Sources: https://www.docuseal.com/pricing ; https://www.docuseal.com/on-premises ; https://documenso.com/pricing ; https://docs.documenso.com/docs/self-hosting . These are evaluated candidates, not purchased, installed, audited or endorsed as meeting every jurisdiction's requirements.

Reference context: Docusign supports signature adoption through draw/upload/type options (https://support.docusign.com/s/document-item?_LANG=enus&bundleId=yca1573855023892&language=en_US&rsc_301=&topicId=dga1573854990297.html). Docusign publishes organisational certifications separately from product features (https://www.docusign.com/trust/compliance/certifications). UAE trust-service requirements are described at https://u.ae/en/about-the-uae/digital-uae/regulatory-framework/electronic-transactions-and-trust-services-law ; EU signature-assurance distinctions at https://ec.europa.eu/digital-building-blocks/sites/spaces/DIGITAL/pages/880312429/eSignature+FAQ .

## Local validation

24 targeted database/unit tests passed on isolated loopback MongoDB. Coverage includes tenant/customer isolation, independent requests/revisions, letterhead snapshots, OTP expiry/replay/attempt limits, session expiry, SVG/corrupt/blank-image rejection, encrypted drawn/uploaded signatures, completion verification after later mailbox verification, and rejection/flagging of tampered signer/document evidence.

Browser QA used only synthetic contracts and queued example.test emails in worktello_signature_qa. All three capture methods completed the verification → consent → signing flow. A protected styled-signature download passed. Phone and tablet layouts were checked, including preserving an existing drawing while resizing. Phone-width verification, tracking, send/history, agreement draft and letterhead settings were checked for page overflow. Real physical stylus/finger hardware, OS print-to-PDF saving and live mail delivery remain untested. Screenshots and fixtures are in outputs/qa/agreement-signature/.

All workspace type checks passed. Focused lint and the final optimized production build passed. No push, production deployment, provider installation or customer email delivery occurred.

## Native continuation — provider evaluation deferred

The owner instructed continuing native Worktello work and leaving DocuSeal evaluation for later. No additional provider work, connection or purchase was performed.

New requests use completion-evidence version 3, which also binds the contract/contact identifiers, contract number, customer and invited-signer names, draft revision, requester, request time and invitation expiry. Historical version-2 records continue using their original payload format; existing signatures are not silently rewritten. Missing drawn/uploaded images fail verification instead of falling back to a typed appearance.

Customer and staff screens offer Download signing receipt. The JSON receipt contains the versioned completion payload and server-authentication code, alongside the downloaded signed agreement. It excludes bearer/session tokens, OTP codes/hashes, encryption keys and signature image data. It uses the same mailbox/session or contract-read tenant checks as the signed copy and is not publicly cached. The receipt explicitly describes server HMAC authentication and does not claim an accredited signer certificate or trusted timestamp.

31 targeted tests passed, including receipt contents/secret exclusion, metadata tampering, missing signature images and historical-version compatibility. Workspace type checks, focused lint and the optimized production build passed. Browser QA blocked an unverified receipt request, then completed signing and downloaded matching receipts from customer and staff views. The receipt control fits a 390 px phone layout without page overflow. Details are recorded in the handoff.

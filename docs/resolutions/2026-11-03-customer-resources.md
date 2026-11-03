# Customer document and video sharing — 3 November 2026

Request: a customer tutorial library with document uploads and video links, shareable by email or ticket. Owner approved no account sign-in, a single-use OTP sent with the link, customizable expiry defaulting to 72 hours, and same-browser access until expiry after verification.

Implemented on `codex/customer-resources`: independent resource library, staff permissions, existing-customer/contact selection, ticket-bound sharing, private storage/view/download endpoints, bundled PDF preview, queued email, OTP resend/guess limits, atomic verification, expiring browser credentials, tenant/recipient checks, snapshots, archive behavior, sharing history and revocation.

Validation: 455 unit tests, 20 focused real-Mongo/email tests and isolated browser workflows passed; production build passed. See [QA evidence](../qa/CUSTOMER-RESOURCES-2026-11-03.md) and [feature guide](../CUSTOMER-RESOURCES.md).

Status: implemented locally and prepared for draft review. Not deployed; no real customer emails, uploads, data migration or account mutation. Existing staff-only tutorial remains unchanged. Production pilot and real inbox/video acceptance remain separate from local evidence.

Rollback after a future release: restore the previous web slot; preserve additive data and private files. Revoke any unintended test shares using the library. Do not remove customer files or reset ordinary auth sessions as part of application rollback.

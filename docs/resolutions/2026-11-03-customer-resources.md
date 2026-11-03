# Customer document and video sharing — 3 November 2026

Request: a customer tutorial library with document uploads and video links, shareable by email or ticket. Owner approved no account sign-in, a single-use OTP sent with the link, customizable expiry defaulting to 72 hours, and same-browser access until expiry after verification.

Implemented on `codex/customer-resources`: independent resource library, staff permissions, existing-customer/contact selection, ticket-bound sharing, private storage/view/download endpoints, bundled PDF preview, queued email, OTP resend/guess limits, atomic verification, expiring browser credentials, tenant/recipient checks, snapshots, archive behavior, sharing history and revocation.

Validation: 455 unit tests, 20 focused real-Mongo/email tests and isolated browser workflows passed; production build passed. See [QA evidence](../qa/CUSTOMER-RESOURCES-2026-11-03.md) and [feature guide](../CUSTOMER-RESOURCES.md).

Status: released to production on 4 November 2026 through PR #79, merge `6f70403`. All app vhosts target port 3008; rollback is the prior Board slot on 3007. Authenticated live library/share-form checks passed. No real customer email, upload, data migration or account mutation was part of deployment. Real inbox/video acceptance remains pilot work. See [release evidence](../../ai/RELEASE-2026-11-04-CUSTOMER-RESOURCES.md).

Rollback: restore the previous web slot; preserve additive data and private files. Revoke any unintended test shares using the library. Do not remove customer files or reset ordinary auth sessions as part of application rollback.

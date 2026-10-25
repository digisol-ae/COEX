# osTicket history and customer activation — 25 October 2026

## Scope

Import 428 source users, 4,983 non-deleted tickets and 19,787 ticket-linked conversation entries, including 2,798 internal notes. Attachment payloads remain deferred by the owner; file metadata and raw source export are retained privately. The initial full SQL download was truncated; only the verified 71-table gzip is a valid migration source.

## Change

Imported customer accounts verify a six-digit emailed OTP, then choose a password. Challenges expire after ten minutes, permit five attempts, are HMAC hashed, and issue at most once per ten minutes per account. Verification and activation are single use. Existing staff credentials, status and roles are preserved. New accounts remain invited until activation; no bulk invitation is sent.

Contacts may remain customer-unassigned. Only imported accounts with an active linked contact can use the unassigned portal; their scope requires a null customer plus their contact or verified requester email. Internal notes remain staff-only. New ticket creation waits for customer assignment; existing own-ticket replies remain possible.

The historical importer validates current schemas before writes, uses deterministic source IDs, preserves source references, separates Resolved and Closed, maps known staff and priority, and adds source-ID suffixes for duplicate ticket numbers. Repeated imports use insert-only upserts, preserving subsequent destination edits. Historical writes bypass notifications and SLA calculation. Legacy HTML is converted to readable text before import, and omitted attachments are labelled. Original staging data remains private.

## Validation

55 unit files / 384 tests passed. Workspace typecheck, lint and production build passed. Disposable Docker integration verified OTP request/resend limits, invalid/expired codes, attempt exhaustion, concurrent verification, code/token replay, password policy and activation. Unassigned own-ticket list/detail passed; other-contact access and internal-note leakage were rejected. Existing-ticket replies are covered by the portal database suite; full migration UI acceptance is distinct.

The production-shaped rehearsal imported all records and repeated with zero new users/contacts and unchanged ticket/message counts. Source 428 users map to 420 new customer accounts and eight preserved staff accounts. Current exact-email candidates link 31 source users; 397 remain unassigned. One repeated source ticket-number group requires two suffixed display numbers. Original source dates match the observed UTC-to-Dubai UI offset.

## Operations and limits

Private artifacts are under exports/osticket_db and must never be committed. Importer requires the exact approved production tenant for --production and otherwise permits writes only to coex_test_ost_* databases. Back up current database before production import, retain identity mapping and import report, and preserve prior release for rollback. Restore is an operator action, never automatic over live concurrent work. Final live revision/counts and SMTP acceptance are recorded separately after cutover.

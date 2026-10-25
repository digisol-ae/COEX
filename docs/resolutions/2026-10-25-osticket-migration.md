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

## Production result

Application PR #49 merged as d82a5bff0181baf44bed02a442b3ab0cf0f801c7; compiled application tree is 6404f99. Active candidate is coex-app-osticket, PM2 id15, port3003, /srv/coex/releases/osticket-20261025. Both canonical Apache proxies now target3003. Blue3001 and green3002 remain warm rollback releases; three workers were not restarted. Explicit patched Node22.23.4 interpreter is used. Do not infer active application revision from the older /srv/coex/app checkout.

Production reconciliation: 4,983 tickets (16 open, 4,069 resolved, 898 closed), 19,787 ticket messages, 2,798 internal notes, 420 new invited customer accounts, eight preserved staff identities and 428 source contact mappings. Final contact/account relationship mismatches: zero. 397 source contacts remain customer-unassigned; no name/domain-only identity merge was performed. 424 contacts were newly created; four existing contacts were reused. One ambiguous existing CRM contact was preserved and a separate unassigned migration contact created; 27 imported requester links and 27 author links were corrected. Source Web channels are preserved as portal rather than staff-created tickets. Two conflicting ticket numbers retain original references and source-ID suffixes.

Validation: PR and merged-main CI passed, 55 unit files /384 tests, workspace types/lint and production builds passed. Isolated integration tested OTP request/resend/expiry/attempt limits, verification concurrency, code/token replay, password policy, activation, unassigned own-ticket privacy, public replies, other-contact denial and internal-note exclusion. Live activation page and authenticated migrated-ticket list/detail were read in separate browser tabs; original dashboard tab preserved. Twenty switch health samples returned200. Actual SMTP Admin connection/authentication verified without sending a message. A real customer inbox delivery/password activation was not exercised; do not claim that acceptance. No bulk activation mail was queued by migration.

Private backup: /srv/coex/shared/backups/osticket-migration-20261025/before-import.archive.gz (gzip integrity and mongorestore dry-run passed); local copy retained in exports/osticket_db. Source staging, import mappings, reconciliation and Apache rollback snapshots are private under that server run directory. Attachments remain explicitly deferred and their payload backup is incomplete. The migration reflects the verified export snapshot; continuous sync and old helpdesk/mail-routing cutover are not configured.

Rollback app: verify3001 login200, restore apache-http-before.conf and apache-https-before.conf from the private run directory, apachectl configtest and graceful reload. Preserve database while assessing rollback; never automatically restore over concurrent user work. New accounts remain invited until the user initiates OTP and chooses a password.

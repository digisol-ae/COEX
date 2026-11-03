# Ticket search across customer details and conversations — 25 October 2026

## Problem and change

Ticket search previously matched number and subject only, and the default Opened scope hid old resolved/closed records. Staff can now search number, subject, requester name/email/phone, linked customer/contact names and email/phone/mobile, CC emails, tags, conversation bodies (initial description, replies and authorized internal notes), and stored attachment filenames. File contents are not searched.

All words must match somewhere on the ticket; quoted text remains one phrase. Matching is case insensitive and regex metacharacters are literal. Phone matching ignores common separators, handles local leading zero and international 00 prefixes, and permits partial numbers of four or more digits. Inputs are bounded to120 characters. Search submission includes closed/resolved history while retaining selected queue/status/priority/agent filters. All statuses and Clear search controls make the scope explicit.

Related lookups are tenant scoped. Search selectors and global quick-search apply staff assignment scope before the result limit; customer accounts cannot use those staff selectors. Portal search matches only number, subject, public conversation text and public attachment names, inside its existing own-ticket scope. Private notes, staff tags and CC fields cannot produce portal matches. Soft-deleted tickets and deleted related customer/contact records remain excluded. Searches do not mutate business records or send messages.

## Verification

Six parser/phone/escaping regressions plus the existing suite: 56 unit files /390 tests passed. Isolated Docker integration covers every listed field, closed history, mixed keywords and phrases, literal punctuation, formatted/local/international/partial phone numbers, active filters, foreign tenant exclusion, soft deletion, agent assignment and customer/internal-note/privacy boundaries. Workspace types, lint, production build and live verification are recorded in release evidence after deployment. A description is the initial conversation message; no separate description column is invented.

## Live release evidence

## Expanded ticket search live — 25 October 2026

PR #51 merged as 584458b3f70da069151df3a3544e4740fa355eb7; compiled application tree b679117. Active blue coex-app id16/PID352576 on3001, /srv/coex/releases/ticket-search-20261025. Both canonical Apache proxies target3001; PM2 saved. Patched Node22.23.4 verified for the launcher and actual Node descendants. Previous osTicket release id15/PID344722 remains available on3003 as rollback; green3002 and workers10/11/12 unchanged (same PIDs, zero restarts).

PR/main CI passed, 390 unit tests, workspace types/lint and local/server builds passed. Disposable Docker integration verified field coverage, phone formats, phrases, filters and tenant/assignment/portal privacy. Read-only production queries matched expected migrated tickets by number, contact name/email, phone and conversation keyword. Authenticated separate browser tab verified customer/contact matches with resolved/closed results, exact phrase submission, and Clear search returning an empty input/Open scope. Original user tab preserved. Twenty HTTPS switch samples returned200. No business record or email mutation used for acceptance.

Rollback: verify http://127.0.0.1:3003/login returns200, restore http-before.conf and https-before.conf from /srv/coex/shared/backups/ticket-search-20261025 into the canonical Apache vhosts, configtest and graceful reload. Preserve database and workers. Private PM2/environment snapshot is in the same directory; never publish it. Source snapshot/attachment limitations of the earlier migration remain unchanged. Phone acceptance used read-only service queries; mobile-device visual QA was not exercised.

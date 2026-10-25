# Ticket search across customer details and conversations — 25 October 2026

## Problem and change

Ticket search previously matched number and subject only, and the default Opened scope hid old resolved/closed records. Staff can now search number, subject, requester name/email/phone, linked customer/contact names and email/phone/mobile, CC emails, tags, conversation bodies (initial description, replies and authorized internal notes), and stored attachment filenames. File contents are not searched.

All words must match somewhere on the ticket; quoted text remains one phrase. Matching is case insensitive and regex metacharacters are literal. Phone matching ignores common separators, handles local leading zero and international 00 prefixes, and permits partial numbers of four or more digits. Inputs are bounded to120 characters. Search submission includes closed/resolved history while retaining selected queue/status/priority/agent filters. All statuses and Clear search controls make the scope explicit.

Related lookups are tenant scoped. Search selectors and global quick-search apply staff assignment scope before the result limit; customer accounts cannot use those staff selectors. Portal search matches only number, subject, public conversation text and public attachment names, inside its existing own-ticket scope. Private notes, staff tags and CC fields cannot produce portal matches. Soft-deleted tickets and deleted related customer/contact records remain excluded. Searches do not mutate business records or send messages.

## Verification

Six parser/phone/escaping regressions plus the existing suite: 56 unit files /390 tests passed. Isolated Docker integration covers every listed field, closed history, mixed keywords and phrases, literal punctuation, formatted/local/international/partial phone numbers, active filters, foreign tenant exclusion, soft deletion, agent assignment and customer/internal-note/privacy boundaries. Workspace types, lint, production build and live verification are recorded in release evidence after deployment. A description is the initial conversation message; no separate description column is invented.

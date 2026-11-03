# Add customer contacts from ticket people — 26 October 2026

**Status:** Implemented locally, not committed, pushed or deployed.

## Request
On a Customer, search everyone who appears on tickets (requesters and CC'd people, including osTicket history) and add them as that Customer's contacts.

## How it works (user)
1. Customers → open a customer → Contacts drawer → **Find from tickets**.
2. Empty search shows **suggestions**: people whose email domain matches the customer's email or existing contacts (free domains like gmail/outlook ignored).
3. Type 2+ characters to search name, email or phone (4+ digits). Each row shows tickets count, last ticket date, "(copied)" for CC-only people.
4. Badges: **Already a contact** (greyed, can't tick), **At <Customer>** (belongs elsewhere), **Same domain**.
5. Tick one or many (Select all) → **Add N as contacts**.
6. If anyone belongs to another customer, a confirmation lists them: **Move and add** or **Untick them**.

## Rules
- Needs `customer.manage` **and** `ticket.read.all`; button hidden otherwise. Client portal users blocked.
- Same person is merged by contact id, email or phone. Staff users and own mailbox addresses are excluded.
- Unknown person → new Contact (email lowercased, mobile kept in E.164).
- Linked person's **customer-less tickets** are filed under this customer and their contactId filled.
- Tickets already filed under another customer **stay there** (history/reports unchanged). Moved contacts lose old branch and primary flag.
- Search text is regex-escaped; all queries tenant-scoped through `repository().scope()`; merged tickets ignored.
- Audit: `contact.linked`, `contact.moved`, `contact.created`, `customer.contacts.linked_from_tickets`.

## Files
| File | Purpose |
| --- | --- |
| `packages/shared/src/crm/ticket-people.ts` | Pure merge/rank/domain/selection-validation logic |
| `apps/web/src/modules/crm/services/ticket-people.service.ts` | Search aggregation + link/backfill |
| `apps/web/src/app/api/crm/ticket-people/route.ts` | `GET ?organisationId=&q=` |
| `apps/web/src/app/(app)/customers/actions.ts` | `linkTicketPeopleAction` |
| `apps/web/src/app/(app)/customers/[id]/ticket-people-picker.tsx` | Search/select UI |
| `contacts-panel.tsx`, `page.tsx` | "Find from tickets" button + permission flag |
| `tests/unit/ticket-people.test.ts`, `tests/database/ticket-people.test.ts` | Tests |

## Verification
- Clean clone of main + these files: typecheck, full lint, prettier, **63 unit files / 424 tests passed**, production `next build` passed.
- `tests/database/ticket-people.test.ts` written but **not run** (no MongoDB reachable from the build sandbox). Run: `npx vitest run tests/database/ticket-people.test.ts`.
- No browser/UI acceptance yet; no production data touched.

## Rollback
Remove the files above and revert the three edited customer files. No schema or data migration.

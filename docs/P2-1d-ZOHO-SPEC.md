# P2.1d Zoho Books link specification (draft for John)

Status: draft, 4 Oct 2026. John asked (4 Oct 2026) for both: create a recurring invoice in Zoho
Books from a contract, and link a contract to a recurring invoice that already exists. Billing stays
entirely in Zoho; COEX never issues or edits an invoice itself, it asks Zoho to.

Nothing here is built. It needs a Zoho API connection that only John can create, and the
details below must be checked against Zoho's current API documentation before code is written,
because the API cannot be tried from the build environment.

## What John provides

1. **Data centre** of the Zoho account (for example .com, .eu, .in, .sa or .ae), visible in the
   Zoho Books web address.
2. **A Zoho API client** (api-console.zoho.com, "Self Client") with the Books scopes for contacts
   and invoices, giving a client id, a client secret and a one-time grant code.
3. **The Zoho Books organisation id** (Settings, Organisation profile).
4. A decision on the questions at the end.

COEX turns the grant code into a long-lived refresh token and stores all three secrets sealed with
`COEX_ENCRYPTION_KEY`, exactly like the email passwords. They are entered in Setup, Zoho Books, are
never shown again, never logged and never put in the audit record.

## Records

- **Tenant Zoho settings** (Setup): data centre, organisation id, sealed client id, client secret
  and refresh token, a Test connection button, last error.
- **Customer**: `zohoCustomerId`, the Zoho contact this customer is billed as. Set by searching
  Zoho by name from the customer page and picking the match, or by creating the contact in Zoho
  from COEX. Required before an invoice can be created.
- **Contract**: `zohoRecurringInvoiceId` (the existing free text `zohoReference` is kept for notes
  and for contracts billed another way). Read only fields refreshed from Zoho: status of the
  recurring profile, next invoice date and the invoices it has produced.

## Actions on a contract

1. **Create recurring invoice in Zoho.** Builds the profile from the contract: customer, start
   and end date, the billing rhythm (monthly: every 1 month, bimonthly: every 2 months, quarterly:
   every 3 months, yearly: every 1 year), currency, and one line item per covered product, or a
   single line named after the contract, at the contract's amount. Stores the returned id. Refuses
   when the customer has no Zoho contact, the contract is not active, or one is already linked.
2. **Link existing.** Search the customer's recurring invoices in Zoho and pick one, or paste its
   id; COEX checks it exists and belongs to the same Zoho customer, then stores it.
3. **Unlink.** Clears the id in COEX only; Zoho is never changed by unlinking.

## What COEX reads back

On the contract page, refreshed when opened and hourly by the worker: the recurring profile's
status, the invoices it generated with number, date, total, and paid or unpaid. A generated invoice
inside a billing period ticks that period as invoiced automatically (replacing the manual tick, which
stays for contracts not linked to Zoho). Unpaid invoices past due show on the contract and the
customer page. Read only; payments are never recorded from COEX.

## Rules and risks

- Money: COEX holds integer minor units; Zoho takes decimal amounts. Converted once, in one place,
  and the currency must already be enabled in the Zoho organisation (AED, USD, PKR).
- Idempotent: creating twice must not make two profiles. The id is stored in the same step as the
  call, and the action refuses once an id exists. A failure between Zoho creating the profile and
  COEX storing the id is reported with the Zoho profile name so it can be linked, never retried
  silently.
- Zoho rate limits and outages are shown as a plain message and never block the contract page.
- A tenant that has not set up Zoho sees none of this; Contracts works exactly as today.
- Every call and result is audited (action, contract, Zoho id; no secrets, no full payloads).
- Verified only against a Zoho sandbox or test organisation before it touches the real books.

## Milestones

1. **P2.1d-1** Setup, Zoho Books: connection, Test connection, sealed secrets.
2. **P2.1d-2** Customer to Zoho contact mapping.
3. **P2.1d-3** Create and link recurring invoices from a contract.
4. **P2.1d-4** Read back status and invoices; automatic invoiced ticks; unpaid warnings.

## Questions for John

1. Which Zoho data centre, and is there a Zoho test organisation to try this on first?
2. Should an invoice Zoho generates be a draft that finance reviews, or be emailed to the customer
   automatically? (Zoho offers both on a recurring profile.)
3. Covered products as separate invoice lines, or one line named after the contract?
4. Are customers already in Zoho Books under the same names as in COEX, so matching by name is
   safe, or should every link be confirmed by hand?
5. Who creates the Zoho API client: John, or should finance?

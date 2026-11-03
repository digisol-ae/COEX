# API contract outline — not yet an executable API

**Draft only.** Paths, authentication, payload schemas and status codes are not final. Do not implement clients against guessed endpoints. Publish a versioned OpenAPI contract after dOne discovery.

## Operations to specify

| Operation                   | Required behaviour                                                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Establish customer identity | Authenticate trusted dOne backend; map immutable company/user IDs to COEX tenant/organisation/contact; reject inactive or mismatched identities |
| List tickets                | Only own tickets, search/status filters, bounded pagination and stable ordering                                                                 |
| Create ticket               | Subject/body and authorised attachments; server chooses contact/customer/default queue; idempotency prevents duplicates on retry                |
| Read ticket                 | Safe public fields/conversation only; no internal messages, storage keys, engineering details or staff time                                     |
| Reply                       | Public inbound customer message; reject closed/merged tickets; same COEX reopen rules                                                           |
| Upload/download             | Size/type/count limits; authenticated own-ticket/public-message scope; safe preview URLs                                                        |
| Receive updates             | Define polling or authenticated webhook/event flow; deduplication, retry and replay protection                                                  |

## Contract checklist

- Token issuer/audience/expiry, signing/credential rotation, revocation and clock skew; no permanent browser secrets.
- Tenant and customer mapping source; no email-only access or client-controlled cross-company identity.
- Required/optional fields, formats, timezone and enum meanings; request/response examples with synthetic data.
- Standard error envelope and actionable user messages; auth/access/not-found handling without leaking ticket existence.
- Pagination shape/order, message ordering, upload lifecycle and attachment partial-failure behaviour.
- Idempotency scope/expiry and duplicate response; webhook signature/timestamp/event IDs and acknowledgement rules.
- Rate limits, audit actor attribution, request tracing, safe logs and version compatibility.
- Bilal receives mocks matching agreed examples; Uzair validates actual responses against the contract.

Existing COEX portal limits are reference points: up to 10 files, 3 MB each, 10 MB combined. Reconfirm before external API finalisation.
